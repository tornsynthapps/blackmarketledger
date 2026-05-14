"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Alert01Icon,
    CheckmarkCircle01Icon,
    Clock01Icon,
    Radar01Icon,
    RefreshIcon,
    Cancel01Icon,
    PlayIcon,
    Loading03Icon,
    Delete02Icon,
    Analytics01Icon
} from "@hugeicons/core-free-icons";
import { SyncService, SyncState } from "@/lib/domain/SyncService";
import { Logger } from "@/lib/domain/Logger";
import { TradeService } from "@/lib/domain/TradeService";
import { ReceiptService } from "@/lib/domain/ReceiptService";

function formatCursor(cursor: { lastTimestamp: number } | null) {
    if (!cursor || cursor.lastTimestamp === 0)
        return {
            timeAgo: "Not initialized",
            timestamp: "",
            isStale: false,
            timeAgoStyle: "text-foreground/70",
        };

    const cursorTime = new Date(cursor.lastTimestamp * 1000);
    const timestamp = cursorTime.toLocaleString();
    const now = new Date();
    const diffMs = now.getTime() - cursorTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffSeconds = Math.floor(diffMs / 1000);

    let timeAgo: string;
    if (diffMinutes < 1) {
        timeAgo = `${diffSeconds}s ago`;
    } else if (diffMinutes < 60) {
        timeAgo = `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
        timeAgo = `${diffHours}h ago`;
    } else {
        const diffDays = Math.floor(diffHours / 24);
        timeAgo = `${diffDays}d ago`;
    }

    const isStale = diffMinutes > 30;
    const timeAgoStyle = isStale ? "text-orange-500 font-bold" : "text-foreground/70";

    return { timeAgo, timestamp, isStale, timeAgoStyle };
}

export default function AutoPilotV2Page() {
    const logger = useMemo(() => new Logger("AutoPilotV2"), []);
    const syncService = useMemo(() => new SyncService(), []);
    const tradeService = useMemo(() => new TradeService(), []);
    const receiptService = useMemo(() => new ReceiptService(), []);

    const [syncState, setSyncState] = useState<SyncState | null>(null);
    const [cursor, setCursor] = useState<{ lastTimestamp: number, lastLogId: string } | null>(null);
    
    const [unlinkedTradesCount, setUnlinkedTradesCount] = useState(0);
    const [unlinkedReceiptsCount, setUnlinkedReceiptsCount] = useState(0);

    const [isStopping, setIsStopping] = useState(false);
    const [showForceStop, setShowForceStop] = useState(false);
    const forceStopTimerRef = useRef<NodeJS.Timeout | null>(null);

    const refreshState = useCallback(async () => {
        const [state, c] = await Promise.all([
            syncService.getSyncState(),
            syncService.getCursor(),
        ]);
        setSyncState(state);
        setCursor(c);

        try {
            const trades = await tradeService.getAllTrades();
            const receipts = await receiptService.getAllReceipts();
            setUnlinkedTradesCount(trades.filter(t => t.receipt_id === null && t.sync_status === "complete").length);
            setUnlinkedReceiptsCount(receipts.filter(r => r.linked_trade_id === null && r.sync_status === "complete").length);
        } catch {
            // silent catch in case DB is not ready
        }
    }, [syncService, tradeService, receiptService]);

    useEffect(() => {
        refreshState();
        const interval = setInterval(refreshState, 2000);
        return () => {
            clearInterval(interval);
            if (forceStopTimerRef.current) clearTimeout(forceStopTimerRef.current);
        };
    }, [refreshState]);

    const clearForceStopTimer = () => {
        if (forceStopTimerRef.current) {
            clearTimeout(forceStopTimerRef.current);
            forceStopTimerRef.current = null;
        }
        setShowForceStop(false);
    };

    const handleStartSync = async () => {
        setIsStopping(false);
        clearForceStopTimer();
        logger.info("Initializing new sync cycle.");
        try {
            await syncService.startV2Sync();
            await runSyncLoop();
        } catch (error) {
            logger.error("Failed to start sync cycle", error);
        }
    };

    const handleContinueSync = async () => {
        setIsStopping(false);
        clearForceStopTimer();
        logger.info("Continuing previous sync cycle.");
        try {
            await syncService.resumeV2Sync();
            await runSyncLoop();
        } catch (error) {
            logger.error("Failed to continue sync cycle", error);
        }
    };

    const handleStopSync = () => {
        syncService.stopV2Sync();
        setIsStopping(true);
        
        if (forceStopTimerRef.current) clearTimeout(forceStopTimerRef.current);
        forceStopTimerRef.current = setTimeout(() => {
            setShowForceStop(true);
        }, 10000);
    };

    const handleForceStop = async () => {
        logger.warn("User initiated FORCE STOP.");
        await syncService.forceStopV2Sync();
        clearForceStopTimer();
        setIsStopping(false);
        await refreshState();
    };

    const handleInitialize = async () => {
        const timestamp = Date.now();
        logger.info(`Manually initializing cursor origin to current time.`);
        try {
            await syncService.initializeAutoPilot(timestamp);
            await refreshState();
        } catch (error) {
            logger.error("Manual cursor initialization failed", error);
            alert(`ERROR: ${(error as Error).message}`);
        }
    };

    const runSyncLoop = async () => {
        try {
            let state = await syncService.getSyncState();
            while (state.isActive) {
                const step = state.steps[state.currentStepIndex];
                if (step) {
                    logger.info(`Executing step: ${step.label}`);
                }
                state = await syncService.executeNextSyncStep();
                setSyncState(state);
            }
            logger.info("Sync chain finalized.");
        } catch (error) {
            logger.error("Global sync loop crash", error);
            const state = await syncService.getSyncState();
            state.isActive = false;
            await syncService.saveSyncState(state);
            setSyncState(state);
        } finally {
            setIsStopping(false);
            clearForceStopTimer();
            await refreshState();
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "complete": return "text-success border-success bg-success/5";
            case "in-progress": return "text-warning border-warning bg-warning/5 animate-pulse";
            case "failed": return "text-danger border-danger bg-danger/5";
            default: return "text-muted border-border-strong bg-panel/20 opacity-50";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "complete": return CheckmarkCircle01Icon;
            case "in-progress": return Loading03Icon;
            case "failed": return Alert01Icon;
            default: return Clock01Icon;
        }
    };

    const needsContinueSync = syncState && syncState.steps.some(s => s.status === "failed" || s.status === "pending" && syncState.currentStepIndex > 0);

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 p-4 md:p-8">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-orange-700 dark:text-orange-300">
                        <HugeiconsIcon icon={Radar01Icon} size={14} />
                        Auto-Pilot V2
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Automatic Torn log ingestion
                    </h1>
                    <p className="max-w-2xl text-sm text-foreground/65">
                        Sync Bazaar, Item Market, and linked trade receipts from the current cursor forward using the V2 engine.
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

            {/* Beta Warning Banner */}
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                <div className="flex items-start gap-3">
                    <HugeiconsIcon
                        icon={Alert01Icon}
                        size={20}
                        className="shrink-0 text-yellow-600 dark:text-yellow-400"
                    />
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                            Beta Feature (V2 Engine)
                        </p>
                        <p className="text-sm text-yellow-700/80 dark:text-yellow-300/80">
                            Auto-Pilot V2 is a completely redesigned sync engine. It operates in 5 discrete steps and allows for graceful interruption.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-4">
                    <section className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold">Sync Controls</h2>
                                <p className="text-sm text-foreground/55">
                                    First run initializes the cursor to the current time. Later runs continue from the last sync.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {syncState?.isActive ? (
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={handleStopSync}
                                            disabled={isStopping}
                                            className="px-4 py-2.5 rounded-xl border border-warning text-warning text-sm font-semibold flex items-center gap-2 hover:bg-warning hover:text-background transition-all disabled:opacity-50"
                                        >
                                            <HugeiconsIcon icon={isStopping ? Loading03Icon : Cancel01Icon} size={16} className={isStopping ? "animate-spin" : ""} />
                                            {isStopping ? "Stopping..." : "Stop Sync"}
                                        </button>
                                        {showForceStop && (
                                            <button 
                                                onClick={handleForceStop}
                                                className="px-4 py-2.5 rounded-xl bg-danger text-white text-sm font-semibold flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-in fade-in zoom-in duration-300"
                                            >
                                                <HugeiconsIcon icon={Delete02Icon} size={16} />
                                                Force Stop
                                            </button>
                                        )}
                                    </div>
                                ) : needsContinueSync ? (
                                    <button 
                                        onClick={handleContinueSync}
                                        className="inline-flex items-center gap-2 rounded-xl bg-info px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-95"
                                    >
                                        <HugeiconsIcon icon={PlayIcon} size={16} />
                                        Continue Sync
                                    </button>
                                ) : (!cursor || cursor.lastTimestamp === 0) ? (
                                    <button 
                                        onClick={handleInitialize}
                                        className="inline-flex items-center gap-2 rounded-xl border border-orange-500 text-orange-500 px-4 py-2.5 text-sm font-semibold transition-opacity hover:bg-orange-500/10"
                                    >
                                        <HugeiconsIcon icon={RefreshIcon} size={16} />
                                        Initialize Auto-Pilot
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleStartSync}
                                        className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-95"
                                    >
                                        <HugeiconsIcon icon={RefreshIcon} size={16} />
                                        Sync Now
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="mt-5">
                            <div className="rounded-xl border border-border bg-background/70 p-3">
                                <div className="text-xs font-bold uppercase tracking-wider text-foreground/55">
                                    Global Cursor
                                </div>
                                <div className="mt-2 text-sm">
                                    {(() => {
                                        const cursorInfo = formatCursor(cursor);
                                        if (cursorInfo.timestamp) {
                                            return (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-foreground/50 text-xs">
                                                        {cursorInfo.timestamp}
                                                    </span>
                                                    <span className={cursorInfo.timeAgoStyle}>
                                                        {cursorInfo.timeAgo}
                                                    </span>
                                                </div>
                                            );
                                        }
                                        return cursorInfo.timeAgo;
                                    })()}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
                        <h2 className="text-lg font-bold">Review Queue</h2>
                        <div className="mt-4 space-y-3 text-sm text-foreground/65">
                            <p>
                                {unlinkedTradesCount} unlinked trade
                                {unlinkedTradesCount === 1 ? "" : "s"} and {unlinkedReceiptsCount} unlinked receipt
                                {unlinkedReceiptsCount === 1 ? "" : "s"} are available in the cache for matching.
                            </p>
                            <p>
                                Note: Unlinked trades do not block the next sync in the V2 engine.
                            </p>
                        </div>
                        <Link
                            href="/auto/receipts"
                            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold text-foreground/75 shadow-sm transition-colors hover:bg-foreground/5 hover:text-foreground active:scale-[0.98]"
                        >
                            Open Receipt Review
                        </Link>
                    </section>
                </div>

                <section className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <HugeiconsIcon
                            icon={Analytics01Icon}
                            size={20}
                            className="text-orange-500"
                        />
                        <h2 className="text-xl font-bold">Sync Progress Steps</h2>
                    </div>

                    <div className="space-y-3">
                        {syncState?.steps.map((step, idx) => (
                            <div 
                                key={step.id} 
                                className={`p-4 rounded-xl border transition-all flex flex-col gap-2 relative overflow-hidden ${getStatusColor(step.status)}`}
                            >
                                <div className="flex justify-between items-center z-10">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${getStatusColor(step.status)}`}>
                                            <HugeiconsIcon icon={getStatusIcon(step.status)} size={16} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold tracking-tight">{idx + 1}. {step.label}</div>
                                            <div className="text-xs opacity-70 capitalize">{step.status.replace("-", " ")}</div>
                                        </div>
                                    </div>
                                    <div className="text-xs font-mono font-bold max-w-[40%] text-right truncate">
                                        {step.progress}
                                    </div>
                                </div>

                                {step.error && (
                                    <div className="mt-2 p-3 rounded-lg bg-danger/10 border border-danger/20 text-xs font-mono text-danger">
                                        <div className="font-bold uppercase mb-1 flex items-center gap-2">
                                            <HugeiconsIcon icon={Alert01Icon} size={12} />
                                            Protocol Error:
                                        </div>
                                        {step.error}
                                    </div>
                                )}

                                {step.status === "in-progress" && (
                                    <div className="absolute bottom-0 left-0 h-1 bg-warning animate-progress-flow" style={{ width: '100%' }} />
                                )}
                            </div>
                        ))}
                    </div>
                    
                    <style jsx global>{`
                        @keyframes progress-flow {
                            0% { transform: translateX(-100%); }
                            100% { transform: translateX(100%); }
                        }
                        .animate-progress-flow {
                            animation: progress-flow 2s infinite linear;
                        }
                    `}</style>
                </section>
            </div>

            <section className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
                <h2 className="text-lg font-bold">Rules In Effect (V2)</h2>
                <div className="mt-4 space-y-3 text-sm text-foreground/65">
                    <p>
                        Bazaar and Item Market logs are imported with the exact Torn log timestamp in a discrete step.
                    </p>
                    <p>
                        Metadata for trades and receipts is fetched before population to prevent redundant queries.
                    </p>
                    <p>
                        Trade receipts come from Torn `/user/trades` plus Weav3r receipts, and they
                        are automatically linked securely based on timestamp and matching items.
                    </p>
                    <p>
                        Execution can be gracefully interrupted after any step and resumed exactly where it left off.
                    </p>
                </div>
            </section>
        </div>
    );
}
