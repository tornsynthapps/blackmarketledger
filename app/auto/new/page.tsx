"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Alert01Icon,
    CheckmarkCircle01Icon,
    Clock01Icon,
    PauseCircleIcon,
    Radar01Icon,
    RefreshIcon,
    Tag01Icon,
    Store01Icon,
    Coins01Icon,
    PackageIcon,
    Link01Icon,
    ArrowRight01Icon,
    ArrowDown01Icon,
    Analytics01Icon,
    CloudDownloadIcon,
    Airplane01Icon,
    PlayIcon,
    Calendar03Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { ItemLogService } from "@/lib/domain/ItemLogService";
import { TradeService } from "@/lib/domain/TradeService";
import { ReceiptService } from "@/lib/domain/ReceiptService";
import { SyncService } from "@/lib/domain/SyncService";
import { Trade } from "@/lib/objects/Trade";
import { ItemLog } from "@/lib/objects/ItemLog";
import { ItemLogWrapper } from "@/lib/objects/ItemLogWrapper";

export default function NewAutoPilotPage() {
    // Services
    const itemLogService = useMemo(() => new ItemLogService(), []);
    const tradeService = useMemo(() => new TradeService(), []);
    const receiptService = useMemo(() => new ReceiptService(), []);
    const syncService = useMemo(() => new SyncService(), []);

    // State
    const [trades, setTrades] = useState<Trade[]>([]);
    const [logs, setLogs] = useState<ItemLog[]>([]);
    const [wrappers, setWrappers] = useState<ItemLogWrapper[]>([]);
    const [cursor, setCursor] = useState<{ lastTimestamp: number, lastLogId: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState("");
    const [backgroundSyncStatus, setBackgroundSyncStatus] = useState("");
    const [initDate, setInitDate] = useState<string>("");

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [t, l, w, c] = await Promise.all([
                tradeService.getAllTrades(),
                itemLogService.getAllLogs(),
                itemLogService.getAllWrappers(),
                syncService.getCursor(),
            ]);
            setTrades(t);
            setLogs(l);
            setWrappers(w);
            setCursor(c);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            setStatusMessage("ERROR: Failed to load data from registry.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const unlinkedTrades = useMemo(() => {
        return trades.filter((t) => t.receipt_id === null);
    }, [trades]);

    const handleInitialize = async () => {
        if (!initDate) {
            alert("Please select a date first.");
            return;
        }
        const timestamp = new Date(initDate).getTime();
        setIsLoading(true);
        setStatusMessage(`Initializing auto-pilot from ${new Date(timestamp).toLocaleString()}...`);
        
        try {
            await syncService.initializeAutoPilot(timestamp);
            setStatusMessage(`SUCCESS: Cursor initialized. Next sync will start from this point.`);
            await fetchData();
        } catch (error) {
            setStatusMessage(`ERROR: Initialization failed: ${(error as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        setIsLoading(true);
        setStatusMessage("Starting global sync...");
        try {
            await syncService.startGlobalSync((msg) => setStatusMessage(msg));
            setStatusMessage("SUCCESS: Phase 1 sync completed. Background population starting...");
            
            // Start background sync
            syncService.runBackgroundSync((status) => setBackgroundSyncStatus(status))
                .then(() => fetchData())
                .catch(err => console.error("Background sync error:", err));

        } catch (error) {
            console.error(error);
            setStatusMessage(`ERROR: Sync failed: ${(error as Error).message}`);
        } finally {
            setIsLoading(false);
            await fetchData();
        }
    };

    return (
        <div className="min-h-screen text-foreground p-4 md:p-8 font-sans bg-background">
            {/* Background Sync Banner */}
            {backgroundSyncStatus && (
                <div className="fixed top-0 left-0 w-full z-[100] bg-info text-white p-2 text-center text-[10px] font-black uppercase tracking-[0.2em] shadow-lg animate-in fade-in slide-in-from-top-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-center gap-4">
                        <HugeiconsIcon icon={RefreshIcon} size={14} className="animate-spin" />
                        {backgroundSyncStatus}
                    </div>
                </div>
            )}
            <div className="max-w-7xl mx-auto space-y-8">
                {/* HEADER */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-border-strong">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3 text-muted">
                            <HugeiconsIcon icon={Radar01Icon} size={20} className="animate-pulse text-info" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Domain_Engine // V2.0</span>
                        </div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter italic">Auto_Pilot_New</h1>
                        {cursor && cursor.lastTimestamp > 0 && (
                            <div className="text-[9px] font-black uppercase tracking-widest text-muted">
                                Last_Sync: {new Date(cursor.lastTimestamp * 1000).toLocaleString()}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 p-1 bg-panel/30 border border-border-strong backdrop-blur-sm">
                            <input 
                                type="datetime-local" 
                                value={initDate}
                                onChange={(e) => setInitDate(e.target.value)}
                                className="bg-transparent text-[10px] font-black uppercase tracking-widest px-4 py-2 focus:outline-none"
                            />
                            <button 
                                onClick={handleInitialize}
                                className="px-6 py-2 bg-foreground text-background text-[10px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all"
                            >
                                Init_Cursor
                            </button>
                        </div>
                        <button 
                            onClick={handleSync}
                            disabled={isLoading}
                            className="px-8 py-3 bg-info text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                        >
                            <HugeiconsIcon icon={RefreshIcon} size={16} className={isLoading ? "animate-spin" : ""} />
                            Sync_Now
                        </button>
                    </div>
                </header>

                {/* STATUS BAR */}
                {statusMessage && (
                    <div className={`p-4 border-2 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 ${statusMessage.startsWith('ERROR') ? 'bg-danger/10 border-danger text-danger' : 'bg-info/10 border-info text-info'}`}>
                        <HugeiconsIcon icon={statusMessage.startsWith('ERROR') ? Alert01Icon : CheckmarkCircle01Icon} size={18} />
                        <span className="text-[11px] font-black uppercase tracking-widest font-mono">{statusMessage}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT: Stats & Unlinked Queue */}
                    <div className="lg:col-span-1 space-y-8">
                        <section className="bg-panel/20 border-2 border-border-strong p-6 space-y-6">
                            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
                                <HugeiconsIcon icon={Analytics01Icon} size={14} />
                                Engine_Stats
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 border border-border-strong bg-background/50">
                                    <div className="text-muted text-[9px] font-black uppercase tracking-widest mb-1">Trades</div>
                                    <div className="text-2xl font-black">{trades.length}</div>
                                </div>
                                <div className="p-4 border border-border-strong bg-background/50">
                                    <div className="text-muted text-[9px] font-black uppercase tracking-widest mb-1">Logs</div>
                                    <div className="text-2xl font-black">{logs.length}</div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-panel/20 border-2 border-border-strong p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
                                    <HugeiconsIcon icon={Link01Icon} size={14} className="text-warning" />
                                    Review_Queue
                                </div>
                                <div className="px-2 py-0.5 bg-warning/10 border border-warning text-warning text-[9px] font-black uppercase">
                                    {unlinkedTrades.length} Pending
                                </div>
                            </div>
                            
                            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                {unlinkedTrades.length === 0 ? (
                                    <div className="py-12 text-center border border-dashed border-border-strong opacity-40">
                                        <div className="text-[10px] font-black uppercase tracking-widest">No unlinked trades</div>
                                    </div>
                                ) : (
                                    unlinkedTrades.map((trade) => (
                                        <div key={trade.id} className="p-4 border border-border-strong bg-background/50 hover:border-foreground transition-all group">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="text-[10px] font-black uppercase tracking-widest">Torn_ID: {trade.torn_id}</div>
                                                <Link 
                                                    href={`/treasurechest/new-architecture?tab=trades-receipts`}
                                                    className="text-info opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <HugeiconsIcon icon={Link01Icon} size={14} />
                                                </Link>
                                            </div>
                                            <div className="flex items-center gap-2 text-[9px] text-muted uppercase font-bold tracking-wider">
                                                <HugeiconsIcon icon={Clock01Icon} size={10} />
                                                {new Date(trade.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    </div>

                    {/* RIGHT: Activity Feed */}
                    <div className="lg:col-span-2">
                        <section className="bg-background border-2 border-border-strong h-full shadow-2xl relative overflow-hidden flex flex-col">
                             <div className="h-12 border-b-2 border-border-strong flex items-center px-6 justify-between bg-panel/50 backdrop-blur-sm shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-border-strong" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-border-strong" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-border-strong" />
                                    </div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                                        <HugeiconsIcon icon={CloudDownloadIcon} size={14} />
                                        Live_Ingestion_Feed
                                    </div>
                                </div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-muted">
                                    Total_Records: {logs.length}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse table-auto border-spacing-0">
                                    <thead className="sticky top-0 z-10 bg-panel border-b border-border-strong">
                                        <tr className="text-[9px] font-black uppercase tracking-[0.3em] text-muted whitespace-nowrap">
                                            <th className="p-4 border-r border-border-strong/50">ID</th>
                                            <th className="p-4 border-r border-border-strong/50">Type</th>
                                            <th className="p-4 border-r border-border-strong/50">Item_ID</th>
                                            <th className="p-4 border-r border-border-strong/50 text-right">Quantity</th>
                                            <th className="p-4 border-r border-border-strong/50">Category</th>
                                            <th className="p-4">Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[10px] font-mono leading-none">
                                        {[...logs].sort((a,b) => b.timestamp - a.timestamp).slice(0, 100).map((log) => (
                                            <tr key={log.id} className="border-b border-border-strong/30 hover:bg-foreground/[0.02] transition-colors group">
                                                <td className="p-4 border-r border-border-strong/30 text-muted/60">{log.id}</td>
                                                <td className="p-4 border-r border-border-strong/30">
                                                    <span className={`px-2 py-0.5 border text-[8px] font-black uppercase ${log.quantity > 0 ? 'bg-success/10 border-success text-success' : 'bg-danger/10 border-danger text-danger'}`}>
                                                        {log.quantity > 0 ? 'BUY' : 'SELL'}
                                                    </span>
                                                </td>
                                                <td className="p-4 border-r border-border-strong/30">{log.item_id}</td>
                                                <td className={`p-4 border-r border-border-strong/30 text-right font-black ${log.quantity > 0 ? 'text-success' : 'text-danger'}`}>
                                                    {log.quantity.toLocaleString()}
                                                </td>
                                                <td className="p-4 border-r border-border-strong/30 italic text-muted">{log.category}</td>
                                                <td className="p-4 text-muted/50 font-sans tracking-tighter">{new Date(log.timestamp).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                    height: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #3a3a3f;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #f2f2f2;
                }
            `}</style>
        </div>
    );
}
