"use client";

import Link from "next/link";
import { useMemo, useState, useRef, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  PauseCircle,
  Radar,
  RefreshCcw,
  Tags,
  Store,
  Coins,
  Box,
  Link2Off,
  ChevronRight,
  ChevronDown,
  Activity,
  CloudDownload,
  Plane,
} from "lucide-react";
import { useJournal } from "@/store/useJournal";
import {
  buildImportRecord,
  createParsedLogsFromNewReceipt,
  NormalizedLog,
  SyncCursor,
  AutoPilotImportRecord,
} from "@/lib/torn-api";
import { TransactionSourceType } from "@/lib/parser";
import { TronWrapper } from "@/lib/torn-wrapper";
import { needsItemSync } from "@/lib/cursor";
import { T3BAPI, TornAPI } from "@/lib/game/api";
import { TornTrade, Weav3rReceipt } from "@/lib/game/trade";
import { mydebug } from "@/lib/debug";
import { DBInterface } from "@/lib/interfaces/db";

const MAX_RECENT_IMPORTS = 500;

function mergeRecentImports(
  current: AutoPilotImportRecord[],
  incoming: AutoPilotImportRecord[],
) {
  const merged = [...incoming, ...current];
  const seen = new Set<string>();
  return merged
    .filter((record) => {
      const key = `${record.id}:${record.status}:${record.note || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_RECENT_IMPORTS);
}

function getImportSourceType(
  log: NormalizedLog,
): TransactionSourceType | undefined {
  const { typeId, title, category } = log;
  const haystack = `${title} ${category}`.toLowerCase();

  if ([1112, 1113].includes(typeId) || haystack.includes("item market"))
    return "item-market";
  if ([1225, 1226].includes(typeId) || haystack.includes("bazaar"))
    return "bazaar";
  if ([5010, 5011].includes(typeId) || haystack.includes("points"))
    return "points-market";
  if (typeId === 7000 || haystack.includes("museum")) return "museum";
  if (typeId === 4201 || haystack.includes("travel") || haystack.includes("abroad"))
    return "travel"; // Abroad buys are treated as item-market for ledger
  if (haystack.includes("trade")) return "trade";

  return undefined;
}

function formatCursor(cursor: SyncCursor | null) {
  if (!cursor)
    return {
      timeAgo: "Not initialized",
      timestamp: "",
      isStale: false,
      timeAgoStyle: "text-foreground/70",
    };

  const cursorTime = new Date(cursor.lastTimestamp * 1000);
  const timestamp = cursorTime.toLocaleString();
  const now = new Date();
  const diffMs = now.getTime() - cursorTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffSeconds = Math.floor(diffMs / 1000);

  let timeAgo: string;
  if (diffMinutes < 1) {
    timeAgo = `${diffSeconds}s ago`;
  } else if (diffMinutes < 60) {
    timeAgo = `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    timeAgo = `${diffHours}h ago`;
  } else {
    const diffDays = Math.floor(diffHours / 24);
    timeAgo = `${diffDays}d ago`;
  }

  const isStale = diffMinutes > 30;
  const timeAgoStyle = isStale
    ? "text-orange-500 font-bold"
    : "text-foreground/70";

  return { timeAgo, timestamp, isStale, timeAgoStyle };
}

export default function AutoPilotPage() {
  const {
    isLoaded,
    addLogs,
    transactions,
    weav3rApiKey,
    weav3rUserId,
    tornApiKeyFull,
    autoPilotCursor,
    autoPilotTradeCursor,
    autoPilotItemCursor,
    autoPilotLastSyncAt,
    saveAutoPilotState,
    syncState,
    driveApiKey,
    refreshDriveCache,
  } = useJournal();

  const [trades, setTrades] = useState<TornTrade[]>([]);
  const [receipts, setReceipts] = useState<Weav3rReceipt[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setTrades(DBInterface.migrationGetTrades());
    setReceipts(DBInterface.migrationGetReceipts());
    setIsDataLoaded(true);
  }, []);

  const [isDriveLoaded, setIsDriveLoaded] = useState(false);
  const [showRepositionMenu, setShowRepositionMenu] = useState(false);

  const THIRTY_MINUTES_MS = 30 * 60 * 1000;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storagePref = localStorage.getItem("bml_storage_pref");

    if (storagePref === "drive" && driveApiKey && !isDriveLoaded) {
      const needsReposition =
        !autoPilotTradeCursor ||
        !autoPilotItemCursor ||
        !autoPilotLastSyncAt ||
        Date.now() - autoPilotLastSyncAt > THIRTY_MINUTES_MS;

      if (needsReposition) {
        refreshDriveCache()
          .then(() => setIsDriveLoaded(true))
          .catch(console.error);
      } else {
        setIsDriveLoaded(true);
      }
    }
  }, [
    driveApiKey,
    refreshDriveCache,
    isDriveLoaded,
    autoPilotTradeCursor,
    autoPilotItemCursor,
    autoPilotLastSyncAt,
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, _setStatusMessage] = useState("");
  const [pageError, setPageError] = useState("");
  const isAutoSyncRef = useRef(false);

  const setStatusMessage = (message: string) => {
    _setStatusMessage(statusMessage + "\n" + message);
  };
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showRepositionMenu) {
        setShowRepositionMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showRepositionMenu]);

  const importedTradeIds = useMemo(() => {
    return new Set(
      transactions
        .map((transaction) => transaction.tornLogId)
        .filter((value): value is string => Boolean(value)),
    );
  }, [transactions]);

  const unlinkedTrades = useMemo(() => {
    return trades.filter((trade) => !trade.isLinked() && !trade.manuallyLiked);
  }, [trades]);

  const unlinkedReceipts = useMemo(() => {
    return receipts.filter(
      (receipt) => !receipt.linkedTradeId && !receipt.trashed,
    );
  }, [receipts]);

  const reviewCounts = useMemo(
    () => ({
      pendingTrades: 0,
      unlinkedTrades: unlinkedTrades.length,
      unlinkedReceipts: unlinkedReceipts.length,
    }),
    [unlinkedTrades.length, unlinkedReceipts.length],
  );

  const activityRecords = useMemo((): AutoPilotImportRecord[] => {
    const records: AutoPilotImportRecord[] = [];

    for (const trade of trades) {
      if (trade.isLinked()) {
        records.push(
          buildImportRecord({
            id: `trade:${trade.id}`,
            timestamp: trade.timestamp,
            title: `Trade ${trade.id}`,
            status: "imported",
            sourceType: "trade",
            tornLogId: trade.tornLogId,
            weav3rReceiptId: trade.linkedReceiptId,
          }),
        );
      } else if (trade.manuallyLiked) {
        records.push(
          buildImportRecord({
            id: `trade:${trade.id}`,
            timestamp: trade.timestamp,
            title: `Trade ${trade.id}`,
            status: "imported",
            sourceType: "trade",
            tornLogId: trade.tornLogId,
            note: "Manually linked",
          }),
        );
      } else {
        records.push(
          buildImportRecord({
            id: `trade:${trade.id}`,
            timestamp: trade.timestamp,
            title: `Trade ${trade.id}`,
            status: "manual_required",
            sourceType: "trade",
            tornLogId: trade.tornLogId,
            note: (trade as any).hasUnsupportedItems
              ? "Contains unsupported items"
              : undefined,
          }),
        );
      }
    }

    return records
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_RECENT_IMPORTS);
  }, [trades]);

  const autoPilotStats = useMemo(() => {
    const tradeImported = trades.filter(
      (t) => t.isLinked() || t.manuallyLiked,
    ).length;
    const tradeUnlinked = unlinkedTrades.length;

    return [
      {
        id: "trade-unlinked",
        label: "Unlinked Trades",
        count: unlinkedTrades.length,
        icon: Link2Off,
        type: "trade" as const,
        color: "orange",
      },
      {
        id: "trade-success",
        label: "Successful Trades",
        count: trades.filter((t) => t.isLinked() || t.manuallyLiked).length,
        icon: CheckCircle2,
        type: "trade" as const,
        color: "green",
      },
      {
        id: "item-market",
        label: "Item Market Logs",
        count: transactions.filter((tx: any) => tx.sourceType === "item-market")
          .length,
        icon: Tags,
        type: "item-market" as const,
        color: "violet",
      },
      {
        id: "bazaar",
        label: "Bazaar Logs",
        count: transactions.filter((tx: any) => tx.sourceType === "bazaar").length,
        icon: Store,
        type: "bazaar" as const,
        color: "blue",
      },
      {
        id: "points-market",
        label: "Points Market Logs",
        count: transactions.filter((tx: any) => tx.sourceType === "points-market")
          .length,
        icon: Coins,
        type: "points-market" as const,
        color: "amber",
      },
      {
        id: "museum",
        label: "Museum Logs",
        count: transactions.filter((tx: any) => tx.sourceType === "museum").length,
        icon: Box,
        type: "museum" as const,
        color: "rose",
      },
      {
        id: "travel",
        label: "Travel Logs",
        count: transactions.filter((tx: any) => tx.sourceType === "travel").length,
        icon: Plane,
        type: "travel" as const,
        color: "green",
      },
    ];
  }, [unlinkedTrades, trades, transactions]);

  const hasUnlinkedTrades = useMemo(() => {
    return unlinkedTrades.length > 0;
  }, [unlinkedTrades]);

  // Check if items need syncing (item cursor behind trade cursor)
  const itemsNeedSync = useMemo(() => {
    if (!autoPilotTradeCursor || !autoPilotItemCursor) return false;
    return needsItemSync({
      tradeCursor: autoPilotTradeCursor,
      itemCursor: autoPilotItemCursor,
    });
  }, [autoPilotTradeCursor, autoPilotItemCursor]);

  // Check if we need "Continue Sync" - trade cursor > item cursor (needs item fetch)
  const needsContinueSync = useMemo(() => {
    if (!autoPilotTradeCursor || !autoPilotItemCursor) return false;
    return (
      autoPilotTradeCursor.lastTimestamp > autoPilotItemCursor.lastTimestamp
    );
  }, [autoPilotTradeCursor, autoPilotItemCursor]);

  // Check if Google Drive is currently fetching data
  const isFetchingFromDrive = useMemo(() => {
    return (
      syncState.isSyncing &&
      syncState.message.toLowerCase().includes("google drive")
    );
  }, [syncState.isSyncing, syncState.message]);

  // Determine if sync should be disabled
  const isSyncDisabled = useMemo(() => {
    if (isFetchingFromDrive) return true;
    if (typeof window !== "undefined") {
      const storagePref = localStorage.getItem("bml_storage_pref");
      if (storagePref === "drive" && !isDriveLoaded) return true;
    }
    if (hasUnlinkedTrades) return true;

    for (const trade of trades) {
      if (!trade.isLinked() && !trade.manuallyLiked) return true;
    }
    return false;
  }, [isFetchingFromDrive, hasUnlinkedTrades, isDriveLoaded, trades]);

  const getSyncStatusMessage = useMemo(() => {
    if (typeof window !== "undefined") {
      const storagePref = localStorage.getItem("bml_storage_pref");
      if (storagePref === "drive" && !isDriveLoaded) {
        return "Loading latest cursor position from Google Drive...";
      }
    }
    if (isFetchingFromDrive) {
      return (
        syncState.message ||
        "Fetching latest cursor position from Google Drive..."
      );
    }
    if (hasUnlinkedTrades) {
      return "Review unlinked trades before syncing";
    }
    if (itemsNeedSync) {
      return "Items need syncing - will fetch up to trade cursor";
    }
    return "Ready to sync";
  }, [
    isFetchingFromDrive,
    syncState.message,
    hasUnlinkedTrades,
    itemsNeedSync,
  ]);

  const initializeCursorNow = async () => {
    const now = Math.floor(Date.now() / 1000);
    const newCursor = { lastTimestamp: now, lastLogId: "" };
    // Initialize both cursors to the same timestamp
    await saveAutoPilotState({
      autoPilotCursor: newCursor,
      autoPilotTradeCursor: newCursor,
      autoPilotItemCursor: newCursor,
    });
    setStatusMessage(
      `Auto-Pilot initialized at ${new Date(now * 1000).toLocaleString()}. Future syncs will start from this cursor.`,
    );
    setPageError("");
    return newCursor;
  };

  const syncNow = async () => {
    // 1. Handle Errors.
    if (!tornApiKeyFull) {
      setPageError(
        "Save a Torn full-access key in Service Access before syncing.",
      );
      return;
    }
    if (!weav3rApiKey || !weav3rUserId) {
      setPageError(
        "Save your Weav3r/Torn API key first so receipts can be fetched.",
      );
      return;
    }

    if (hasUnlinkedTrades) {
      setPageError(
        "Review unlinked trades in the cache before running another sync.",
      );
      return;
    }

    setPageError("");
    setIsRunning(true);
    let syncType: "trade" | "item" | null = null;

    try {
      let tradeCursor = autoPilotTradeCursor;
      let itemCursor = autoPilotItemCursor;

      if (!tradeCursor || !itemCursor) {
        if (autoPilotCursor && autoPilotCursor.lastTimestamp) {
          tradeCursor = { ...autoPilotCursor };
          itemCursor = { ...autoPilotCursor };
          await saveAutoPilotState({
            autoPilotTradeCursor: tradeCursor,
            autoPilotItemCursor: itemCursor,
          });
          setStatusMessage(`Migrated from legacy cursor. Starting sync...`);
        } else {
          const now = Math.floor(Date.now() / 1000);
          const newCursor = { lastTimestamp: now, lastLogId: "" };
          tradeCursor = newCursor;
          itemCursor = newCursor;
          await saveAutoPilotState({
            autoPilotCursor: newCursor,
            autoPilotTradeCursor: newCursor,
            autoPilotItemCursor: newCursor,
          });
          setStatusMessage(`Auto-Pilot initialized. Starting sync...`);
        }
      }

      const wrapper = new TronWrapper(tornApiKeyFull);
      const allNewParsedLogs: any[] = [];
      const batchRecords: AutoPilotImportRecord[] = [];
      let nextTradeCursor = tradeCursor;
      let nextItemCursor = itemCursor;

      // Handle items fetch - if Trade Cursor > Item Cursor, fetch items first
      if (tradeCursor.lastTimestamp > itemCursor.lastTimestamp) {
        syncType = "item";
        setStatusMessage(
          `Fetching item logs up to trade cursor (${new Date(tradeCursor.lastTimestamp * 1000).toLocaleString()})...`,
        );

        // Fetch items up to the trade cursor timestamp
        const itemResult = await wrapper.getNewLogs(
          {
            lastTimestamp: itemCursor.lastTimestamp,
            lastLogId: itemCursor.lastLogId,
          },
          tradeCursor.lastTimestamp,
        );

        const {
          logs: itemLogs,
          parsedLogs: itemParsedLogs,
          nextCursor: newItemCursor,
        } = itemResult;

        // Add items to the import
        for (const log of itemLogs) {
          batchRecords.push(
            buildImportRecord({
              id: `log:${log.id}`,
              timestamp: log.timestamp,
              title: log.title || log.category || "Torn log",
              status: "imported",
              sourceType: getImportSourceType(log),
              tornLogId: String(log.id),
            }),
          );
        }
        allNewParsedLogs.push(...itemParsedLogs);
        console.log(newItemCursor);
        nextItemCursor = newItemCursor;

        // Import item logs (bazaar, item-market, points, museum)
        if (itemParsedLogs.length) {
          setStatusMessage(
            `Importing ${itemParsedLogs.length} item logs into your ledger...`,
          );
          await addLogs(itemParsedLogs, { skipNegativeStock: false });
        }

        // Update trade cursor to match item cursor position so both are synchronized
        nextTradeCursor = { ...nextItemCursor };

        // Save the updated item cursor
        await saveAutoPilotState({
          autoPilotCursor: nextItemCursor,
          autoPilotTradeCursor: nextTradeCursor,
          autoPilotItemCursor: nextItemCursor,
          autoPilotLastSyncAt: Date.now(),
        });

        setStatusMessage("Item sync completed.");
      }

      // 2.3 Handle trade fetch.
      else {
        syncType = "trade";

        // Fetch trades with error handling for Torn API error 17
        const tradeStart = tradeCursor.lastTimestamp;
        const now = Math.floor(Date.now() / 1000);
        const toTimestamp = now - 1;

        // New implementation.
        // Fetch trades from trade cursor position
        setStatusMessage(`${statusMessage}\nFetching completed trades...`);
        const newtornTrades: TornTrade[] = await TornAPI.getTornTrades(
          tradeStart,
          toTimestamp,
        );
        mydebug(newtornTrades, "AutoPilot: Fetched trades");
        setStatusMessage(`${statusMessage}\nFetching receipts...`);
        const neweav3rReceipts: Weav3rReceipt[] = await T3BAPI.getReceipts(
          tradeStart - 10 * 60 * 60,
          toTimestamp,
        );
        mydebug(neweav3rReceipts, "AutoPilot: Fetched receipts");

        const newAllNewParsedLogs: any[] = [];

        // Link trades and receipts, collect parsed logs from linked pairs
        setStatusMessage(`${statusMessage}\nLinking trades...`);
        for (const trade of newtornTrades) {
          for (const receipt of neweav3rReceipts) {
            if (trade.compareAndLinkReceipt(receipt)) {
              mydebug([trade, receipt], "AutoPilot: linked trade");
              mydebug(trade, "AutoPilot: linked trade");

              const parsedLogs = createParsedLogsFromNewReceipt(trade, receipt);
              newAllNewParsedLogs.push(...parsedLogs);
              break;
            }
          }
        }

        DBInterface.migrationAddTrades(newtornTrades);
        DBInterface.migrationAddReceipts(neweav3rReceipts);

        const newUnlinkedTrades = newtornTrades.filter(
          (trade) => !trade.isLinked(),
        );
        const newUnlinkedReceipts = neweav3rReceipts.filter(
          (receipt) => !receipt.linkedTradeId,
        );

        setStatusMessage(
          `Found ${newUnlinkedTrades.length} unlinked trades ` +
          `and ${newUnlinkedReceipts.length} unlinked receipts.`,
        );
        setStatusMessage(`Found ${newAllNewParsedLogs.length} logs.`);

        // Add imported logs
        if (newAllNewParsedLogs.length) {
          setStatusMessage(
            `Importing ${newAllNewParsedLogs.length} linked trades into your ledger...`,
          );
          await addLogs(newAllNewParsedLogs, { skipNegativeStock: false });
        }

        // Refresh local state
        setTrades(DBInterface.migrationGetTrades());
        setReceipts(DBInterface.migrationGetReceipts());
        //         itemId: 0,
        //         amount: 0,
        //       };
        //     }),
        //     receipt: undefined,
        //     differences: [],
        //   });
        // });

        // Save state
        nextTradeCursor = { lastTimestamp: toTimestamp, lastLogId: "" };
        if (nextTradeCursor) {
          await saveAutoPilotState({
            autoPilotCursor: nextTradeCursor,
            autoPilotTradeCursor: nextTradeCursor,
            autoPilotItemCursor: nextItemCursor,
            autoPilotLastSyncAt: Date.now(),
          });
        }

        const unlinkedCount =
          unlinkedTrades.length + newUnlinkedReceipts.length;
        const syncCompletedMessage =
          unlinkedCount > 0
            ? `Auto-Pilot sync completed. ${unlinkedTrades.length} unlinked trades and ${newUnlinkedReceipts.length} unlinked receipts need review.`
            : "Auto-Pilot sync completed.";
        setStatusMessage(syncCompletedMessage);
      }
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Auto-Pilot sync failed.",
      );
      setStatusMessage("");
    } finally {
      setIsRunning(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-orange-700 dark:text-orange-300">
            <Radar className="h-3.5 w-3.5" />
            Auto-Pilot
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Automatic Torn log ingestion
          </h1>
          <p className="max-w-2xl text-sm text-foreground/65">
            Sync Bazaar, Item Market, and linked trade receipts from the current
            cursor forward.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/auto/receipts"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-panel px-4 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            Review Receipts
          </Link>
          <Link
            href="/add"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-panel px-4 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            Terminal
          </Link>
        </div>
      </div>

      {/* Beta Warning Banner */}
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
              Beta Feature
            </p>
            <p className="text-sm text-yellow-700/80 dark:text-yellow-300/80">
              Auto-Pilot is currently in beta. Dual-cursor sync across devices
              via Google Drive may not work reliably yet. Use with caution and
              keep backups of your data.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Sync Controls</h2>
                <p className="text-sm text-foreground/55">
                  First run initializes the cursor to the current time. Later
                  runs continue from the last imported Torn log.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void syncNow()}
                  disabled={isRunning || isSyncDisabled}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCcw
                    className={`h-4 w-4 ${isRunning || isFetchingFromDrive ? "animate-spin" : ""}`}
                  />
                  {isFetchingFromDrive
                    ? "Positioning ..."
                    : isRunning
                      ? "Syncing..."
                      : !autoPilotTradeCursor
                        ? "Initialize Auto-Pilot"
                        : needsContinueSync
                          ? "Continue Sync"
                          : "Sync Now"}
                </button>
                <div className="relative">
                  {typeof window !== "undefined" &&
                    localStorage.getItem("bml_storage_pref") === "drive" && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowRepositionMenu(!showRepositionMenu);
                          }}
                          disabled={isRunning || isSyncDisabled}
                          className="inline-flex items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 px-2.5 py-2.5 text-sm font-semibold text-orange-500 transition-opacity hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${showRepositionMenu ? "rotate-180" : ""}`}
                          />
                        </button>
                        {showRepositionMenu && (
                          <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-border bg-panel shadow-lg z-10">
                            <button
                              type="button"
                              onClick={() => {
                                setShowRepositionMenu(false);
                                setIsDriveLoaded(false);
                                void refreshDriveCache().then(() =>
                                  setIsDriveLoaded(true),
                                );
                              }}
                              disabled={isRunning || isFetchingFromDrive}
                              className="flex w-full items-center gap-2 rounded-t-xl px-4 py-3 text-sm font-semibold text-foreground hover:bg-background/50 transition-colors disabled:opacity-50"
                            >
                              <CloudDownload className="h-4 w-4" />
                              Sync Cursor
                            </button>
                          </div>
                        )}
                      </>
                    )}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-background/70 p-3">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground/55">
                  Trade Cursor
                </div>
                <div className="mt-2 text-sm">
                  {(() => {
                    const cursorInfo = formatCursor(autoPilotTradeCursor);
                    if (
                      typeof cursorInfo === "object" &&
                      cursorInfo.timestamp
                    ) {
                      return (
                        <div className="flex items-center gap-2">
                          <span className="text-foreground/50 text-xs">
                            {cursorInfo.timestamp}
                          </span>
                          <span className={cursorInfo.timeAgoStyle}>
                            {cursorInfo.timeAgo}
                          </span>
                        </div>
                      );
                    }
                    return typeof cursorInfo === "object"
                      ? cursorInfo.timeAgo
                      : cursorInfo;
                  })()}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-background/70 p-3">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground/55">
                  Item Cursor
                </div>
                <div className="mt-2 text-sm">
                  {(() => {
                    const cursorInfo = formatCursor(autoPilotItemCursor);
                    if (
                      typeof cursorInfo === "object" &&
                      cursorInfo.timestamp
                    ) {
                      return (
                        <div className="flex items-center gap-2">
                          <span className="text-foreground/50 text-xs">
                            {cursorInfo.timestamp}
                          </span>
                          <span className={cursorInfo.timeAgoStyle}>
                            {cursorInfo.timeAgo}
                          </span>
                        </div>
                      );
                    }
                    return typeof cursorInfo === "object"
                      ? cursorInfo.timeAgo
                      : cursorInfo;
                  })()}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-background/70 p-3">
              <div className="text-xs font-bold uppercase tracking-wider text-foreground/55">
                Sync Status
              </div>
              <div className="mt-2 text-sm text-foreground/70">
                {getSyncStatusMessage}
              </div>
            </div>

            {(statusMessage || pageError) && (
              <div
                className={`mt-4 rounded-xl border px-4 py-3 text-sm ${pageError
                    ? "border-danger/30 bg-danger/5 text-danger"
                    : "border-orange-500/20 bg-orange-500/5 text-foreground/75"
                  }`}
              >
                {pageError || statusMessage}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
            <h2 className="text-lg font-bold">Review Queue</h2>
            <div className="mt-4 space-y-3 text-sm text-foreground/65">
              <p>
                {reviewCounts.pendingTrades} trade
                {reviewCounts.pendingTrades === 1 ? "" : "s"} currently block
                the next sync.
              </p>
              <p>
                {reviewCounts.unlinkedTrades} unlinked trade
                {reviewCounts.unlinkedTrades === 1 ? "" : "s"} still need
                review.
              </p>
              <p>
                {reviewCounts.unlinkedReceipts} unlinked receipt
                {reviewCounts.unlinkedReceipts === 1 ? "" : "s"} are available
                for matching or trashing.
              </p>
            </div>
            <Link
              href="/auto/receipts"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold text-foreground/75 shadow-sm transition-colors hover:bg-foreground/5 hover:text-foreground active:scale-[0.98]"
            >
              Open Receipt Review
            </Link>
          </section>
        </div>

        <section className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-bold">Auto-Pilot Overview</h2>
          </div>

          <div className="space-y-4">
            {autoPilotStats.map((stat) => (
              <Link
                key={stat.id}
                href={`/auto/activity?type=${stat.type}`}
                className="group flex items-center justify-between p-4 rounded-2xl bg-background/50 border border-border hover:border-orange-500/30 hover:bg-orange-500/[0.02] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl bg-${stat.color}-500/10`}>
                    <stat.icon className={`h-5 w-5 text-${stat.color}-500`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-tight">
                      {stat.label}
                    </h3>
                    <p className="text-xs text-foreground/45 mt-0.5">
                      Click to view full history
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold tabular-nums group-hover:text-orange-500 transition-colors">
                    {stat.count}
                  </span>
                  <ChevronRight className="h-4 w-4 text-foreground/30 group-hover:text-orange-500 transition-all group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
        <h2 className="text-lg font-bold">Rules In Effect</h2>
        <div className="mt-4 space-y-3 text-sm text-foreground/65">
          <p>
            Bazaar and Item Market logs are imported with the exact Torn log
            timestamp.
          </p>
          <p>
            Trade receipts come from Torn `/user/trades` plus Weav3r receipts,
            and they are imported only when money and item counts match exactly.
          </p>
          <p>
            The cursor uses timestamp plus Torn log ID ordering to avoid
            duplicate imports on the next sync.
          </p>
          <p>
            When Google Drive is the active storage, Auto-Pilot cursor and
            review state are uploaded with the Drive ledger payload.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Recent Auto-Pilot Activity</h2>
          <span className="text-xs font-bold uppercase tracking-wider text-foreground/45">
            {activityRecords.length} records
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {activityRecords.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-foreground/50">
              No Auto-Pilot imports yet.
            </div>
          )}

          {activityRecords.slice(0, 5).map((record, index) => (
            <div
              key={`${record.id}-${record.status}-${record.note || ""}-${record.timestamp}-${index}`}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-background/50 px-5 py-4 transition-colors hover:border-orange-500/20 shadow-sm"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {record.status === "imported" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 font-bold" />
                  ) : record.status === "manual_required" ? (
                    <PauseCircle className="h-4 w-4 text-orange-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-foreground/50" />
                  )}
                  <p className="font-bold tracking-tight">{record.title}</p>
                  <span className="text-[10px] bg-foreground/5 py-0.5 px-2 rounded font-bold text-foreground/50 uppercase tracking-widest">
                    {(
                      record.sourceType ||
                      (record.title.toLowerCase().includes("bazaar")
                        ? "bazaar"
                        : record.title.toLowerCase().includes("item market")
                          ? "item-market"
                          : record.title.toLowerCase().includes("trade")
                            ? "trade"
                            : record.title
                              .toLowerCase()
                              .includes("points market")
                              ? "points-market"
                              : record.title.toLowerCase().includes("museum")
                                ? "museum"
                                : "")
                    )?.replace("-", " ")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-foreground/55 font-medium">
                  {new Date(record.timestamp * 1000).toLocaleString()}
                  {record.tornLogId ? ` · ${record.tornLogId}` : ""}
                  {record.weav3rReceiptId
                    ? ` · receipt ${record.weav3rReceiptId}`
                    : ""}
                </p>
                {record.note && (
                  <p className="mt-1.5 text-xs text-orange-600 font-medium">
                    {record.note}
                  </p>
                )}
              </div>
              <div
                className={`rounded-lg border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${record.status === "imported"
                    ? "bg-green-500/10 border-green-500/20 text-green-700"
                    : "bg-orange-500/10 border-orange-500/20 text-orange-700"
                  }`}
              >
                {record.status.replace("_", " ")}
              </div>
            </div>
          ))}

          {activityRecords.length > 5 && (
            <Link
              href="/auto/activity"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background/80 py-4 text-sm font-bold text-orange-500 transition-all hover:bg-orange-500 hover:text-white"
            >
              Show All Activity History
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
