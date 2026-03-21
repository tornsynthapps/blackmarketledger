"use client";

import Link from "next/link";
import { useMemo, useState, useRef } from "react";
import { AlertTriangle, CheckCircle2, Clock3, PauseCircle, Radar, RefreshCcw, Tags, Store, Coins, Box, Link2Off, ChevronRight, Activity } from "lucide-react";
import { useJournal } from "@/store/useJournal";
import {
  AutoPilotImportRecord,
  AutoPilotTradeLink,
  buildImportRecord,
  compareTradeAgainstReceipt,
  createParsedLogsFromReceipt,
  findMatchingReceipt,
  getTornItems,
  getTradeDetail,
  getWeav3rTrades,
  NormalizedLog,
  PendingAutoPilotTrade,
  SyncCursor
} from "@/lib/torn-api";
import { TornTradeDetail } from "@/lib/torn-api";
import { TransactionSourceType } from "@/lib/parser";
import { TronWrapper } from "@/lib/torn-wrapper";
import { needsItemSync } from "@/lib/cursor";

const MAX_RECENT_IMPORTS = 500;

function mergeRecentImports(current: AutoPilotImportRecord[], incoming: AutoPilotImportRecord[]) {
  const merged = [...incoming, ...current];
  const seen = new Set<string>();
  return merged.filter((record) => {
    const key = `${record.id}:${record.status}:${record.note || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, MAX_RECENT_IMPORTS);
}

function getImportSourceType(log: NormalizedLog): TransactionSourceType | undefined {
  const { typeId, title, category } = log;
  const haystack = `${title} ${category}`.toLowerCase();

  if ([1112, 1113].includes(typeId) || haystack.includes("item market")) return "item-market";
  if ([1225, 1226].includes(typeId) || haystack.includes("bazaar")) return "bazaar";
  if ([5010, 5011].includes(typeId) || haystack.includes("points")) return "points-market";
  if (typeId === 7000 || haystack.includes("museum")) return "museum";
  if (haystack.includes("trade")) return "trade";

  return undefined;
}

function formatCursor(cursor: SyncCursor | null) {
  if (!cursor) return { timeAgo: "Not initialized", timestamp: "", isStale: false, timeAgoStyle: "text-foreground/70" };
  
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
  const timeAgoStyle = isStale ? "text-orange-500 font-bold" : "text-foreground/70";
  
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
    autoPilotTradeCache,
    autoPilotReceiptCache,
    autoPilotTradeLinks,
    autoPilotTrashedReceiptIds,
    autoPilotManuallyAddedTradeIds,
    autoPilotPendingTrades,
    autoPilotRecentImports,
    saveAutoPilotState
  } = useJournal();

  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [pageError, setPageError] = useState("");
  const isAutoSyncRef = useRef(false);

  const importedTradeIds = useMemo(() => {
    return new Set(
      transactions
        .map((transaction) => transaction.tornLogId)
        .filter((value): value is string => Boolean(value))
    );
  }, [transactions]);

  const manuallyHandledTrades = useMemo(() => {
    return new Set(
      autoPilotManuallyAddedTradeIds.map((tradeId) => `trade:${tradeId}`)
    );
  }, [autoPilotManuallyAddedTradeIds]);

  const linkedTradeIds = useMemo(() => new Set(autoPilotTradeLinks.map((link) => link.tradeId)), [autoPilotTradeLinks]);
  const linkedReceiptIds = useMemo(() => new Set(autoPilotTradeLinks.map((link) => link.receiptId)), [autoPilotTradeLinks]);

  const reviewCounts = useMemo(() => ({
    pendingTrades: autoPilotPendingTrades.length,
    unlinkedTrades: autoPilotTradeCache.filter((trade) => {
      const tradeId = String(trade.id);
      return !linkedTradeIds.has(tradeId) && !autoPilotManuallyAddedTradeIds.includes(tradeId);
    }).length,
    unlinkedReceipts: autoPilotReceiptCache.filter((receipt) => {
      return !linkedReceiptIds.has(receipt.id) && !autoPilotTrashedReceiptIds.includes(receipt.id);
    }).length,
  }), [
    autoPilotManuallyAddedTradeIds,
    autoPilotPendingTrades.length,
    autoPilotReceiptCache,
    autoPilotTradeCache,
    autoPilotTrashedReceiptIds,
    linkedReceiptIds,
    linkedTradeIds
  ]);

  const autoPilotStats = useMemo(() => {
    const getSource = (record: AutoPilotImportRecord) => {
      if (record.sourceType) return record.sourceType;
      const t = record.title.toLowerCase();
      if (t.includes("bazaar")) return "bazaar";
      if (t.includes("item market")) return "item-market";
      if (t.includes("trade")) return "trade";
      if (t.includes("points")) return "points-market";
      if (t.includes("museum")) return "museum";
      return undefined;
    };

    const unlinkedTrades = autoPilotRecentImports.filter(record => getSource(record) === 'trade' && record.status === 'manual_required');
    const successfulTrades = autoPilotRecentImports.filter(record => getSource(record) === 'trade' && record.status === 'imported');
    const itemMarketImports = autoPilotRecentImports.filter(record => getSource(record) === 'item-market');
    const bazaarImports = autoPilotRecentImports.filter(record => getSource(record) === 'bazaar');
    const pointsMarketImports = autoPilotRecentImports.filter(record => getSource(record) === 'points-market');
    const museumImports = autoPilotRecentImports.filter(record => getSource(record) === 'museum');

    return [
      { id: 'trade-unlinked', label: "Unlinked Trades", count: unlinkedTrades.length, icon: Link2Off, type: 'trade' as const, color: "orange" },
      { id: 'trade-success', label: "Successful Trades", count: successfulTrades.length, icon: CheckCircle2, type: 'trade' as const, color: "green" },
      { id: 'item-market', label: "Item Market Logs", count: itemMarketImports.length, icon: Tags, type: 'item-market' as const, color: "violet" },
      { id: 'bazaar', label: "Bazaar Logs", count: bazaarImports.length, icon: Store, type: 'bazaar' as const, color: "blue" },
      { id: 'points-market', label: "Points Market Logs", count: pointsMarketImports.length, icon: Coins, type: 'points-market' as const, color: "amber" },
      { id: 'museum', label: "Museum Logs", count: museumImports.length, icon: Box, type: 'museum' as const, color: "rose" },
    ];
  }, [autoPilotRecentImports]);

  // Helper to determine if there are unlinked trades
  const hasUnlinkedTrades = useMemo(() => {
    return autoPilotTradeCache.some((trade) => {
      const tradeId = String(trade.id);
      return !linkedTradeIds.has(tradeId) && !autoPilotManuallyAddedTradeIds.includes(tradeId);
    });
  }, [autoPilotTradeCache, linkedTradeIds, autoPilotManuallyAddedTradeIds]);

  // Check if items need syncing (item cursor behind trade cursor)
  const itemsNeedSync = useMemo(() => {
    if (!autoPilotTradeCursor || !autoPilotItemCursor) return false;
    return needsItemSync({ tradeCursor: autoPilotTradeCursor, itemCursor: autoPilotItemCursor });
  }, [autoPilotTradeCursor, autoPilotItemCursor]);

  // Check if we need "Continue Sync" - trade cursor > item cursor (needs item fetch)
  const needsContinueSync = useMemo(() => {
    if (!autoPilotTradeCursor || !autoPilotItemCursor) return false;
    return autoPilotTradeCursor.lastTimestamp > autoPilotItemCursor.lastTimestamp;
  }, [autoPilotTradeCursor, autoPilotItemCursor]);

  // Determine if sync should be disabled
  const isSyncDisabled = useMemo(() => {
    // Has pending trades requiring manual review
    if (autoPilotPendingTrades.length > 0) return true;
    // Has unlinked trades in cache
    if (hasUnlinkedTrades) return true;
    return false;
  }, [autoPilotPendingTrades.length, hasUnlinkedTrades]);

  // Get sync status message
  const getSyncStatusMessage = useMemo(() => {
    if (autoPilotPendingTrades.length > 0) {
      return `Resolve ${autoPilotPendingTrades.length} pending trade${autoPilotPendingTrades.length === 1 ? '' : 's'} before syncing`;
    }
    if (hasUnlinkedTrades) {
      return 'Review unlinked trades before syncing';
    }
    if (itemsNeedSync) {
      return 'Items need syncing - will fetch up to trade cursor';
    }
    return 'Ready to sync';
  }, [autoPilotPendingTrades.length, hasUnlinkedTrades, itemsNeedSync]);

  const initializeCursorNow = async () => {
    const now = Math.floor(Date.now() / 1000);
    const newCursor = { lastTimestamp: now, lastLogId: "" };
    // Initialize both cursors to the same timestamp
    await saveAutoPilotState({
      autoPilotCursor: newCursor,
      autoPilotTradeCursor: newCursor,
      autoPilotItemCursor: newCursor
    });
    setStatusMessage(`Auto-Pilot initialized at ${new Date(now * 1000).toLocaleString()}. Future syncs will start from this cursor.`);
    setPageError("");
    return newCursor;
  };


  const syncNow = async () => {
    // 1. Handle Errors.
    if (!tornApiKeyFull) {
      setPageError("Save a Torn full-access key in Service Access before syncing.");
      return;
    }
    if (!weav3rApiKey || !weav3rUserId) {
      setPageError("Save your Weav3r/Torn API key first so receipts can be fetched.");
      return;
    }

    // Check for unlinked trades FIRST - disable sync if any exist
    if (hasUnlinkedTrades) {
      setPageError("Review unlinked trades in the cache before running another sync.");
      return;
    }
    if (autoPilotPendingTrades.length) {
      setPageError("Resolve the pending trades before running another sync.");
      return;
    }

    // 2. Start sync.
    setPageError("");
    setIsRunning(true);
    let syncType: 'trade' | 'item' | null = null;

    try {
      // 2.1 Initialize cursors if not set (first run)
      let tradeCursor = autoPilotTradeCursor;
      let itemCursor = autoPilotItemCursor;

      // Handle legacy cursor migration or first initialization
      if (!tradeCursor || !itemCursor) {
        // Check if we have a legacy cursor to migrate from
        if (autoPilotCursor && autoPilotCursor.lastTimestamp) {
          // Migrate legacy cursor to dual cursors
          tradeCursor = { ...autoPilotCursor };
          itemCursor = { ...autoPilotCursor };
          await saveAutoPilotState({
            autoPilotTradeCursor: tradeCursor,
            autoPilotItemCursor: itemCursor
          });
          setStatusMessage(`Migrated from legacy cursor. Starting sync...`);
        } else {
          // Fresh initialization
          const now = Math.floor(Date.now() / 1000);
          const newCursor = { lastTimestamp: now, lastLogId: "" };
          tradeCursor = newCursor;
          itemCursor = newCursor;
          await saveAutoPilotState({
            autoPilotCursor: newCursor,
            autoPilotTradeCursor: newCursor,
            autoPilotItemCursor: newCursor
          });
          setStatusMessage(`Auto-Pilot initialized. Starting sync...`);
        }
      }

      const wrapper = new TronWrapper(tornApiKeyFull);
      const allNewParsedLogs: any[] = [];
      const batchRecords: AutoPilotImportRecord[] = [];
      let nextTradeCursor = tradeCursor;
      let nextItemCursor = itemCursor;

      // 2.2 Handle items fetch.
      // DUAL CURSOR LOGIC:
      // If Trade Cursor > Item Cursor, we need to fetch items first to catch up
      if (tradeCursor.lastTimestamp > itemCursor.lastTimestamp) {
        syncType = 'item';
        setStatusMessage(`Fetching item logs up to trade cursor (${new Date(tradeCursor.lastTimestamp * 1000).toLocaleString()})...`);

        // Fetch items up to the trade cursor timestamp
        const itemResult = await wrapper.getNewLogs({
          lastTimestamp: itemCursor.lastTimestamp,
          lastLogId: itemCursor.lastLogId
        }, tradeCursor.lastTimestamp);

        const { logs: itemLogs, parsedLogs: itemParsedLogs, nextCursor: newItemCursor } = itemResult;

        // Add items to the import
        for (const log of itemLogs) {
          batchRecords.push(buildImportRecord({
            id: `log:${log.id}`,
            timestamp: log.timestamp,
            title: log.title || log.category || "Torn log",
            status: "imported",
            sourceType: getImportSourceType(log),
            tornLogId: String(log.id)
          }));
        }
        allNewParsedLogs.push(...itemParsedLogs);
        console.log(newItemCursor)
        nextItemCursor = newItemCursor;

        setStatusMessage(`Item sync complete.`);
        await saveAutoPilotState({
          autoPilotItemCursor: nextItemCursor,
          autoPilotLastSyncAt: Date.now(),
        });
      }

      // 2.3 Handle trade fetch.
      else {
        syncType = 'trade';
        // Fetch trades from trade cursor position
        setStatusMessage("Fetching completed trades...");
        const tradeStart = tradeCursor.lastTimestamp;

        // Fetch trades with error handling for Torn API error 17
        let tornTrades: any[] = [];
        tornTrades = await wrapper.getTornTrades(tradeStart);

        const weav3rTrades = await getWeav3rTrades(weav3rApiKey, weav3rUserId, tradeStart - 10 * 60 * 60, autoPilotReceiptCache);

        const existingIds = new Set(importedTradeIds);
        const pendingTrades: PendingAutoPilotTrade[] = [];
        const nextTradeCache: TornTradeDetail[] = [...autoPilotTradeCache];
        const nextReceiptCacheMap = new Map(autoPilotReceiptCache.map((receipt) => [receipt.id, receipt]));
        const nextTradeLinks: AutoPilotTradeLink[] = [...autoPilotTradeLinks];

        let recentImports = mergeRecentImports(autoPilotRecentImports, batchRecords);

        weav3rTrades.forEach((receipt) => nextReceiptCacheMap.set(receipt.id, receipt));
        const allReceipts = Array.from(nextReceiptCacheMap.values());
        const excludedIds = new Set([...linkedReceiptIds, ...autoPilotTrashedReceiptIds]);

        for (const trade of tornTrades) {
          const tradeLogId = `trade:${trade.id}`;
          if (existingIds.has(tradeLogId) || manuallyHandledTrades.has(tradeLogId) || linkedTradeIds.has(String(trade.id))) {
            continue;
          }

          setStatusMessage(`Checking trade ${trade.id}...`);

          // Check cache first
          let detail = nextTradeCache.find((t) => String(t.id) === String(trade.id));
          if (!detail) {
            try {
              detail = await getTradeDetail(tornApiKeyFull, trade.id);
              if (detail) {
                nextTradeCache.push(detail);
              }
            } catch (e) {
              console.error(`Failed to fetch detail for trade ${trade.id}`, e);
            }
          }

          if (!detail) {
            continue;
          }

          const receipt = findMatchingReceipt(detail, allReceipts, weav3rUserId, excludedIds);
          const comparison = compareTradeAgainstReceipt(detail, receipt, weav3rUserId);

          if (comparison.differences.length) {
            const record = buildImportRecord({
              id: `trade:${trade.id}`,
              timestamp: Number(trade.timestamp),
              title: `Trade ${trade.id}`,
              status: "manual_required",
              sourceType: "trade",
              tornLogId: tradeLogId,
              weav3rReceiptId: receipt?.id,
              note: comparison.differences.map((difference) => difference.message).join(" ")
            });
            pendingTrades.push(comparison);
            recentImports = mergeRecentImports(recentImports, [record]);
            continue;
          }

          const parsedTradeLogs = createParsedLogsFromReceipt(detail, receipt!);
          allNewParsedLogs.push(...parsedTradeLogs);
          existingIds.add(tradeLogId);
          nextTradeLinks.push({ tradeId: String(trade.id), receiptId: receipt!.id });
          recentImports = mergeRecentImports(recentImports, [buildImportRecord({
            id: `trade:${trade.id}`,
            timestamp: Number(trade.timestamp),
            title: `Trade ${trade.id}`,
            status: "imported",
            sourceType: "trade",
            tornLogId: tradeLogId,
            weav3rReceiptId: receipt!.id
          })]);
        }

        // Update trade cursor.
        const now = Math.floor(Date.now() / 1000);
        nextTradeCursor = { lastTimestamp: now, lastLogId: "" };

        await saveAutoPilotState({
          autoPilotCursor: nextTradeCursor,
          autoPilotTradeCursor: nextTradeCursor,
          autoPilotItemCursor: nextItemCursor,
          autoPilotLastSyncAt: Date.now(),
          autoPilotTradeCache: nextTradeCache.filter((trade, index, all) => index === all.findIndex((candidate) => String(candidate.id) === String(trade.id))),
          autoPilotReceiptCache: [...nextReceiptCacheMap.values()],
          autoPilotTradeLinks: nextTradeLinks.filter((link, index, all) => index === all.findIndex((candidate) => candidate.tradeId === link.tradeId)),
          autoPilotPendingTrades: pendingTrades,
          autoPilotRecentImports: recentImports
        });
        const syncCompletedMessage = pendingTrades.length
          ? `Auto-Pilot sync completed with ${pendingTrades.length} trades requiring manual input.`
          : "Auto-Pilot sync completed.";
        setStatusMessage(syncCompletedMessage);
        
        // If no discrepancies (pending trades) and not already in auto-sync, auto-sync items
        if (pendingTrades.length === 0 && !isAutoSyncRef.current) {
          isAutoSyncRef.current = true;
          setStatusMessage("Trade sync complete. Starting item sync...");
          // Small delay to let the UI update
          setTimeout(() => {
            syncNow();
          }, 500);
        } else {
          isAutoSyncRef.current = false;
        }
      }

      // 3. Add Logs and update cursors.
      if (allNewParsedLogs.length) {
        setStatusMessage(`Importing ${allNewParsedLogs.length} total logs into your ledger...`);
        await addLogs(allNewParsedLogs, { skipNegativeStock: false });
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Auto-Pilot sync failed.");
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
          <h1 className="text-3xl font-bold tracking-tight">Automatic Torn log ingestion</h1>
          <p className="max-w-2xl text-sm text-foreground/65">
            Sync Bazaar, Item Market, and linked trade receipts from the current cursor forward.
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
              Auto-Pilot is currently in beta. Dual-cursor sync across devices via Google Drive may not work reliably yet. Use with caution and keep backups of your data.
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
                <p className="text-sm text-foreground/55">First run initializes the cursor to the current time. Later runs continue from the last imported Torn log.</p>
              </div>
              <button
                type="button"
                onClick={() => void syncNow()}
                disabled={isRunning || isSyncDisabled}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCcw className={`h-4 w-4 ${isRunning ? "animate-spin" : ""}`} />
                {isRunning ? "Syncing..." : !autoPilotTradeCursor ? "Initialize Auto-Pilot" : needsContinueSync ? "Continue Sync" : "Sync Now"}
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-background/70 p-3">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground/55">Trade Cursor</div>
                <div className="mt-2 text-sm">
                  {(() => {
                    const cursorInfo = formatCursor(autoPilotTradeCursor);
                    if (typeof cursorInfo === 'object' && cursorInfo.timestamp) {
                      return (
                        <div className="flex items-center gap-2">
                          <span className="text-foreground/50 text-xs">{cursorInfo.timestamp}</span>
                          <span className={cursorInfo.timeAgoStyle}>{cursorInfo.timeAgo}</span>
                        </div>
                      );
                    }
                    return typeof cursorInfo === 'object' ? cursorInfo.timeAgo : cursorInfo;
                  })()}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-background/70 p-3">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground/55">Item Cursor</div>
                <div className="mt-2 text-sm">
                  {(() => {
                    const cursorInfo = formatCursor(autoPilotItemCursor);
                    if (typeof cursorInfo === 'object' && cursorInfo.timestamp) {
                      return (
                        <div className="flex items-center gap-2">
                          <span className="text-foreground/50 text-xs">{cursorInfo.timestamp}</span>
                          <span className={cursorInfo.timeAgoStyle}>{cursorInfo.timeAgo}</span>
                        </div>
                      );
                    }
                    return typeof cursorInfo === 'object' ? cursorInfo.timeAgo : cursorInfo;
                  })()}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-background/70 p-3">
              <div className="text-xs font-bold uppercase tracking-wider text-foreground/55">Sync Status</div>
              <div className="mt-2 text-sm text-foreground/70">{getSyncStatusMessage}</div>
            </div>

            {(statusMessage || pageError) && (
              <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${pageError ? "border-danger/30 bg-danger/5 text-danger" : "border-orange-500/20 bg-orange-500/5 text-foreground/75"
                }`}>
                {pageError || statusMessage}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
            <h2 className="text-lg font-bold">Review Queue</h2>
            <div className="mt-4 space-y-3 text-sm text-foreground/65">
              <p>{reviewCounts.pendingTrades} trade{reviewCounts.pendingTrades === 1 ? "" : "s"} currently block the next sync.</p>
              <p>{reviewCounts.unlinkedTrades} unlinked trade{reviewCounts.unlinkedTrades === 1 ? "" : "s"} still need review.</p>
              <p>{reviewCounts.unlinkedReceipts} unlinked receipt{reviewCounts.unlinkedReceipts === 1 ? "" : "s"} are available for matching or trashing.</p>
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
                    <h3 className="font-bold text-sm tracking-tight">{stat.label}</h3>
                    <p className="text-xs text-foreground/45 mt-0.5">Click to view full history</p>
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
          <p>Bazaar and Item Market logs are imported with the exact Torn log timestamp.</p>
          <p>Trade receipts come from Torn `/user/trades` plus Weav3r receipts, and they are imported only when money and item counts match exactly.</p>
          <p>The cursor uses timestamp plus Torn log ID ordering to avoid duplicate imports on the next sync.</p>
          <p>When Google Drive is the active storage, Auto-Pilot cursor and review state are uploaded with the Drive ledger payload.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Recent Auto-Pilot Activity</h2>
          <span className="text-xs font-bold uppercase tracking-wider text-foreground/45">{autoPilotRecentImports.length} records</span>
        </div>

        <div className="mt-4 space-y-3">
          {autoPilotRecentImports.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-foreground/50">
              No Auto-Pilot imports yet.
            </div>
          )}

          {autoPilotRecentImports.slice(0, 5).map((record) => (
            <div key={`${record.id}-${record.status}-${record.note || ""}`} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-background/50 px-5 py-4 transition-colors hover:border-orange-500/20 shadow-sm">
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
                    {(record.sourceType || (
                      record.title.toLowerCase().includes("bazaar") ? "bazaar" :
                        record.title.toLowerCase().includes("item market") ? "item-market" :
                          record.title.toLowerCase().includes("trade") ? "trade" :
                            record.title.toLowerCase().includes("points market") ? "points-market" :
                              record.title.toLowerCase().includes("museum") ? "museum" : ""
                    ))?.replace("-", " ")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-foreground/55 font-medium">
                  {new Date(record.timestamp * 1000).toLocaleString()}
                  {record.tornLogId ? ` · ${record.tornLogId}` : ""}
                  {record.weav3rReceiptId ? ` · receipt ${record.weav3rReceiptId}` : ""}
                </p>
                {record.note && <p className="mt-1.5 text-xs text-orange-600 font-medium">{record.note}</p>}
              </div>
              <div className={`rounded-lg border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${record.status === 'imported'
                ? 'bg-green-500/10 border-green-500/20 text-green-700'
                : 'bg-orange-500/10 border-orange-500/20 text-orange-700'
                }`}>
                {record.status.replace("_", " ")}
              </div>
            </div>
          ))}

          {autoPilotRecentImports.length > 5 && (
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
