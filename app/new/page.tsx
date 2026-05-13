"use client";

import { useEffect, useState, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    ArrowUp02Icon,
    PackageSearchIcon,
    AlertCircleIcon,
    Activity01Icon,
    PencilEdit02Icon,
    ArrowUpDownIcon,
    ArrowUp01Icon,
    ArrowDown01Icon,
    Search01Icon,
    Coins01Icon,
    CheckmarkCircle01Icon,
    Book01Icon,
    ArrowRight01Icon,
    ArrowLeft01Icon,
    StarIcon,
    Layout01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { ItemLogService } from "@/lib/domain/ItemLogService";
import { TradeService } from "@/lib/domain/TradeService";
import { ItemLog } from "@/lib/objects/ItemLog";
import { Trade } from "@/lib/objects/Trade";
import { ProfitChart } from "@/components/ProfitChart";
import { PointsIcon } from "@/components/PointsIcon";
import { ItemSetIcon } from "@/components/ItemSetIcon";

export default function NewDashboardPage() {
    const itemLogService = useMemo(() => new ItemLogService(), []);
    const tradeService = useMemo(() => new TradeService(), []);

    const [logs, setLogs] = useState<ItemLog[]>([]);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [l, t] = await Promise.all([
                itemLogService.getAllLogs(),
                tradeService.getAllTrades(),
            ]);
            setLogs(l);
            setTrades(t);
        } catch (error) {
            console.error("Dashboard fetch failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Derived Data
    const inventory = useMemo(() => {
        const map = new Map<number, { stock: number; totalCost: number; realizedProfit: number }>();
        logs.forEach(log => {
            const current = map.get(log.item_id) || { stock: 0, totalCost: 0, realizedProfit: 0 };
            // Since we use the domain model, total_stock and total_cost in the latest log is the state.
            // But we can also aggregate.
            // Actually, the most reliable way in the new architecture is to look at the LATEST log per item.
        });
        
        // Let's aggregate for simplicity in this prototype.
        const stats: Record<number, { stock: number; cost: number; profit: number }> = {};
        logs.forEach(log => {
            if (!stats[log.item_id]) stats[log.item_id] = { stock: 0, cost: 0, profit: 0 };
            stats[log.item_id].stock += log.quantity;
            stats[log.item_id].profit += log.realized_profit || 0;
            // Total cost is trickier to aggregate this way, we'd normally use latest totals.
        });
        return stats;
    }, [logs]);

    const totalProfit = useMemo(() => {
        return logs.reduce((sum, log) => sum + (log.realized_profit || 0), 0);
    }, [logs]);

    const formatMoney = (val: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
        }).format(val);
    };

    return (
        <div className="min-h-screen text-foreground p-4 md:p-8 font-sans bg-background">
            <div className="max-w-full mx-auto space-y-12">
                {/* TOP BAR */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-border-strong">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3 text-muted">
                            <HugeiconsIcon icon={Layout01Icon} size={20} className="text-info" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Domain_Metrics // V2.0</span>
                        </div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter italic">Ledger_Dashboard_New</h1>
                    </div>

                    <div className="flex gap-4">
                        <div className="text-right">
                            <div className="text-[9px] font-black uppercase tracking-widest text-muted mb-1">Lifetime_Profit</div>
                            <div className={`text-3xl font-black italic tracking-tighter ${totalProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                                {formatMoney(totalProfit)}
                            </div>
                        </div>
                    </div>
                </header>

                {/* SUMMARY CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: "Active_Trades", value: trades.length, icon: ArrowUpDownIcon, color: "text-info" },
                        { label: "Total_Logs", value: logs.length, icon: Activity01Icon, color: "text-warning" },
                        { label: "Items_In_Stock", value: Object.values(inventory).filter(i => i.stock > 0).length, icon: PackageSearchIcon, color: "text-success" },
                        { label: "Net_Realized", value: formatMoney(totalProfit), icon: Coins01Icon, color: "text-info" },
                    ].map((card, i) => (
                        <div key={i} className="bg-panel/20 border-2 border-border-strong p-6 space-y-4 hover:border-foreground transition-all">
                            <div className="flex items-center justify-between">
                                <HugeiconsIcon icon={card.icon} size={20} className={card.color} />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted">{card.label}</span>
                            </div>
                            <div className="text-3xl font-black tracking-tighter">{card.value}</div>
                        </div>
                    ))}
                </div>

                {/* INVENTORY TABLE */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest">
                            <HugeiconsIcon icon={Activity01Icon} size={16} />
                            Inventory_Registry
                        </div>
                        <div className="relative">
                            <HugeiconsIcon icon={Search01Icon} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                            <input 
                                type="text"
                                placeholder="Filter_Registry..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-panel/30 border border-border-strong text-[10px] font-black uppercase tracking-widest pl-10 pr-4 py-2 w-64 focus:border-foreground focus:outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="bg-background border-2 border-border-strong shadow-2xl relative overflow-hidden">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse table-auto border-spacing-0">
                                <thead>
                                    <tr className="bg-panel border-b-2 border-border-strong text-[9px] font-black uppercase tracking-[0.3em] text-muted">
                                        <th className="p-4 border-r border-border-strong/50">Item_ID</th>
                                        <th className="p-4 border-r border-border-strong/50 text-right">Current_Stock</th>
                                        <th className="p-4 text-right">Realized_Profit</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[10px] font-mono leading-none">
                                    {Object.entries(inventory)
                                        .filter(([id]) => id.includes(search))
                                        .sort(([,a], [,b]) => b.stock - a.stock)
                                        .map(([id, data]) => (
                                        <tr key={id} className="border-b border-border-strong/30 hover:bg-foreground/[0.02] transition-colors group">
                                            <td className="p-4 border-r border-border-strong/30 text-muted/60">{id}</td>
                                            <td className={`p-4 border-r border-border-strong/30 text-right font-black ${data.stock > 0 ? 'text-foreground' : 'text-muted/40'}`}>
                                                {data.stock.toLocaleString()}
                                            </td>
                                            <td className={`p-4 text-right font-black ${data.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                                                {formatMoney(data.profit)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
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
