"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, PauseCircle, Radar, RefreshCcw, Tags, Store, Coins, Box, Link2Off, ChevronRight, Activity } from "lucide-react";
import { useJournal } from "@/store/useJournal";
import {
  AutoPilotImportRecord,
  AutoPilotTradeLink,
  buildImportRecord,
  compareTradeAgainstReceipt,
  createParsedLogsFromReceipt,
  findMatchingReceipt,
  getCompletedTrades,
  getNewLogs,
  getTornItems,
  getTradeDetail,
  getWeav3rTrades,
  parseNormalizedLog,
  PendingAutoPilotTrade,
  SyncCursor
} from "@/lib/torn-api";
import { TornTradeDetail } from "@/lib/torn-api";
import { TransactionSourceType } from "@/lib/parser";

const MAX_RECENT_IMPORTS = 40;

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

function getImportSourceTypeFromTitle(title: string): TransactionSourceType | undefined {
  const haystack = title.toLowerCase();
  if (haystack.includes("bazaar")) return "bazaar";
  if (haystack.includes("item market")) return "item-market";
  if (haystack.includes("trade")) return "trade";
  return undefined;
}

function formatCursor(cursor: SyncCursor | null) {
  if (!cursor) return "Not initialized";
  return `${new Date(cursor.lastTimestamp * 1000).toLocaleString()} · log ${cursor.lastLogId || "start"}`;
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
    const unlinkedTrades = autoPilotRecentImports.filter(record => record.sourceType === 'trade' && record.status === 'manual_required');
    const successfulTrades = autoPilotRecentImports.filter(record => record.sourceType === 'trade' && record.status === 'imported');
    const itemMarketImports = autoPilotRecentImports.filter(record => record.sourceType === 'item-market');
    const bazaarImports = autoPilotRecentImports.filter(record => record.sourceType === 'bazaar');
    const pointsMarketImports = autoPilotRecentImports.filter(record => record.sourceType === 'points-market');
    const museumImports = autoPilotRecentImports.filter(record => record.sourceType === 'museum');

    return [
      { id: 'trade-unlinked', label: "Unlinked Trades", count: unlinkedTrades.length, icon: Link2Off, type: 'trade' as const, color: "orange" },
      { id: 'trade-success', label: "Successful Trades", count: successfulTrades.length, icon: CheckCircle2, type: 'trade' as const, color: "green" },
      { id: 'item-market', label: "Item Market Logs", count: itemMarketImports.length, icon: Tags, type: 'item-market' as const, color: "violet" },
      { id: 'bazaar', label: "Bazaar Logs", count: bazaarImports.length, icon: Store, type: 'bazaar' as const, color: "blue" },
      { id: 'points-market', label: "Points Market Logs", count: pointsMarketImports.length, icon: Coins, type: 'points-market' as const, color: "amber" },
      { id: 'museum', label: "Museum Logs", count: museumImports.length, icon: Box, type: 'museum' as const, color: "rose" },
    ];
  }, [autoPilotRecentImports]);

  const initializeCursorNow = async () => {
    const now = Math.floor(Date.now() / 1000);
    await saveAutoPilotState({
      autoPilotCursor: { lastTimestamp: now, lastLogId: "" }
    });
    setStatusMessage(`Auto-Pilot initialized at ${new Date(now * 1000).toLocaleString()}. Future syncs will start from this cursor.`);
    setPageError("");
    return { lastTimestamp: now, lastLogId: "" } satisfies SyncCursor;
  };

  const syncNow = async () => {
    if (!tornApiKeyFull) {
      setPageError("Save a Torn full-access key in Service Access before syncing.");
      return;
    }
    if (!weav3rApiKey || !weav3rUserId) {
      setPageError("Save your Weav3r/Torn API key first so receipts can be fetched.");
      return;
    }
    if (autoPilotPendingTrades.length) {
      setPageError("Resolve the pending trades before running another sync.");
      return;
    }

    setPageError("");
    setIsRunning(true);

    try {
      const currentCursor = autoPilotCursor || await initializeCursorNow();
      if (!autoPilotCursor) {
        setIsRunning(false);
        return;
      }

      setStatusMessage("Fetching Torn logs...");
      const itemNameMap = await getTornItems(tornApiKeyFull);
      const { logs, nextCursor } = await getNewLogs(tornApiKeyFull, currentCursor);
      const nonTradeLogs = [];
      const batchRecords: AutoPilotImportRecord[] = [];

      for (const log of logs) {
        const result = parseNormalizedLog(log, itemNameMap);
        if (result.kind === "parsed") {
          nonTradeLogs.push(...result.logs);
          batchRecords.push(buildImportRecord({
            id: `log:${log.id}`,
            timestamp: log.timestamp,
            title: log.title || log.category || "Torn log",
            status: "imported",
            sourceType: getImportSourceTypeFromTitle(log.title || log.category || ""),
            tornLogId: String(log.id)
          }));
        }
      }

      if (nonTradeLogs.length) {
        setStatusMessage(`Importing ${nonTradeLogs.length} Torn market logs...`);
        await addLogs(nonTradeLogs, { skipNegativeStock: false });
      }

      await saveAutoPilotState({
        autoPilotCursor: nextCursor,
        autoPilotRecentImports: mergeRecentImports(autoPilotRecentImports, batchRecords)
      });

      setStatusMessage("Fetching completed trades...");
      const tradeStart = currentCursor.lastTimestamp;
      const [tornTrades, weav3rTrades] = await Promise.all([
        getCompletedTrades(tornApiKeyFull, tradeStart),
        getWeav3rTrades(weav3rApiKey, weav3rUserId, tradeStart, autoPilotReceiptCache)
      ]);
      const existingIds = new Set(importedTradeIds);
      const pendingTrades: PendingAutoPilotTrade[] = [];
      const nextTradeCache: TornTradeDetail[] = [...autoPilotTradeCache];
      const nextReceiptCacheMap = new Map(autoPilotReceiptCache.map((receipt) => [receipt.id, receipt]));
      const nextTradeLinks: AutoPilotTradeLink[] = [...autoPilotTradeLinks];

      let recentImports = mergeRecentImports(autoPilotRecentImports, batchRecords);

      weav3rTrades.forEach((receipt) => nextReceiptCacheMap.set(receipt.id, receipt));

      for (const trade of tornTrades) {
        const tradeLogId = `trade:${trade.id}`;
        if (existingIds.has(tradeLogId) || manuallyHandledTrades.has(tradeLogId) || linkedTradeIds.has(String(trade.id))) {
          continue;
        }

        setStatusMessage(`Checking trade ${trade.id}...`);
        const detail = await getTradeDetail(tornApiKeyFull, trade.id);
        nextTradeCache.push(detail);
        const receipt = findMatchingReceipt(detail, [...nextReceiptCacheMap.values()], weav3rUserId, new Set([...linkedReceiptIds, ...autoPilotTrashedReceiptIds]));
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

        const parsedLogs = createParsedLogsFromReceipt(detail, receipt!);
        await addLogs(parsedLogs, { skipNegativeStock: false });
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

      await saveAutoPilotState({
        autoPilotCursor: nextCursor,
        autoPilotLastSyncAt: Date.now(),
        autoPilotTradeCache: nextTradeCache.filter((trade, index, all) => index === all.findIndex((candidate) => String(candidate.id) === String(trade.id))),
        autoPilotReceiptCache: [...nextReceiptCacheMap.values()],
        autoPilotTradeLinks: nextTradeLinks.filter((link, index, all) => index === all.findIndex((candidate) => candidate.tradeId === link.tradeId)),
        autoPilotPendingTrades: pendingTrades,
        autoPilotRecentImports: recentImports
      });
      setStatusMessage(
        pendingTrades.length
          ? `Auto-Pilot sync completed with ${pendingTrades.length} trades requiring manual input.`
          : "Auto-Pilot sync completed."
      );
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

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Sync Controls</h2>
              <p className="text-sm text-foreground/55">First run initializes the cursor to the current time. Later runs continue from the last imported Torn log.</p>
            </div>
            <button
              type="button"
              onClick={() => void syncNow()}
              disabled={isRunning || autoPilotPendingTrades.length > 0}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCcw className={`h-4 w-4 ${isRunning ? "animate-spin" : ""}`} />
              {isRunning ? "Syncing..." : autoPilotCursor ? "Sync Now" : "Initialize Auto-Pilot"}
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background/70 p-3">
              <div className="text-xs font-bold uppercase tracking-wider text-foreground/55">Current Cursor</div>
              <div className="mt-2 text-sm text-foreground/70">{formatCursor(autoPilotCursor)}</div>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-3">
              <div className="text-xs font-bold uppercase tracking-wider text-foreground/55">Last Sync</div>
              <div className="mt-2 text-sm text-foreground/70">
                {autoPilotLastSyncAt ? new Date(autoPilotLastSyncAt).toLocaleString() : "No sync run yet"}
              </div>
            </div>
          </div>

          {(statusMessage || pageError) && (
            <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              pageError ? "border-danger/30 bg-danger/5 text-danger" : "border-orange-500/20 bg-orange-500/5 text-foreground/75"
            }`}>
              {pageError || statusMessage}
            </div>
          )}
        </section>

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

          <div className="mt-8 pt-6 border-t border-border/50">
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
                  <span className="text-[10px] bg-foreground/5 py-0.5 px-2 rounded font-bold text-foreground/50 uppercase tracking-widest">{record.sourceType?.replace("-", " ")}</span>
                </div>
                <p className="mt-1 text-xs text-foreground/55 font-medium">
                  {new Date(record.timestamp * 1000).toLocaleString()}
                  {record.tornLogId ? ` · ${record.tornLogId}` : ""}
                  {record.weav3rReceiptId ? ` · receipt ${record.weav3rReceiptId}` : ""}
                </p>
                {record.note && <p className="mt-1.5 text-xs text-orange-600 font-medium">{record.note}</p>}
              </div>
              <div className={`rounded-lg border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                record.status === 'imported' 
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
