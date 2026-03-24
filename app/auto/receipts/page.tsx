"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { ReceiptText, Trash2 } from "lucide-react";
import { useJournal } from "@/store/useJournal";
import { createParsedLogsFromNewReceipt } from "@/lib/torn-api";
import { TornTrade, Weav3rReceipt } from "@/lib/game/trade";
import { DBInterface } from "@/lib/interfaces/db";

export default function ReceiptReviewPage() {
  const { isLoaded, addLogs } = useJournal();

  const [trades, setTrades] = useState<TornTrade[]>([]);
  const [receipts, setReceipts] = useState<Weav3rReceipt[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    setTrades(DBInterface.migrationGetTrades());
    setReceipts(DBInterface.migrationGetReceipts());
    setIsDataLoaded(true);
  }, []);

  const [pageError, setPageError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [manualLinkSelections, setManualLinkSelections] = useState<
    Record<string, string>
  >({});

  const unlinkedTrades = useMemo(() => {
    return trades.filter((trade) => !trade.isLinked() && !trade.manuallyLiked);
  }, [trades]);

  const unlinkedReceipts = useMemo(() => {
    return receipts.filter(
      (receipt) => !receipt.linkedTradeId && !receipt.trashed,
    );
  }, [receipts]);

  const trashedReceipts = useMemo(() => {
    return receipts.filter((receipt) => receipt.trashed);
  }, [receipts]);

  const manuallyAddedTrades = useMemo(() => {
    return trades.filter((trade) => trade.manuallyLiked);
  }, [trades]);

  const markTradeAsManuallyAdded = async (tradeId: string) => {
    const trade = trades.find((t) => t.id === tradeId);
    if (!trade) return;

    trade.manuallyLiked = true;
    DBInterface.migrationUpdateTrade(trade);
    setTrades(DBInterface.migrationGetTrades());
    setStatusMessage(`Trade ${tradeId} marked as handled manually.`);
    setPageError("");
  };

  const trashReceipt = async (receiptId: string) => {
    const receipt = receipts.find((r) => r.id === receiptId);
    if (!receipt) return;

    receipt.trashed = true;
    DBInterface.migrationUpdateReceipt(receipt);
    setReceipts(DBInterface.migrationGetReceipts());
    setStatusMessage(`Receipt ${receiptId} trashed.`);
    setPageError("");
  };

  const manuallyLinkTradeAndReceipt = async (tradeId: string) => {
    const receiptId = manualLinkSelections[tradeId];
    if (!receiptId) {
      setPageError("Select a receipt first.");
      return;
    }
    const trade = trades.find((t) => t.id === tradeId);
    const receipt = receipts.find((r) => r.id === receiptId);
    if (!trade || !receipt) return;

    trade.linkedReceiptId = receiptId;
    trade.manuallyLiked = true;
    receipt.linkedTradeId = trade.tornLogId;

    const parsedLogs = createParsedLogsFromNewReceipt(trade, receipt);
    await addLogs(parsedLogs, { skipNegativeStock: false });

    DBInterface.migrationUpdateTrade(trade);
    DBInterface.migrationUpdateReceipt(receipt);

    setTrades(DBInterface.migrationGetTrades());
    setReceipts(DBInterface.migrationGetReceipts());
    setManualLinkSelections((current) => {
      const updated = { ...current };
      delete updated[tradeId];
      return updated;
    });

    setStatusMessage(
      `Trade ${tradeId} manually linked to receipt ${receiptId}.`,
    );
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
          <h1 className="text-3xl font-bold tracking-tight">
            Review trades and receipts
          </h1>
          <p className="max-w-2xl text-sm text-foreground/65">
            Resolve unlinked trades, manually link receipts, and keep track of
            archived review decisions.
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
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            pageError
              ? "border-danger/30 bg-danger/5 text-danger"
              : "border-orange-500/20 bg-orange-500/5 text-foreground/75"
          }`}
        >
          {pageError || statusMessage}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
        <h2 className="text-lg font-bold">Receipt Review</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-background/70 p-4">
            <h3 className="text-sm font-bold">Unlinked Trades</h3>
            <div className="mt-3 space-y-3">
              {unlinkedTrades.length === 0 && (
                <p className="text-sm text-foreground/55">
                  No unlinked trades.
                </p>
              )}
              {unlinkedTrades.map((trade) => (
                <div
                  key={trade.id}
                  className="rounded-xl border border-border p-3 text-sm"
                >
                  <div className="font-semibold">Trade {trade.id}</div>
                  <div className="mt-1 text-foreground/60">
                    {new Date(trade.timestamp * 1000).toLocaleString()}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <select
                      value={manualLinkSelections[trade.id] || ""}
                      onChange={(event) =>
                        setManualLinkSelections((current) => ({
                          ...current,
                          [trade.id]: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-border bg-background px-2 py-1.5 text-xs"
                    >
                      <option value="">Select receipt</option>
                      {unlinkedReceipts.map((receipt) => (
                        <option key={receipt.id} value={receipt.id}>
                          {receipt.id} · ${receipt.totalValue.toLocaleString()}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void manuallyLinkTradeAndReceipt(trade.id)}
                      className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground/75 transition-colors hover:bg-foreground/5 hover:text-foreground"
                    >
                      Link
                    </button>
                    <button
                      type="button"
                      onClick={() => void markTradeAsManuallyAdded(trade.id)}
                      className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground/75 transition-colors hover:bg-foreground/5 hover:text-foreground"
                    >
                      Mark Manual
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-background/70 p-4">
            <h3 className="text-sm font-bold">Unlinked Receipts</h3>
            <div className="mt-3 space-y-3">
              {unlinkedReceipts.length === 0 && (
                <p className="text-sm text-foreground/55">
                  No unlinked receipts.
                </p>
              )}
              {unlinkedReceipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="rounded-xl border border-border px-3 py-3 text-sm"
                >
                  <div className="font-semibold">{receipt.id}</div>
                  <div className="mt-1 text-foreground/60">
                    ${receipt.totalValue.toLocaleString()} ·{" "}
                    {new Date(receipt.createdAt * 1000).toLocaleString()}
                  </div>
                  <div className="mt-1 text-foreground/60">
                    {receipt.items
                      .map((item) => `${item.itemName} x${item.quantity}`)
                      .join(", ")}
                  </div>
                  <button
                    type="button"
                    onClick={() => void trashReceipt(receipt.id)}
                    className="mt-3 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground/75 transition-colors hover:bg-foreground/5 hover:text-foreground flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Trash Receipt
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-background/70 p-4">
            <h3 className="text-sm font-bold">Archive</h3>
            <div className="mt-3 space-y-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-foreground/50">
                  Manually Added Trades
                </div>
                <div className="mt-2 space-y-2">
                  {manuallyAddedTrades.length === 0 && (
                    <p className="text-sm text-foreground/55">
                      No manually added trades.
                    </p>
                  )}
                  {manuallyAddedTrades.map((trade) => (
                    <div
                      key={trade.id}
                      className="rounded-xl border border-border px-3 py-2 text-sm"
                    >
                      Trade {trade.id} ·{" "}
                      {new Date(trade.timestamp * 1000).toLocaleString()}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-foreground/50">
                  Trashed Receipts
                </div>
                <div className="mt-2 space-y-2">
                  {trashedReceipts.length === 0 && (
                    <p className="text-sm text-foreground/55">
                      No trashed receipts.
                    </p>
                  )}
                  {trashedReceipts.map((receipt) => (
                    <div
                      key={receipt.id}
                      className="rounded-xl border border-border px-3 py-2 text-sm"
                    >
                      {receipt.id} · ${receipt.totalValue.toLocaleString()}
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
