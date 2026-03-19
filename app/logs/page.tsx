"use client";

import { useMemo, useState, useRef, Suspense } from "react";
import { useJournal } from "@/store/useJournal";
import { Download, Upload, Trash2, Edit2, Search, ArrowLeft, RefreshCw, Link2Off, CheckCircle2, Store, Tags } from "lucide-react";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Transaction, TransactionSourceType, formatItemName, FLOWER_SET, PLUSHIE_SET } from "@/lib/parser";
import { useHapticFeedback } from "@/lib/useHapticFeedback";

function getSourceLabel(sourceType?: TransactionSourceType) {
    if (sourceType === 'item-market') return 'Item Market';
    if (sourceType === 'bazaar') return 'Bazaar';
    if (sourceType === 'trade') return 'Trade';
    return '';
}

function inferSourceType(transaction: Transaction): TransactionSourceType | undefined {
    if (transaction.sourceType) return transaction.sourceType;
    if (transaction.tradeGroupId || transaction.weav3rReceiptId || transaction.tornLogId?.startsWith('trade:')) return 'trade';
    return undefined;
}

function LogsPageContent() {
    const { isLoaded, transactions, deleteLog, restoreData, editLog, refreshDriveCache, autoPilotRecentImports } = useJournal();
    const { vibrate } = useHapticFeedback();
    const searchParams = useSearchParams();
    const filterItem = searchParams.get('item');

    const [search, setSearch] = useState(filterItem || "");
    const [showLinkedIds, setShowLinkedIds] = useState(false);
    const [isRefreshingDrive, setIsRefreshingDrive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const storagePref = typeof window !== "undefined" ? localStorage.getItem("bml_storage_pref") : null;

    const filteredLogs = transactions
        .filter(t => {
            if (!search) return true;
            const term = search.toLowerCase();
            if (t.type === 'MUG') return 'mug'.includes(term);
            if (t.type === 'CONVERT') return t.fromItem.toLowerCase().includes(term) || t.toItem.toLowerCase().includes(term);
            if (t.type === 'SET_CONVERT') {
                if (t.setType.toLowerCase().includes(term) || 'set point'.includes(term)) return true;
                const itemsToSearch = t.setType === 'flower' ? FLOWER_SET : PLUSHIE_SET;
                return itemsToSearch.some(item => item.toLowerCase().includes(term));
            }
            if (t.item.toLowerCase().includes(term)) return true;
            if (!showLinkedIds) return false;
            return Boolean(
                t.tornLogId?.toLowerCase().includes(term) ||
                t.tradeGroupId?.toLowerCase().includes(term) ||
                t.weav3rReceiptId?.toLowerCase().includes(term)
            );
        })
        .sort((a, b) => b.date - a.date);

    const autoPilotActivity = useMemo(() => {
        return [...autoPilotRecentImports].sort((a, b) => b.timestamp - a.timestamp);
    }, [autoPilotRecentImports]);

    const unmatchedTrades = autoPilotActivity.filter(record => record.sourceType === 'trade' && record.status === 'manual_required');
    const successfulTrades = autoPilotActivity.filter(record => record.sourceType === 'trade' && record.status === 'imported');
    const itemMarketImports = autoPilotActivity.filter(record => record.sourceType === 'item-market');
    const bazaarImports = autoPilotActivity.filter(record => record.sourceType === 'bazaar');

    if (!isLoaded) return <div className="text-center py-20 animate-pulse text-foreground/50">Loading Tracker Data...</div>;

    const handleBackup = () => {
        const dataStr = JSON.stringify(transactions, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `torn-invest-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (Array.isArray(json)) {
                    if (confirm("Do you want to MERGE with current logs? Cancel will OVERWRITE completely.")) {
                        restoreData(json, true);
                    } else {
                        restoreData(json, false);
                    }
                    alert("Backup restored successfully.");
                }
            } catch (err) {
                alert("Invalid backup file.");
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const renderTransactionRow = (t: Transaction) => {
        const sourceType = inferSourceType(t);
        const sourceLabel = getSourceLabel(sourceType);
        return (
            <tr key={t.id} className="hover:bg-foreground/[0.02] transition-colors border-b border-border/50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/70">
                    {format(new Date(t.date), 'MMM d, yyyy HH:mm')}
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        {t.type === 'BUY' && <span className="text-primary font-medium bg-primary/10 px-2 py-1 rounded text-xs tracking-wider">BUY</span>}
                        {t.type === 'SELL' && <span className="text-success font-medium bg-success/10 px-2 py-1 rounded text-xs tracking-wider">SELL</span>}
                        {t.type === 'MUG' && <span className="text-danger font-medium bg-danger/10 px-2 py-1 rounded text-xs tracking-wider">MUG</span>}
                        {t.type === 'CONVERT' && <span className="text-primary font-medium bg-primary/10 px-2 py-1 rounded text-xs tracking-wider">CONVERT</span>}
                        {t.type === 'SET_CONVERT' && <span className="text-primary font-medium bg-primary/10 px-2 py-1 rounded text-xs tracking-wider">SET CONVERT</span>}
                        {t.tag === 'Abroad' && <span className="text-warning font-medium bg-warning/10 px-2 py-1 rounded text-xs tracking-wider">ABROAD</span>}
                    </div>
                </td>
                <td className="px-6 py-4">
                    <div className="font-medium">
                        {t.type === 'BUY' || t.type === 'SELL' ? formatItemName(t.item) : ''}
                        {t.type === 'CONVERT' ? `${formatItemName(t.fromItem)} → ${formatItemName(t.toItem)}` : ''}
                        {t.type === 'SET_CONVERT' ? `${t.times}x ${formatItemName(t.setType)} Set → ${t.pointsEarned} Points` : ''}
                        {t.type === 'MUG' ? 'Money' : ''}
                    </div>
                    {(sourceLabel || (showLinkedIds && (t.tornLogId || t.tradeGroupId || t.weav3rReceiptId))) && (
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-foreground/50">
                            {sourceLabel && (
                                <span className="rounded-full border border-border px-2 py-0.5 font-semibold uppercase tracking-wider">
                                    {sourceLabel}
                                </span>
                            )}
                            {showLinkedIds && t.tornLogId && <span>Torn: {t.tornLogId}</span>}
                            {showLinkedIds && t.tradeGroupId && <span>Trade: {t.tradeGroupId}</span>}
                            {showLinkedIds && t.weav3rReceiptId && <span>Receipt: {t.weav3rReceiptId}</span>}
                        </div>
                    )}
                </td>
                <td className="px-6 py-4 text-right">
                    {t.type === 'BUY' || t.type === 'SELL' ? t.amount.toLocaleString() : ''}
                    {t.type === 'CONVERT' ? `${t.fromAmount} → ${t.toAmount}` : ''}
                    {t.type === 'SET_CONVERT' ? `${t.times} sets` : ''}
                </td>
                <td className="px-6 py-4 text-right">
                    {t.type === 'BUY' || t.type === 'SELL' ? `$${t.price.toLocaleString()}` : ''}
                    {t.type === 'MUG' ? `-$${t.amount.toLocaleString()}` : ''}
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
                    {(t.type === 'BUY' || t.type === 'SELL') && (
                        <button
                            onClick={() => {
                                vibrate("utility");
                                const newPriceStr = prompt("Enter new price:", t.price.toString());
                                const newAmountStr = prompt("Enter new amount:", t.amount.toString());
                                if (newPriceStr !== null && newAmountStr !== null) {
                                    const newPrice = parseInt(newPriceStr, 10);
                                    const newAmount = parseInt(newAmountStr, 10);
                                    if (!isNaN(newPrice) && !isNaN(newAmount)) {
                                        vibrate("success");
                                        editLog(t.id, { price: newPrice, amount: newAmount });
                                    } else {
                                        vibrate("danger");
                                        alert("Invalid numbers provided.");
                                    }
                                }
                            }}
                            className="text-primary/70 hover:text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => {
                            vibrate("danger");
                            if (confirm("Delete this log?")) deleteLog(t.id);
                        }}
                        className="text-danger/70 hover:text-danger hover:bg-danger/10 p-2 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </td>
            </tr>
        );
    };

    return (
        <div
            className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{
                '--primary': '#8b5cf6', // Violet
            } as React.CSSProperties}
        >

            {filterItem && (
                <Link
                    href="/"
                    onClick={() => vibrate("nav")}
                    className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Link>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {filterItem ? `${formatItemName(filterItem)} Logs` : 'Manage Logs'}
                    </h1>
                    <p className="text-foreground/60 mt-2">View, edit, or delete specific transactions.</p>
                </div>

                <div className="flex gap-2">
                    {storagePref === 'drive' && (
                        <button
                            onClick={async () => {
                                setIsRefreshingDrive(true);
                                vibrate("utility");
                                try {
                                    await refreshDriveCache();
                                    vibrate("success");
                                } catch (error) {
                                    console.error("Force download failed", error);
                                    vibrate("danger");
                                    alert(error instanceof Error ? error.message : "Failed to download latest Drive data.");
                                } finally {
                                    setIsRefreshingDrive(false);
                                }
                            }}
                            disabled={isRefreshingDrive}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white shadow-sm rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-60"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshingDrive ? 'animate-spin' : ''}`} />
                            Force Download
                        </button>
                    )}
                    <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleRestore}
                    />
                    <button
                        onClick={() => {
                            vibrate("utility");
                            fileInputRef.current?.click();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-panel border border-border shadow-sm rounded-lg hover:bg-foreground/5 transition-colors text-sm font-medium"
                    >
                        <Upload className="w-4 h-4" /> Import Backup
                    </button>
                    <button
                        onClick={() => {
                            vibrate("success");
                            handleBackup();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground shadow-sm rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                        <Download className="w-4 h-4" /> Export Backup
                    </button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border bg-panel p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold"><Link2Off className="h-4 w-4 text-warning" /> Unlinked Trades</div>
                    <div className="mt-2 text-2xl font-bold">{unmatchedTrades.length}</div>
                    <p className="mt-1 text-xs text-foreground/55">Trades fetched but not imported because they were not linked exactly.</p>
                </div>
                <div className="rounded-xl border border-border bg-panel p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-success" /> Successful Trades</div>
                    <div className="mt-2 text-2xl font-bold">{successfulTrades.length}</div>
                    <p className="mt-1 text-xs text-foreground/55">Trades imported from matched Torn + Weav3r receipts.</p>
                </div>
                <div className="rounded-xl border border-border bg-panel p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold"><Tags className="h-4 w-4 text-primary" /> Item Market</div>
                    <div className="mt-2 text-2xl font-bold">{itemMarketImports.length}</div>
                    <p className="mt-1 text-xs text-foreground/55">Imported Item Market logs.</p>
                </div>
                <div className="rounded-xl border border-border bg-panel p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold"><Store className="h-4 w-4 text-primary" /> Bazaar</div>
                    <div className="mt-2 text-2xl font-bold">{bazaarImports.length}</div>
                    <p className="mt-1 text-xs text-foreground/55">Imported Bazaar logs.</p>
                </div>
            </div>

            <div className="bg-panel rounded-xl border border-border shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="p-4 border-b border-border bg-foreground/[0.02] flex items-center justify-between">
                    <h2 className="font-semibold">{filteredLogs.length} Transactions</h2>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-xs text-foreground/60">
                            <input
                                type="checkbox"
                                checked={showLinkedIds}
                                onChange={(event) => setShowLinkedIds(event.target.checked)}
                                className="rounded border-border"
                            />
                            Show Linked IDs
                        </label>
                        <div className="relative w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                            <input
                                type="text"
                                placeholder={showLinkedIds ? "Search items or IDs..." : "Search items..."}
                                value={search}
                                onChange={(e) => {
                                    if (!search && e.target.value) {
                                        vibrate("utility");
                                    }
                                    setSearch(e.target.value);
                                }}
                                className="w-full pl-9 pr-4 py-2 text-sm bg-panel border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase text-foreground/60 bg-foreground/5 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Action</th>
                                <th className="px-6 py-4">Item</th>
                                <th className="px-6 py-4 text-right">Qty</th>
                                <th className="px-6 py-4 text-right">Price/Loss</th>
                                <th className="px-6 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-foreground/50 italic">
                                        No logs found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map(renderTransactionRow)
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-panel rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border bg-foreground/[0.02]">
                    <h2 className="font-semibold">Auto-Pilot Activity</h2>
                    <p className="mt-1 text-sm text-foreground/55">Shows counted Bazaar and Item Market imports, plus linked and unlinked trades requiring manual input.</p>
                </div>
                <div className="divide-y divide-border/50">
                    {autoPilotActivity.length === 0 ? (
                        <div className="px-6 py-10 text-sm text-foreground/50 italic">No Auto-Pilot activity recorded yet.</div>
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <Tags className="h-4 w-4 text-primary" />
                                    <span className="font-medium">Item Market</span>
                                </div>
                                <div className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground/55">
                                    {itemMarketImports.length} logs imported
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <Store className="h-4 w-4 text-primary" />
                                    <span className="font-medium">Bazaar</span>
                                </div>
                                <div className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground/55">
                                    {bazaarImports.length} logs imported
                                </div>
                            </div>

                            {successfulTrades.map((record) => (
                                <div key={`${record.id}-${record.status}`} className="flex flex-wrap items-start justify-between gap-3 px-6 py-4">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-success" />
                                            <span className="font-medium">{record.title}</span>
                                            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/55">
                                                Trade
                                            </span>
                                        </div>
                                        <div className="mt-1 text-sm text-foreground/55">
                                            {format(new Date(record.timestamp * 1000), 'MMM d, yyyy HH:mm')}
                                            {record.tornLogId && ` · ${record.tornLogId}`}
                                            {record.weav3rReceiptId && ` · Receipt ${record.weav3rReceiptId}`}
                                        </div>
                                    </div>
                                    <div className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground/55">
                                        linked
                                    </div>
                                </div>
                            ))}

                            {unmatchedTrades.map((record) => (
                                <div key={`${record.id}-${record.status}`} className="flex flex-wrap items-start justify-between gap-3 px-6 py-4">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Link2Off className="h-4 w-4 text-warning" />
                                            <span className="font-medium">{record.title}</span>
                                            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/55">
                                                Trade
                                            </span>
                                        </div>
                                        <div className="mt-1 text-sm text-foreground/55">
                                            {format(new Date(record.timestamp * 1000), 'MMM d, yyyy HH:mm')}
                                            {record.tornLogId && ` · ${record.tornLogId}`}
                                            {record.weav3rReceiptId && ` · Receipt ${record.weav3rReceiptId}`}
                                        </div>
                                        {record.note && <div className="mt-1 text-sm text-foreground/60">{record.note}</div>}
                                    </div>
                                    <div className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground/55">
                                        manual input
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// Wrap inside Suspense boundary due to useSearchParams
export default function LogsPage() {
    return (
        <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
            <LogsPageContent />
        </Suspense>
    )
}
