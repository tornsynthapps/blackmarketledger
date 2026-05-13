"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Alert01Icon,
    CheckmarkCircle01Icon,
    Clock01Icon,
    Radar01Icon,
    RefreshIcon,
    Link01Icon,
    Analytics01Icon,
    CloudDownloadIcon,
    Calendar03Icon,
    Cancel01Icon,
    PlayIcon,
    Loading03Icon,
    Settings01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { SyncService, SyncState } from "@/lib/domain/SyncService";
import { Logger } from "@/lib/domain/Logger";

export default function AutoPilotV2Page() {
    const logger = useMemo(() => new Logger("AutoPilotV2"), []);
    const syncService = useMemo(() => new SyncService(), []);

    const [syncState, setSyncState] = useState<SyncState | null>(null);
    const [cursor, setCursor] = useState<{ lastTimestamp: number, lastLogId: string } | null>(null);
    const [initDate, setInitDate] = useState<string>("");
    const [syncWindow, setSyncWindow] = useState<number>(7);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeSidebarTab, setActiveSidebarTab] = useState<"origin" | "settings">("origin");

    const refreshState = useCallback(async () => {
        const [state, c, window] = await Promise.all([
            syncService.getSyncState(),
            syncService.getCursor(),
            syncService.getSyncWindowDays(),
        ]);
        setSyncState(state);
        setCursor(c);
        setSyncWindow(window);

        // If cursor is set but initDate is empty, sync it for the UI
        if (c.lastTimestamp > 0 && !initDate) {
            setInitDate(new Date(c.lastTimestamp * 1000).toISOString().slice(0, 16));
        }
    }, [syncService, initDate]);

    const handleUpdateWindow = async (val: string) => {
        const days = parseInt(val, 10);
        if (!isNaN(days) && days > 0) {
            setSyncWindow(days);
            await syncService.setSyncWindowDays(days);
        }
    };

    const isCursorEstablished = useMemo(() => {
        return !!cursor && cursor.lastTimestamp > 0;
    }, [cursor]);

    useEffect(() => {
        refreshState();
        const interval = setInterval(refreshState, 2000);
        return () => clearInterval(interval);
    }, [refreshState]);

    const handleStartSync = async () => {
        setIsProcessing(true);
        logger.info("Initializing new sync cycle.");
        try {
            await syncService.startV2Sync();
            await runSyncLoop();
        } catch (error) {
            logger.error("Failed to start sync cycle", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleContinueSync = async () => {
        setIsProcessing(true);
        logger.info("Continuing previous sync cycle.");
        try {
            await syncService.resumeV2Sync();
            await runSyncLoop();
        } catch (error) {
            logger.error("Failed to continue sync cycle", error);
        } finally {
            setIsProcessing(false);
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
        }
    };

    const handleInitialize = async () => {
        if (!initDate) {
            alert("Please select a date first.");
            return;
        }
        const timestamp = new Date(initDate).getTime();
        logger.info(`Manually resetting cursor origin to: ${new Date(timestamp).toLocaleString()}`);
        try {
            await syncService.initializeAutoPilot(timestamp);
            alert(`SUCCESS: Cursor initialized at ${new Date(timestamp).toLocaleString()}`);
            await refreshState();
        } catch (error) {
            logger.error("Manual cursor initialization failed", error);
            alert(`ERROR: ${(error as Error).message}`);
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

    return (
        <div className="min-h-screen text-foreground p-4 md:p-8 font-sans bg-background">
            <div className="max-w-5xl mx-auto space-y-12">
                {/* HEADER */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-border-strong">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3 text-muted">
                            <HugeiconsIcon icon={Radar01Icon} size={20} className="text-info" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Engine_V2 // Auto_Pilot</span>
                        </div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter italic">Operational_Interface</h1>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {syncState?.isActive ? (
                            <div className="px-8 py-3 border-2 border-warning text-warning text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                                <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" />
                                Sync_In_Progress
                            </div>
                        ) : syncState && syncState.steps.some(s => s.status === "failed" || s.status === "pending" && syncState.currentStepIndex > 0) ? (
                            <button 
                                onClick={handleContinueSync}
                                className="px-8 py-3 bg-info text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                <HugeiconsIcon icon={PlayIcon} size={16} />
                                Continue_Previous_Sync
                            </button>
                        ) : (
                            <button 
                                onClick={handleStartSync}
                                className="px-8 py-3 bg-foreground text-background text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                <HugeiconsIcon icon={RefreshIcon} size={16} />
                                Initialize_New_Sync
                            </button>
                        )}
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* LEFT: CONFIG */}
                    <div className="lg:col-span-1 space-y-8">
                        <section className="bg-panel/20 border-2 border-border-strong p-6 space-y-6 shadow-2xl relative overflow-hidden">
                            {/* SIDEBAR TABS */}
                            <div className="flex gap-2 border-b border-border-strong pb-4">
                                {(['origin', 'settings'] as const).map(tab => (
                                    <button 
                                        key={tab}
                                        onClick={() => setActiveSidebarTab(tab)}
                                        className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 transition-all ${activeSidebarTab === tab ? 'bg-foreground text-background' : 'text-muted hover:text-foreground'}`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            {activeSidebarTab === "origin" ? (
                                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
                                        <HugeiconsIcon icon={Calendar03Icon} size={14} />
                                        Temporal_Cursor
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-2 group">
                                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted">Initial_Origin</label>
                                            <input 
                                                type="datetime-local" 
                                                value={initDate}
                                                onChange={(e) => setInitDate(e.target.value)}
                                                disabled={isCursorEstablished || syncState?.isActive}
                                                className="w-full bg-background border-b-2 border-border-strong p-3 font-mono text-[10px] focus:border-foreground outline-none transition-all uppercase disabled:opacity-50"
                                            />
                                        </div>
                                        <button 
                                            onClick={handleInitialize}
                                            disabled={isCursorEstablished || syncState?.isActive}
                                            className="w-full py-3 border-2 border-foreground font-black uppercase text-[10px] tracking-[0.3em] hover:bg-foreground hover:text-background transition-all disabled:opacity-20 disabled:grayscale"
                                        >
                                            {isCursorEstablished ? 'Cursor_Established' : 'Set_Cursor_Origin'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
                                        <HugeiconsIcon icon={Settings01Icon} size={14} />
                                        Global_Settings
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-2 group">
                                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted">Sync_Window (Days)</label>
                                            <input 
                                                type="number" 
                                                min="1"
                                                max="3650"
                                                value={syncWindow}
                                                onChange={(e) => handleUpdateWindow(e.target.value)}
                                                disabled={syncState?.isActive}
                                                className="w-full bg-background border-b-2 border-border-strong p-3 font-mono text-[10px] focus:border-foreground outline-none transition-all uppercase"
                                            />
                                            <p className="text-[8px] text-muted leading-relaxed">
                                                Determines how many days of data to fetch per cycle. Larger windows may take longer to process.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        <section className="bg-panel/20 border-2 border-border-strong p-6 space-y-4 opacity-50">
                            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
                                <HugeiconsIcon icon={Analytics01Icon} size={14} />
                                System_Health
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-mono">
                                <span className="text-muted">Database:</span>
                                <span className="text-success">CONNECTED</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-mono">
                                <span className="text-muted">API_Status:</span>
                                <span className="text-success">STABLE</span>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT: SYNC STEPS */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest mb-6">
                            <HugeiconsIcon icon={CloudDownloadIcon} size={18} />
                            Sync_Chain_Status
                        </div>

                        {syncState?.steps.map((step, idx) => (
                            <div 
                                key={step.id} 
                                className={`p-5 border-2 transition-all flex flex-col gap-3 relative overflow-hidden ${getStatusColor(step.status)}`}
                            >
                                <div className="flex justify-between items-center z-10">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 flex items-center justify-center border-2 ${getStatusColor(step.status)}`}>
                                            <HugeiconsIcon icon={getStatusIcon(step.status)} size={16} />
                                        </div>
                                        <div>
                                            <div className="text-[12px] font-black uppercase tracking-widest">{idx + 1}. {step.label}</div>
                                            <div className="text-[9px] font-mono opacity-60 uppercase">{step.status.replace("-", "_")}</div>
                                        </div>
                                    </div>
                                    <div className="text-[11px] font-mono font-black">{step.progress}</div>
                                </div>

                                {step.error && (
                                    <div className="mt-2 p-3 bg-danger/10 border border-danger/20 text-[10px] font-mono text-danger animate-in fade-in slide-in-from-left-2">
                                        <div className="font-black uppercase mb-1 flex items-center gap-2">
                                            <HugeiconsIcon icon={Alert01Icon} size={12} />
                                            Protocol_Error:
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
                </div>
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
        </div>
    );
}
