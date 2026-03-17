"use client";

import { useJournal } from "@/store/useJournal";
import { useState, useEffect } from "react";
import { X, Download, AlertTriangle, CheckCircle2, Trash2, Database, RefreshCw } from "lucide-react";
import { useHapticFeedback } from "@/lib/useHapticFeedback";

interface MigrationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MigrationModal({ isOpen, onClose }: MigrationModalProps) {
    const { 
        transactions, 
        getBMLDataCount, 
        performBMLMigration,
        hasBMLDB
    } = useJournal();
    const { vibrate } = useHapticFeedback();

    const [bmlCount, setBmlCount] = useState<number | null>(null);
    const [logsCount, setLogsCount] = useState<number>(transactions.length);
    const [hasExported, setHasExported] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            getBMLDataCount().then(setBmlCount);
            setLogsCount(transactions.length);
        }
    }, [isOpen, getBMLDataCount, transactions.length]);

    if (!isOpen) return null;

    const handleExport = () => {
        vibrate("success");
        const dataStr = JSON.stringify(transactions, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `bml_backup_${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        setHasExported(true);
    };

    const handleMigrate = async (type: 'overwrite' | 'none') => {
        if (type === 'overwrite' && !confirm("This will REPLACE all your current data with the data from the old version. Are you sure?")) {
            return;
        }
        if (type === 'none' && !confirm("This will permanently REMOVE your old data without migrating it. Are you sure?")) {
            return;
        }

        vibrate("success");
        setIsMigrating(true);
        try {
            await performBMLMigration(type);
            onClose();
        } catch (error) {
            console.error("Migration failed", error);
            alert("Migration failed. Please try again.");
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-panel w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Database className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold">Data Migration</h2>
                    </div>
                    {!isMigrating && (
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-foreground/5 rounded-full transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-border bg-foreground/[0.02] space-y-2">
                            <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">Old Version (BMLDB)</p>
                            <p className="text-2xl font-bold font-mono">
                                {bmlCount === null ? "..." : bmlCount.toLocaleString()}
                            </p>
                            <p className="text-xs text-foreground/40">Logs detected</p>
                        </div>
                        <div className="p-4 rounded-xl border border-border bg-foreground/[0.02] space-y-2">
                            <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">New Version (LogsDB)</p>
                            <p className="text-2xl font-bold font-mono">
                                {logsCount.toLocaleString()}
                            </p>
                            <p className="text-xs text-foreground/40">Current logs</p>
                        </div>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-4">
                        <AlertTriangle className="w-6 h-6 text-yellow-600 shrink-0" />
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-500">Backup Required</p>
                            <p className="text-sm text-yellow-600/80 leading-relaxed">
                                To protect your data, you must download a backup of your current logs before proceeding with the migration.
                            </p>
                        </div>
                    </div>

                    {!hasExported ? (
                        <button
                            onClick={handleExport}
                            className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:bg-primary/90 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                            <Download className="w-5 h-5" />
                            Download Current Backup
                        </button>
                    ) : (
                        <div className="bg-success/10 border border-success/20 rounded-xl p-4 flex items-center justify-center gap-2 text-success">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-semibold">Backup Complete</span>
                        </div>
                    )}

                    <div className="space-y-3 pt-2">
                        <button
                            disabled={!hasExported || isMigrating}
                            onClick={() => handleMigrate('overwrite')}
                            className="w-full py-4 bg-foreground/5 hover:bg-foreground/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl font-bold flex items-center justify-center gap-3 transition-colors text-primary"
                        >
                            {isMigrating ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                                <Database className="w-5 h-5" />
                            )}
                            {isMigrating ? "Migrating..." : "Overwrite and Migrate All Data"}
                        </button>
                        
                        <p className="text-[10px] text-center text-foreground/30 px-6 uppercase tracking-widest font-bold">
                            Warning: This will permanently replace current data and remove BMLDB
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
