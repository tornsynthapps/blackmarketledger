"use client";

import { useJournal, InventoryItemStats } from "@/store/useJournal";
import { Coins, Droplet, ArrowRightLeft, TrendingUp, Flower2, Ghost, Box } from "lucide-react";
import { useMemo } from "react";
import { formatItemName, FLOWER_SET, PLUSHIE_SET } from "@/lib/parser";

const formatMoney = (val: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(val);
};

export default function MuseumDashboard() {
    const { isLoaded, inventory } = useJournal();

    const {
        flushieStats,
        pointsStats,
        flowersData,
        plushiesData,
        flowerSetsPossible,
        plushieSetsPossible,
        totalValue,
        totalProfit
    } = useMemo(() => {
        const flushieStats = inventory.get('flushie') || { stock: 0, totalCost: 0, realizedProfit: 0 };
        const pointsStats = inventory.get('points') || { stock: 0, totalCost: 0, realizedProfit: 0 };

        const flowersData = FLOWER_SET.map(name => ({ name, stats: inventory.get(name) || { stock: 0, totalCost: 0, realizedProfit: 0 } }));
        const plushiesData = PLUSHIE_SET.map(name => ({ name, stats: inventory.get(name) || { stock: 0, totalCost: 0, realizedProfit: 0 } }));

        const flowerSetsPossible = FLOWER_SET.length > 0 ? Math.min(...flowersData.map(f => f.stats.stock)) : 0;
        const plushieSetsPossible = PLUSHIE_SET.length > 0 ? Math.min(...plushiesData.map(p => p.stats.stock)) : 0;

        let itemsTotalCost = 0;
        let itemsRealizedProfit = 0;

        [...flowersData, ...plushiesData].forEach(item => {
            itemsTotalCost += Math.max(0, item.stats.totalCost);
            itemsRealizedProfit += item.stats.realizedProfit;
        });

        const totalValue = Math.max(0, flushieStats.totalCost) + Math.max(0, pointsStats.totalCost) + itemsTotalCost;
        const totalProfit = flushieStats.realizedProfit + pointsStats.realizedProfit + itemsRealizedProfit;

        return {
            flushieStats,
            pointsStats,
            flowersData,
            plushiesData,
            flowerSetsPossible,
            plushieSetsPossible,
            totalValue,
            totalProfit
        };
    }, [inventory]);

    if (!isLoaded) return <div className="text-center py-20 animate-pulse text-foreground/50">Loading Tracker Data...</div>;

    const flushieAvg = flushieStats.stock > 0 ? flushieStats.totalCost / flushieStats.stock : 0;
    const pointsAvg = pointsStats.stock > 0 ? pointsStats.totalCost / pointsStats.stock : 0;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Museum</h1>
                    <p className="text-foreground/60 mt-2">Specialized dashboard for tracking flushies, plushies, flowers, and point conversions.</p>
                </div>
                <div className="hidden sm:flex items-center justify-center p-4 bg-primary/10 rounded-full border border-primary/20">
                    <Box className="w-8 h-8 text-primary" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Points Stock"
                    value={pointsStats.stock.toLocaleString()}
                    icon={<Coins className="text-primary w-5 h-5" />}
                    description={`Avg Cost: ${formatMoney(pointsAvg)}`}
                />
                <StatCard
                    title="Flushie Stock"
                    value={flushieStats.stock.toLocaleString()}
                    icon={<Droplet className="text-primary w-5 h-5" />}
                    description={`Avg Cost: ${formatMoney(flushieAvg)}`}
                />
                <StatCard
                    title="Museum Inventory Value"
                    value={formatMoney(totalValue)}
                    icon={<Box className="text-primary w-5 h-5" />}
                    description="Total cost basis of sets & points"
                />
                <StatCard
                    title="Realized Profit"
                    value={formatMoney(totalProfit)}
                    icon={<TrendingUp className="text-success w-5 h-5" />}
                    description="From selling Museum items"
                    valueClass={totalProfit >= 0 ? "text-success" : "text-danger"}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                            <span className="text-foreground/70">Cost Basis (From Sets/Flushies)</span>
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

                {/* Flushies Detail */}
                <div className="bg-panel rounded-xl border border-border shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <Droplet className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Uncategorized Flushies</h2>
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
            </div>

            {/* Flowers Section */}
            <div className="bg-panel rounded-xl border border-border shadow-sm p-6 mt-8">
                <div className="flex items-center justify-between mb-6 border-b border-border/50 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <Flower2 className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Flower Sets</h2>
                            <p className="text-sm text-foreground/60">{Math.max(0, flowerSetsPossible)} complete sets ready to convert.</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {flowersData.map((item) => (
                        <ItemGridCard key={item.name} name={item.name} stats={item.stats} />
                    ))}
                </div>
            </div>

            {/* Plushies Section */}
            <div className="bg-panel rounded-xl border border-border shadow-sm p-6 mt-8">
                <div className="flex items-center justify-between mb-6 border-b border-border/50 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <Ghost className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Plushie Sets</h2>
                            <p className="text-sm text-foreground/60">{Math.max(0, plushieSetsPossible)} complete sets ready to convert.</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {plushiesData.map((item) => (
                        <ItemGridCard key={item.name} name={item.name} stats={item.stats} />
                    ))}
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

function ItemGridCard({ name, stats }: { name: string, stats: InventoryItemStats }) {
    const avgCost = stats.stock > 0 ? stats.totalCost / stats.stock : 0;
    return (
        <div className={`p-4 rounded-lg border ${stats.stock > 0 ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-background/50'}`}>
            <h4 className="font-semibold text-sm truncate" title={formatItemName(name)}>{formatItemName(name)}</h4>
            <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xs text-foreground/60">Stock:</span>
                <span className={`font-bold ${stats.stock > 0 ? "text-primary" : "text-foreground/50"}`}>{stats.stock}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs text-foreground/60">Avg Cost:</span>
                <span className="text-xs font-medium">{formatMoney(avgCost)}</span>
            </div>
        </div>
    );
}
