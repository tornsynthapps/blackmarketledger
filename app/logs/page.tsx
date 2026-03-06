"use client";

import { useState, useRef, Suspense } from "react";
import { useJournal } from "@/store/useJournal";
import { Download, Upload, Trash2, Edit2, Search, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Transaction, formatItemName, FLOWER_SET, PLUSHIE_SET } from "@/lib/parser";

function LogsPageContent() {
    const { isLoaded, transactions, deleteLog, restoreData, editLog } = useJournal();
    const searchParams = useSearchParams();
    const filterItem = searchParams.get('item');

    const [search, setSearch] = useState(filterItem || "");
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isLoaded) return <div className="text-center py-20 animate-pulse text-foreground/50">Loading Tracker Data...</div>;

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
            return t.item.toLowerCase().includes(term);
        })
        .sort((a, b) => b.date - a.date);

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
        return (
            <tr key={t.id} className="hover:bg-foreground/[0.02] transition-colors border-b border-border/50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/70">
                    {format(new Date(t.date), 'MMM d, yyyy HH:mm')}
                </td>
                <td className="px-6 py-4">
                    {t.type === 'BUY' && <span className="text-primary font-medium bg-primary/10 px-2 py-1 rounded">Buy</span>}
                    {t.type === 'SELL' && <span className="text-success font-medium bg-success/10 px-2 py-1 rounded">Sell</span>}
                    {t.type === 'MUG' && <span className="text-danger font-medium bg-danger/10 px-2 py-1 rounded">Mug</span>}
                    {t.type === 'CONVERT' && <span className="text-primary font-medium bg-primary/10 px-2 py-1 rounded">Convert</span>}
                    {t.type === 'SET_CONVERT' && <span className="text-primary font-medium bg-primary/10 px-2 py-1 rounded">Set Convert</span>}
                </td>
                <td className="px-6 py-4">
                    <div className="font-medium">
                        {t.type === 'BUY' || t.type === 'SELL' ? formatItemName(t.item) : ''}
                        {t.type === 'CONVERT' ? `${formatItemName(t.fromItem)} → ${formatItemName(t.toItem)}` : ''}
                        {t.type === 'SET_CONVERT' ? `${t.times}x ${formatItemName(t.setType)} Set → ${t.pointsEarned} Points` : ''}
                        {t.type === 'MUG' ? 'Money' : ''}
                    </div>
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
                                const newPriceStr = prompt("Enter new price:", t.price.toString());
                                const newAmountStr = prompt("Enter new amount:", t.amount.toString());
                                if (newPriceStr !== null && newAmountStr !== null) {
                                    const newPrice = parseInt(newPriceStr, 10);
                                    const newAmount = parseInt(newAmountStr, 10);
                                    if (!isNaN(newPrice) && !isNaN(newAmount)) {
                                        editLog(t.id, { price: newPrice, amount: newAmount });
                                    } else {
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {filterItem && (
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground transition-colors">
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
                    <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleRestore}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-panel border border-border shadow-sm rounded-lg hover:bg-foreground/5 transition-colors text-sm font-medium"
                    >
                        <Upload className="w-4 h-4" /> Import Backup
                    </button>
                    <button
                        onClick={handleBackup}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground shadow-sm rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                        <Download className="w-4 h-4" /> Export Backup
                    </button>
                </div>
            </div>

            <div className="bg-panel rounded-xl border border-border shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="p-4 border-b border-border bg-foreground/[0.02] flex items-center justify-between">
                    <h2 className="font-semibold">{filteredLogs.length} Transactions</h2>
                    <div className="relative w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                        <input
                            type="text"
                            placeholder="Search items..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-panel border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
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
