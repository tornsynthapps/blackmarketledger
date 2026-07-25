"use client";

import { useState, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    DatabaseIcon,
    PlayIcon,
    Loading03Icon,
    CheckmarkCircle01Icon,
    Alert01Icon,
    Calendar01Icon
} from "@hugeicons/core-free-icons";
import { PageHeader } from "@/components/PageHeader";
import { SyncService } from "@/lib/domain/SyncService";
import { Logger } from "@/lib/domain/Logger";

export default function AdvancedAutoPilotPage() {
    const logger = useMemo(() => new Logger("AdvancedAutoPilot"), []);
    const syncService = useMemo(() => new SyncService(), []);

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

    const handleRunIngest = async () => {
        if (!fromDate || !toDate) {
            setStatus({ type: "error", message: "PLEASE_SELECT_BOTH_DATES" });
            return;
        }

        const fromTs = Math.floor(new Date(fromDate).getTime() / 1000);
        const toTs = Math.floor(new Date(toDate).getTime() / 1000);

        if (toTs <= fromTs) {
            setStatus({ type: "error", message: "END_DATE_MUST_BE_AFTER_START_DATE" });
            return;
        }

        setIsLoading(true);
        setStatus({ type: "info", message: "INGESTION_IN_PROGRESS..." });
        logger.info(`Starting manual ingest from ${fromDate} to ${toDate}`);

        try {
            const result = await syncService.runAdvancedStep1(fromTs, toTs);
            setStatus({ 
                type: "success", 
                message: `INGESTION_COMPLETE. NEXT_CURSOR: ${new Date(result.nextCursor.lastTimestamp * 1000).toLocaleString()}` 
            });
            logger.info("Manual ingest completed successfully.");
        } catch (error: any) {
            const errorMsg = error.message || "UNKNOWN_ERROR";
            setStatus({ type: "error", message: `FAILED: ${errorMsg}` });
            logger.error("Manual ingest failed", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-20">
            <PageHeader 
                title="Advanced Auto-Pilot" 
                icon={DatabaseIcon} 
                description="Manually trigger Step 1 (Log Ingestion) for specific historical windows."
            />

            <section className="bg-panel/20 border-2 border-border-strong p-6 shadow-xl space-y-6">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted mb-2">
                    <span className="w-2 h-2 bg-warning animate-pulse" />
                    Ingestion_Parameters
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted">
                            <HugeiconsIcon icon={Calendar01Icon} size={12} />
                            From_Date_Time
                        </label>
                        <input 
                            type="datetime-local"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="w-full bg-background border-b-2 border-border-strong px-4 py-3 text-sm font-mono focus:border-foreground outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted">
                            <HugeiconsIcon icon={Calendar01Icon} size={12} />
                            To_Date_Time
                        </label>
                        <input 
                            type="datetime-local"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="w-full bg-background border-b-2 border-border-strong px-4 py-3 text-sm font-mono focus:border-foreground outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button 
                        onClick={handleRunIngest}
                        disabled={isLoading || !fromDate || !toDate}
                        className="flex items-center justify-center gap-3 w-full py-4 bg-foreground text-background text-xs font-black uppercase tracking-[0.2em] hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-20 disabled:grayscale group"
                    >
                        {isLoading ? (
                            <HugeiconsIcon icon={Loading03Icon} className="animate-spin" size={18} />
                        ) : (
                            <HugeiconsIcon icon={PlayIcon} className="group-hover:translate-x-1 transition-transform" size={18} />
                        )}
                        {isLoading ? "Ingesting_Logs..." : "Execute_Manual_Ingest"}
                    </button>
                </div>
            </section>

            {status && (
                <div className={`p-4 border-2 flex items-start gap-4 animate-in slide-in-from-top-2 duration-300 ${
                    status.type === "success" ? "bg-success/10 border-success text-success" : 
                    status.type === "error" ? "bg-error/10 border-error text-error" : 
                    "bg-info/10 border-info text-info"
                }`}>
                    <div className="mt-1">
                        {status.type === "success" ? (
                            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} />
                        ) : status.type === "error" ? (
                            <HugeiconsIcon icon={Alert01Icon} size={20} />
                        ) : (
                            <HugeiconsIcon icon={Loading03Icon} className="animate-spin" size={20} />
                        )}
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-black uppercase tracking-widest">
                            System_Response
                        </div>
                        <div className="text-sm font-mono break-all font-bold">
                            {status.message}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-panel/10 border border-border-strong p-6 rounded-xl space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                    <HugeiconsIcon icon={Alert01Icon} size={14} className="text-warning" />
                    Important_Notice
                </div>
                <div className="text-xs text-foreground/70 leading-relaxed space-y-2 font-medium">
                    <p>
                        This tool bypasses the standard Auto-Pilot safety checks and cursor management. 
                        It is intended for <strong>advanced troubleshooting</strong> or <strong>historical backfilling</strong> only.
                    </p>
                    <p>
                        Ingesting logs for a period that has already been synced will not create duplicates (due to de-duplication logic), 
                        but it will consume API calls and processing power.
                    </p>
                    <p>
                        <strong>Note:</strong> This page only executes Step 1 (Ingestion). You may need to manually trigger Step 6 (Recalculate) 
                        on the main Auto-Pilot page or in the Activity Log to reflect these changes in your cost basis.
                    </p>
                </div>
            </div>
        </div>
    );
}
