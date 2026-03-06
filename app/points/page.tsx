"use client";

import { useJournal, InventoryItemStats } from "@/store/useJournal";
import { Coins, Droplet, ArrowRightLeft, TrendingUp } from "lucide-react";
import { useMemo } from "react";

const formatMoney = (val: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(val);
};

export default function PointsDashboard() {
    const { isLoaded, inventory } = useJournal();

    const { flushieStats, pointsStats } = useMemo(() => {
        return {
            flushieStats: inventory.get('Flushie') || { stock: 0, totalCost: 0, realizedProfit: 0 },
            pointsStats: inventory.get('Points') || { stock: 0, totalCost: 0, realizedProfit: 0 },
        };
    }, [inventory]);

    if (!isLoaded) return <div className="text-center py-20 animate-pulse text-foreground/50">Loading Tracker Data...</div>;

    const flushieAvg = flushieStats.stock > 0 ? flushieStats.totalCost / flushieStats.stock : 0;
    const pointsAvg = pointsStats.stock > 0 ? pointsStats.totalCost / pointsStats.stock : 0;

    // Total value in this specific dashboard
    const totalValue = Math.max(0, flushieStats.totalCost) + Math.max(0, pointsStats.totalCost);
    const totalProfit = flushieStats.realizedProfit + pointsStats.realizedProfit;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Points & Flushies</h1>
                    <p className="text-foreground/60 mt-2">Specialized dashboard for tracking flushie conversion runs and point sales.</p>
                </div>
                <div className="hidden sm:flex items-center justify-center p-4 bg-primary/10 rounded-full border border-primary/20">
                    <ArrowRightLeft className="w-8 h-8 text-primary" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Flushie Stock"
                    value={flushieStats.stock.toLocaleString()}
                    icon={<Droplet className="text-primary w-5 h-5" />}
                    description={`Avg Cost: ${formatMoney(flushieAvg)}`}
                />
                <StatCard
                    title="Points Stock"
                    value={pointsStats.stock.toLocaleString()}
                    icon={<Coins className="text-primary w-5 h-5" />}
                    description={`Avg Cost: ${formatMoney(pointsAvg)}`}
                />
                <StatCard
                    title="Combined Inventory Value"
                    value={formatMoney(totalValue)}
                    icon={<ArrowRightLeft className="text-primary w-5 h-5" />}
                    description="Total cost basis"
                />
                <StatCard
                    title="Realized Profit"
                    value={formatMoney(totalProfit)}
                    icon={<TrendingUp className="text-success w-5 h-5" />}
                    description="From selling Points & Flushies"
                    valueClass={totalProfit >= 0 ? "text-success" : "text-danger"}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">

                {/* Flushies Detail */}
                <div className="bg-panel rounded-xl border border-border shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <Droplet className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Flushies Ledger</h2>
                            <p className="text-sm text-foreground/60">Current unused items</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-border/50">
                            <span className="text-foreground/70">Total Invested (Cost)</span>
                            <span className="font-medium">{formatMoney(flushieStats.totalCost)}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-border/50">
                            <span className="text-foreground/70">Avg Cost Basis</span>
                            <span className="font-medium bg-foreground/5 px-2 py-1 rounded">{formatMoney(flushieAvg)}</span>
                        </div>
                        <div className="flex justify-between items-center py-3">
                            <span className="text-foreground/70">Profit from direct sales</span>
                            <span className={`font-bold ${flushieStats.realizedProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                                {formatMoney(flushieStats.realizedProfit)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Points Detail */}
                <div className="bg-panel rounded-xl border border-border shadow-sm p-6 relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 opacity-[0.03] pointer-events-none">
                        <Coins className="w-64 h-64" />
                    </div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <Coins className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Points Ledger</h2>
                            <p className="text-sm text-foreground/60">Converted inventory & sales</p>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                        <div className="flex justify-between items-center py-3 border-b border-border/50">
                            <span className="text-foreground/70">Cost Basis (From Flushies)</span>
                            <span className="font-medium">{formatMoney(pointsStats.totalCost)}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-border/50">
                            <span className="text-foreground/70">Avg Cost Per Point</span>
                            <span className="font-medium bg-foreground/5 px-2 py-1 rounded">{formatMoney(pointsAvg)}</span>
                        </div>
                        <div className="flex justify-between items-center py-3">
                            <span className="text-foreground/70">Profit from Point sales</span>
                            <span className={`font-bold ${pointsStats.realizedProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                                {formatMoney(pointsStats.realizedProfit)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({
    title, value, icon, description, valueClass = ""
}: {
    title: string, value: string, icon: React.ReactNode, description: string, valueClass?: string
}) {
    return (
        <div className="bg-panel p-6 rounded-xl border border-border flex flex-col justify-between hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-foreground/70">{title}</h3>
                {icon}
            </div>
            <div>
                <p className={`text-2xl font-bold tracking-tight ${valueClass}`}>{value}</p>
                <p className="text-xs text-foreground/50 mt-1">{description}</p>
            </div>
        </div>
    );
}
