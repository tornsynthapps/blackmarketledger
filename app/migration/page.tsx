"use client";

import { useJournal } from "@/store/useJournal";
import { formatItemName } from "@/lib/parser";
import { useState, useMemo } from "react";
import { AlertCircle, Check, Database, RefreshCw } from "lucide-react";

export default function MigrationPage() {
    const { isLoaded, transactions, restoreData } = useJournal();
    const [status, setStatus] = useState<"idle" | "running" | "success">("idle");

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

            // Rewrite local storage fully with the lowercased objects
            restoreData(migrated, false);
            setStatus("success");

            setTimeout(() => setStatus("idle"), 3000);
        }, 1000); // UI breathing room
    };

    if (!isLoaded) return <div className="text-center py-20 animate-pulse text-foreground/50">Loading Tracker Data...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Database Migration</h1>
                <p className="text-foreground/60 mt-2">Maintenance tools to keep your tracker's local data consistent.</p>
            </div>

            <div className="bg-panel border border-border p-6 rounded-xl space-y-4">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg text-primary">
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
