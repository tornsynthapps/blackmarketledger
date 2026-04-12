"use client";

import { useJournal } from "@/store/useJournal";
import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Cancel01Icon,
    Download01Icon,
    Alert01Icon,
    CheckmarkCircle01Icon,
    Delete02Icon,
    Database01Icon,
    RefreshIcon,
} from "@hugeicons/core-free-icons";
import { useHapticFeedback } from "@/lib/old/useHapticFeedback";

interface MigrationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MigrationModal({ isOpen, onClose }: MigrationModalProps) {
    const { transactions, getBMLDataCount, performBMLMigration, hasBMLDB } = useJournal();
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
        const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
        const exportFileDefaultName = `bml_backup_${new Date().toISOString().split("T")[0]}.json`;

        const linkElement = document.createElement("a");
        linkElement.setAttribute("href", dataUri);
        linkElement.setAttribute("download", exportFileDefaultName);
        linkElement.click();

        setHasExported(true);
    };

    const handleMigrate = async (type: "overwrite" | "none") => {
        if (
            type === "overwrite" &&
            !confirm(
                "This will REPLACE all your current data with the data from the old version. Are you sure?"
            )
        ) {
            return;
        }
        if (
            type === "none" &&
            !confirm(
                "This will permanently REMOVE your old data without migrating it. Are you sure?"
            )
        ) {
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
            <div className="bg-panel w-full max-w-lg border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 font-mono">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 border border-primary/20 bg-primary/5 text-primary">
                            <HugeiconsIcon icon={Database01Icon} size={20} />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-tighter">
                            Data Migration
                        </h2>
                    </div>
                    {!isMigrating && (
                        <button
                            onClick={onClose}
                            className="p-2 border border-border bg-background hover:bg-danger hover:text-white transition-all"
                            aria-label="Close"
                        >
                            <HugeiconsIcon icon={Cancel01Icon} size={20} />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border border-border bg-foreground/[0.02] space-y-2">
                            <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">
                                Old Stream (BMLDB)
                            </p>
                            <p className="text-2xl font-black tracking-tighter">
                                {bmlCount === null ? "..." : bmlCount.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-foreground/40 font-bold">
                                LOG_UNITS_DETECTED
                            </p>
                        </div>
                        <div className="p-4 border border-border bg-foreground/[0.02] space-y-2">
                            <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">
                                New Stream (LogsDB)
                            </p>
                            <p className="text-2xl font-black tracking-tighter">
                                {logsCount.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-foreground/40 font-bold">
                                CURRENT_STREAM_COUNT
                            </p>
                        </div>
                    </div>

                    <div className="bg-warning/5 border border-warning/20 p-4 flex gap-4">
                        <HugeiconsIcon
                            icon={Alert01Icon}
                            size={24}
                            className="text-warning shrink-0"
                        />
                        <div className="space-y-1">
                            <p className="text-xs font-black uppercase text-warning tracking-tight">
                                BACKUP_REQUIRED
                            </p>
                            <p className="text-[11px] text-foreground/60 leading-relaxed font-bold">
                                CRITICAL: DOWNLOAD ASYNC BACKUP BEFORE INITIATING STREAM MERGE.
                            </p>
                        </div>
                    </div>

                    {!hasExported ? (
                        <button
                            onClick={handleExport}
                            className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest text-xs border border-primary hover:bg-primary-dark transition-all flex items-center justify-center gap-3"
                        >
                            <HugeiconsIcon icon={Download01Icon} size={18} />
                            Download Current Backup
                        </button>
                    ) : (
                        <div className="bg-success/5 border border-success/20 p-4 flex items-center justify-center gap-3 text-success">
                            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} />
                            <span className="text-xs font-black uppercase tracking-widest">
                                BACKUP_COMPLETE
                            </span>
                        </div>
                    )}

                    <div className="space-y-3 pt-2">
                        <button
                            disabled={!hasExported || isMigrating}
                            onClick={() => handleMigrate("overwrite")}
                            className="w-full py-4 bg-primary text-white hover:bg-primary-dark disabled:opacity-30 disabled:cursor-not-allowed font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all border border-primary"
                        >
                            {isMigrating ? (
                                <HugeiconsIcon
                                    icon={RefreshIcon}
                                    size={18}
                                    className="animate-spin"
                                />
                            ) : (
                                <HugeiconsIcon icon={Database01Icon} size={18} />
                            )}
                            {isMigrating ? "MIGRATING..." : "Overwrite and Migrate All Data"}
                        </button>

                        <button
                            disabled={!hasExported || isMigrating}
                            onClick={() => handleMigrate("none")}
                            className="w-full py-4 bg-muted/10 hover:bg-muted/20 disabled:opacity-30 disabled:cursor-not-allowed font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-colors border border-border text-foreground/60"
                        >
                            <HugeiconsIcon icon={Delete02Icon} size={18} />
                            Skip Overwrite & Use LogsDB
                        </button>

                        <div className="space-y-1">
                            <p className="text-[9px] text-center text-foreground/30 px-6 uppercase tracking-widest font-black">
                                OVERWRITE: REPLACE CURRENT STREAM WITH LEGACY DATA
                            </p>
                            <p className="text-[9px] text-center text-foreground/30 px-6 uppercase tracking-widest font-black">
                                SKIP: PURGE LEGACY DATA AND MAINTAIN CURRENT STREAM
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
