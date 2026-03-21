"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, PauseCircle, ReceiptText } from "lucide-react";
import { useJournal } from "@/store/useJournal";
import { buildImportRecord, createParsedLogsFromReceipt, PendingAutoPilotTrade } from "@/lib/torn-api";

const MAX_RECENT_IMPORTS = 40;

function mergeRecentImports(current: ReturnType<typeof useJournal>["autoPilotRecentImports"], incoming: ReturnType<typeof useJournal>["autoPilotRecentImports"]) {
  const merged = [...incoming, ...current];
  const seen = new Set<string>();
  return merged.filter((record) => {
    const key = `${record.id}:${record.status}:${record.note || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, MAX_RECENT_IMPORTS);
}

function getPendingTradeMoneyAmount(pendingTrade: PendingAutoPilotTrade) {
  const legacy = pendingTrade as PendingAutoPilotTrade & {
    tornMoneyGiven?: number;
    tornMoneyReceived?: number;
  };
  if (typeof pendingTrade.moneyAmount === "number") return pendingTrade.moneyAmount;
  if (typeof legacy.tornMoneyGiven === "number" && legacy.tornMoneyGiven > 0) return legacy.tornMoneyGiven;
  if (typeof legacy.tornMoneyReceived === "number" && legacy.tornMoneyReceived > 0) return legacy.tornMoneyReceived;
  return 0;
}

function getPendingTradeItems(pendingTrade: PendingAutoPilotTrade) {
  const legacy = pendingTrade as PendingAutoPilotTrade & {
    tornItemsReceived?: Array<{ itemId: number; amount: number }>;
  };
  return pendingTrade.tradeItems || legacy.tornItemsReceived || [];
}

export default function ReceiptReviewPage() {
  const {
    isLoaded,
    addLogs,
    autoPilotTradeCache,
    autoPilotReceiptCache,
    autoPilotTradeLinks,
    autoPilotTrashedReceiptIds,
    autoPilotManuallyAddedTradeIds,
    autoPilotPendingTrades,
    autoPilotRecentImports,
    saveAutoPilotState
  } = useJournal();

  const [pageError, setPageError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [manualLinkSelections, setManualLinkSelections] = useState<Record<string, string>>({});

  const linkedTradeIds = useMemo(() => new Set(autoPilotTradeLinks.map((link) => link.tradeId)), [autoPilotTradeLinks]);
  const linkedReceiptIds = useMemo(() => new Set(autoPilotTradeLinks.map((link) => link.receiptId)), [autoPilotTradeLinks]);

  const unlinkedTrades = useMemo(() => {
    return autoPilotTradeCache.filter((trade) => {
      const tradeId = String(trade.id);
      return !linkedTradeIds.has(tradeId) && !autoPilotManuallyAddedTradeIds.includes(tradeId);
    });
  }, [autoPilotTradeCache, linkedTradeIds, autoPilotManuallyAddedTradeIds]);

  const unlinkedReceipts = useMemo(() => {
    return autoPilotReceiptCache.filter((receipt) => {
      return !linkedReceiptIds.has(receipt.id) && !autoPilotTrashedReceiptIds.includes(receipt.id);
    });
  }, [autoPilotReceiptCache, linkedReceiptIds, autoPilotTrashedReceiptIds]);

  const trashedReceipts = useMemo(() => {
    return autoPilotReceiptCache.filter((receipt) => autoPilotTrashedReceiptIds.includes(receipt.id));
  }, [autoPilotReceiptCache, autoPilotTrashedReceiptIds]);

  const manuallyAddedTrades = useMemo(() => {
    return autoPilotTradeCache.filter((trade) => autoPilotManuallyAddedTradeIds.includes(String(trade.id)));
  }, [autoPilotTradeCache, autoPilotManuallyAddedTradeIds]);

  const markPendingTradeHandled = async (tradeId: string) => {
    const pendingTrade = autoPilotPendingTrades.find((trade) => trade.tradeId === tradeId);
    if (!pendingTrade) return;

    const record = buildImportRecord({
      id: `trade:${pendingTrade.tradeId}`,
      timestamp: pendingTrade.timestamp,
      title: `Trade ${pendingTrade.tradeId}`,
      status: "skipped",
      sourceType: "trade",
      tornLogId: `trade:${pendingTrade.tradeId}`,
      weav3rReceiptId: pendingTrade.receipt?.id,
      note: "Marked as entered manually."
    });

    await saveAutoPilotState({
      autoPilotPendingTrades: autoPilotPendingTrades.filter((trade) => trade.tradeId !== tradeId),
      autoPilotManuallyAddedTradeIds: [...new Set([...autoPilotManuallyAddedTradeIds, tradeId])],
      autoPilotRecentImports: mergeRecentImports(autoPilotRecentImports, [record])
    });
    setStatusMessage(`Trade ${pendingTrade.tradeId} marked as handled manually.`);
    setPageError("");
  };

  const trashReceipt = async (receiptId: string) => {
    await saveAutoPilotState({
      autoPilotTrashedReceiptIds: [...new Set([...autoPilotTrashedReceiptIds, receiptId])]
    });
    setStatusMessage(`Receipt ${receiptId} trashed.`);
    setPageError("");
  };

  const manuallyLinkTradeAndReceipt = async (tradeId: string) => {
    const receiptId = manualLinkSelections[tradeId];
    if (!receiptId) {
      setPageError("Select a receipt first.");
      return;
    }
    const trade = autoPilotTradeCache.find((entry) => String(entry.id) === tradeId);
    const receipt = autoPilotReceiptCache.find((entry) => entry.id === receiptId);
    if (!trade || !receipt) return;

    const parsedLogs = createParsedLogsFromReceipt(trade, receipt);
    await addLogs(parsedLogs, { skipNegativeStock: false });

    await saveAutoPilotState({
      autoPilotTradeLinks: [...autoPilotTradeLinks, { tradeId, receiptId, manual: true }],
      autoPilotPendingTrades: autoPilotPendingTrades.filter((pending) => pending.tradeId !== tradeId),
      autoPilotRecentImports: mergeRecentImports(autoPilotRecentImports, [buildImportRecord({
        id: `trade:${tradeId}:manual-link`,
        timestamp: Number(trade.timestamp),
        title: `Trade ${tradeId}`,
        status: "imported",
        sourceType: "trade",
        tornLogId: `trade:${tradeId}`,
        weav3rReceiptId: receiptId,
        note: "Manually linked."
      })])
    });

    setStatusMessage(`Trade ${tradeId} manually linked to receipt ${receiptId}.`);
    setPageError("");
  };

  if (!isLoaded) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-orange-700 dark:text-orange-300">
            <ReceiptText className="h-3.5 w-3.5" />
            Receipt Review
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Review trades and receipts</h1>
          <p className="max-w-2xl text-sm text-foreground/65">
            Resolve unlinked trades, manually link receipts, and keep track of archived review decisions.
          </p>
        </div>
        <Link
          href="/auto"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-panel px-4 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          Back To Auto-Pilot
        </Link>
      </div>

      {(statusMessage || pageError) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          pageError ? "border-danger/30 bg-danger/5 text-danger" : "border-orange-500/20 bg-orange-500/5 text-foreground/75"
        }`}>
          {pageError || statusMessage}
        </div>
      )}

      {autoPilotPendingTrades.length > 0 && (
        <section className="rounded-2xl border border-warning/30 bg-warning/5 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-warning">
                <PauseCircle className="h-4 w-4" />
                Sync paused on {autoPilotPendingTrades.length} trade{autoPilotPendingTrades.length === 1 ? "" : "s"}
              </div>
              <p className="mt-2 text-sm text-foreground/70">
                Enter these trades manually in the Terminal, or manually link them to an unlinked receipt here.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {autoPilotPendingTrades.map((pendingTrade) => (
              <div key={pendingTrade.tradeId} className="rounded-xl border border-warning/20 bg-background/80 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold">Trade {pendingTrade.tradeId}</h3>
                    <p className="mt-1 text-sm text-foreground/65">Partner: {pendingTrade.partnerName || "Unknown"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void markPendingTradeHandled(pendingTrade.tradeId)}
                    className="rounded-xl bg-warning px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Mark As Entered Manually
                  </button>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-warning/20 bg-background/80 p-4">
                    <h4 className="text-sm font-bold">Torn Trade</h4>
                    <div className="mt-3 space-y-2 text-sm text-foreground/70">
                      <p>Trade type: {pendingTrade.tradeType || "UNKNOWN"}</p>
                      <p>Money: ${getPendingTradeMoneyAmount(pendingTrade).toLocaleString()}</p>
                      <p>Items: {getPendingTradeItems(pendingTrade).map((item) => `${item.itemId} x${item.amount}`).join(", ") || "None"}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-warning/20 bg-background/80 p-4">
                    <h4 className="text-sm font-bold">Matched Receipt Candidate</h4>
                    <div className="mt-3 space-y-2 text-sm text-foreground/70">
                      <p>Receipt: {pendingTrade.receipt?.id || "Missing"}</p>
                      <p>Total: ${Number(pendingTrade.receipt?.total_value || 0).toLocaleString()}</p>
                      <p>
                        Items: {pendingTrade.receipt?.items.map((item) => `${item.item_name} x${item.quantity}`).join(", ") || "Missing"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {pendingTrade.differences.map((difference, index) => (
                    <div key={`${pendingTrade.tradeId}-${difference.kind}-${index}`} className="flex items-start gap-2 rounded-xl border border-warning/20 bg-background/70 px-3 py-2 text-sm text-foreground/75">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
                      <span>{difference.message}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <select
                    value={manualLinkSelections[pendingTrade.tradeId] || ""}
                    onChange={(event) => setManualLinkSelections((current) => ({ ...current, [pendingTrade.tradeId]: event.target.value }))}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select unlinked receipt</option>
                    {unlinkedReceipts.map((receipt) => (
                      <option key={receipt.id} value={receipt.id}>
                        {receipt.id} · ${receipt.total_value.toLocaleString()} · {new Date(receipt.created_at * 1000).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void manuallyLinkTradeAndReceipt(pendingTrade.tradeId)}
                    className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground/75 transition-colors hover:bg-foreground/5 hover:text-foreground"
                  >
                    Manually Link
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
        <h2 className="text-lg font-bold">Receipt Review</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-background/70 p-4">
            <h3 className="text-sm font-bold">Unlinked Receipts</h3>
            <div className="mt-3 space-y-3">
              {unlinkedReceipts.length === 0 && <p className="text-sm text-foreground/55">No unlinked receipts.</p>}
              {unlinkedReceipts.map((receipt) => (
                <div key={receipt.id} className="rounded-xl border border-border px-3 py-3 text-sm">
                  <div className="font-semibold">{receipt.id}</div>
                  <div className="mt-1 text-foreground/60">
                    ${receipt.total_value.toLocaleString()} · {new Date(receipt.created_at * 1000).toLocaleString()}
                  </div>
                  <div className="mt-1 text-foreground/60">{receipt.items.map((item) => `${item.item_name} x${item.quantity}`).join(", ")}</div>
                  <button
                    type="button"
                    onClick={() => void trashReceipt(receipt.id)}
                    className="mt-3 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground/75 transition-colors hover:bg-foreground/5 hover:text-foreground"
                  >
                    Trash Receipt
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-background/70 p-4">
            <h3 className="text-sm font-bold">Archive</h3>
            <div className="mt-3 space-y-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-foreground/50">Unlinked Trades</div>
                <div className="mt-2 space-y-2">
                  {unlinkedTrades.length === 0 && <p className="text-sm text-foreground/55">No unlinked trades.</p>}
                  {unlinkedTrades.map((trade) => (
                    <div key={trade.id} className="rounded-xl border border-border px-3 py-2 text-sm">
                      Trade {trade.id} · {new Date(trade.timestamp * 1000).toLocaleString()}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-foreground/50">Trashed Receipts</div>
                <div className="mt-2 space-y-2">
                  {trashedReceipts.length === 0 && <p className="text-sm text-foreground/55">No trashed receipts.</p>}
                  {trashedReceipts.map((receipt) => (
                    <div key={receipt.id} className="rounded-xl border border-border px-3 py-2 text-sm">
                      {receipt.id} · ${receipt.total_value.toLocaleString()}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-foreground/50">Manually Added Trades</div>
                <div className="mt-2 space-y-2">
                  {manuallyAddedTrades.length === 0 && <p className="text-sm text-foreground/55">No manually added trades.</p>}
                  {manuallyAddedTrades.map((trade) => (
                    <div key={trade.id} className="rounded-xl border border-border px-3 py-2 text-sm">
                      Trade {trade.id} · {new Date(trade.timestamp * 1000).toLocaleString()}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
