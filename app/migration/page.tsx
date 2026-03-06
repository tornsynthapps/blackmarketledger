"use client";

import { useJournal } from "@/store/useJournal";
import { formatItemName, FLOWER_SET, PLUSHIE_SET, Transaction, ConvertTransaction } from "@/lib/parser";
import { useState, useMemo } from "react";
import { AlertCircle, Check, Database, RefreshCw, Dna } from "lucide-react";

export default function MigrationPage() {
    const { isLoaded, transactions, restoreData, inventory } = useJournal();
    const [status, setStatus] = useState<"idle" | "running" | "success">("idle");
    const [setMigrateStatus, setSetMigrateStatus] = useState<"idle" | "running" | "success">("idle");

    const [itemCounts, setItemCounts] = useState<Record<string, number>>({});

    const issues = useMemo(() => {
        return transactions.filter(t => {
            if (t.type === 'BUY' || t.type === 'SELL') {
                return t.item !== t.item.toLowerCase();
            }
            if (t.type === 'CONVERT') {
                return t.fromItem !== t.fromItem.toLowerCase() || t.toItem !== t.toItem.toLowerCase();
            }
            return false;
        });
    }, [transactions]);

    const handleMigrate = () => {
        if (!confirm("Are you sure you want to run this database migration? This modifies local storage directly.")) return;

        setStatus("running");
        setTimeout(() => {
            const migrated = transactions.map(t => {
                if (t.type === 'BUY' || t.type === 'SELL') {
                    return { ...t, item: t.item.toLowerCase() };
                }
                if (t.type === 'CONVERT') {
                    return { ...t, fromItem: t.fromItem.toLowerCase(), toItem: t.toItem.toLowerCase() };
                }
                return t;
            });

            restoreData(migrated, false);
            setStatus("success");
            setTimeout(() => setStatus("idle"), 3000);
        }, 1000);
    };

    const flushieStock = inventory.get('flushie')?.stock || 0;
    const requiredFlushies = Object.values(itemCounts).reduce((acc, curr) => acc + (curr || 0), 0);
    const isValidSetMigration = requiredFlushies > 0 && requiredFlushies <= flushieStock;

    const handleSetsMigrate = () => {
        if (!confirm("Are you sure you want to convert these flushies? This will inject new CONVERT logs into your database.")) return;

        setSetMigrateStatus("running");
        setTimeout(() => {
            const newLogs: ConvertTransaction[] = [];
            const tsBase = Date.now();

            let index = 0;
            Object.entries(itemCounts).forEach(([item, count]) => {
                if (count > 0) {
                    newLogs.push({
                        type: 'CONVERT',
                        id: crypto.randomUUID(),
                        date: tsBase + index,
                        fromItem: 'flushie',
                        toItem: item,
                        fromAmount: count,
                        toAmount: count
                    });
                    index++;
                }
            });

            restoreData([...transactions, ...newLogs], false);
            setSetMigrateStatus("success");
            setTimeout(() => {
                setSetMigrateStatus("idle");
                setItemCounts({});
            }, 3000);
        }, 1000);
    };

    if (!isLoaded) return <div className="text-center py-20 animate-pulse text-foreground/50">Loading Tracker Data...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Database Migration</h1>
                <p className="text-foreground/60 mt-2">Maintenance tools to keep your tracker's local data consistent.</p>
            </div>

            <div className="bg-panel border border-border p-6 rounded-xl space-y-4">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg text-primary shrink-0">
                        <Dna className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">Convert Legacy Flushies to Sets</h2>
                        <p className="text-sm text-foreground/70 mt-1 leading-relaxed">
                            If you have unused "flushies" tracked in your inventory, you can convert them directly into specific Flowers and Plushies here. This will inject 1:1 conversion logs directly into your history, perfectly migrating your running average costs to the new items.
                        </p>
                    </div>
                </div>

                <div className="bg-foreground/[0.02] border border-border p-4 rounded-xl mt-4">
                    <div className="flex justify-between items-center mb-6 border-b border-border/50 pb-4">
                        <span className="font-semibold text-foreground/80">Available Unused Flushies:</span>
                        <span className="text-xl font-bold text-primary">{flushieStock.toLocaleString()}</span>
                    </div>

                    <div className="space-y-6 mb-6">
                        <div>
                            <h3 className="font-medium mb-3">Flowers</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {FLOWER_SET.map(flower => (
                                    <div key={flower} className="bg-background border border-border rounded-lg p-2 flex flex-col gap-1 text-sm">
                                        <label className="text-foreground/80 truncate text-xs" title={formatItemName(flower)}>{formatItemName(flower)}</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={itemCounts[flower] || ''}
                                            onChange={(e) => setItemCounts(prev => ({ ...prev, [flower]: parseInt(e.target.value) || 0 }))}
                                            className="w-full px-2 py-1 bg-background border border-border/50 rounded focus:ring-1 focus:ring-primary/50 focus:outline-none"
                                            placeholder="0"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="font-medium mb-3">Plushies</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {PLUSHIE_SET.map(plushie => (
                                    <div key={plushie} className="bg-background border border-border rounded-lg p-2 flex flex-col gap-1 text-sm">
                                        <label className="text-foreground/80 truncate text-xs" title={formatItemName(plushie)}>{formatItemName(plushie)}</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={itemCounts[plushie] || ''}
                                            onChange={(e) => setItemCounts(prev => ({ ...prev, [plushie]: parseInt(e.target.value) || 0 }))}
                                            className="w-full px-2 py-1 bg-background border border-border/50 rounded focus:ring-1 focus:ring-primary/50 focus:outline-none"
                                            placeholder="0"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-4 border-t border-border/50">
                        <div className="text-sm">
                            <span className="text-foreground/60">Total Required: </span>
                            <span className={`font-semibold ${requiredFlushies > flushieStock ? 'text-danger' : 'text-foreground'}`}>
                                {requiredFlushies.toLocaleString()} flushies
                            </span>
                        </div>
                        <button
                            onClick={handleSetsMigrate}
                            disabled={!isValidSetMigration || setMigrateStatus === "running"}
                            className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg shadow-sm hover:bg-primary/90 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {setMigrateStatus === "running" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Dna className="w-4 h-4" />}
                            {setMigrateStatus === "running" ? "Converting..." : "Convert to Sets"}
                        </button>
                    </div>
                </div>

                {setMigrateStatus === "success" && (
                    <div className="text-sm font-medium text-success flex items-center gap-2 pt-2 animate-in fade-in">
                        <Check className="w-4 h-4" /> Successfully generated set items!
                    </div>
                )}
            </div>

            <div className="bg-panel border border-border p-6 rounded-xl space-y-4">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg text-primary shrink-0">
                        <Database className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">Standardize Item Names (v0.2.0)</h2>
                        <p className="text-sm text-foreground/70 mt-1 leading-relaxed">
                            Due to an update in how item names are parsed and rendered, older tracker logs might have inconsistent casing (e.g., "Six-Pack Of Alcohol" vs "six-pack of alcohol"). This script scans your database and forces all internal items strictly to lowercase.
                        </p>
                    </div>
                </div>

                <div className={`p-4 rounded-lg flex items-center justify-between border ${issues.length > 0 ? 'bg-danger/5 border-danger/20 text-danger' : 'bg-success/5 border-success/20 text-success'}`}>
                    <div className="flex items-center gap-2 font-medium">
                        {issues.length > 0 ? <AlertCircle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                        Found {issues.length} log{issues.length !== 1 ? 's' : ''} containing uppercase characters.
                    </div>
                </div>

                {issues.length > 0 && (
                    <div className="pt-2">
                        <button
                            onClick={handleMigrate}
                            disabled={status === "running"}
                            className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg shadow-sm hover:bg-primary/90 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {status === "running" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                            {status === "running" ? "Migrating..." : "Run Database Fix"}
                        </button>
                    </div>
                )}

                {status === "success" && (
                    <div className="text-sm font-medium text-success flex items-center gap-2 pt-2 animate-in fade-in">
                        <Check className="w-4 h-4" /> Migration complete! Your data is properly standardized.
                    </div>
                )}
            </div>

            {issues.length > 0 && (
                <div className="bg-foreground/[0.02] border border-border p-4 rounded-xl">
                    <h3 className="text-sm font-semibold mb-3">Items Flagged for Update preview:</h3>
                    <ul className="text-xs font-mono space-y-1 text-foreground/70">
                        {issues.slice(0, 10).map((t, i) => (
                            <li key={i}>
                                {t.type === 'BUY' || t.type === 'SELL' ? t.item : ''}
                                {t.type === 'CONVERT' ? `${t.fromItem} -> ${t.toItem}` : ''}
                            </li>
                        ))}
                        {issues.length > 10 && <li>...and {issues.length - 10} more.</li>}
                    </ul>
                </div>
            )}
        </div>
    );
}
