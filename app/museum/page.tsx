"use client";

import { useJournal, InventoryItemStats } from "@/store/useJournal";
import { Coins, Droplet, ArrowRightLeft, TrendingUp, Flower2, Ghost, Box } from "lucide-react";
import { useMemo } from "react";
import { formatItemName, FLOWER_SET, PLUSHIE_SET, Transaction } from "@/lib/parser";
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer 
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const formatMoney = (val: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(val);
};

export default function MuseumDashboard() {
    const { isLoaded, inventory, transactions } = useJournal();

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
        const defaultStats = { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
        const flushieStats = inventory.get('flushie') || defaultStats;
        const pointsStats = inventory.get('points') || defaultStats;

        const flowersData = FLOWER_SET.map(name => ({ name, stats: inventory.get(name) || defaultStats }));
        const plushiesData = PLUSHIE_SET.map(name => ({ name, stats: inventory.get(name) || defaultStats }));

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

    const chartData = useMemo(() => {
        if (!isLoaded || !transactions.length) return [];

        const now = new Date();
        const periods = Array.from({ length: 30 }, (_, i) => subDays(now, 29 - i));
        
        // Use the same sort logic as StatsModal to ensure consistent calculation
        const sortedTransactions = [...transactions].sort((a, b) => {
            if (a.date !== b.date) return a.date - b.date;
            return (a.type === 'BUY' ? 0 : 1) - (b.type === 'BUY' ? 0 : 1);
        });

        const tempInventory = new Map<string, any>();
        let transactionIndex = 0;
        
        return periods.map(period => {
            const periodEnd = endOfDay(startOfDay(period));

            while (transactionIndex < sortedTransactions.length && sortedTransactions[transactionIndex].date <= periodEnd.getTime()) {
                const t = sortedTransactions[transactionIndex];
                
                // Simplified applyTransaction for Point Profit calculation
                if (t.type === 'BUY') {
                    const current = tempInventory.get(t.item) || { stock: 0, totalCost: 0, realizedProfit: 0 };
                    current.stock += t.amount;
                    current.totalCost += (t.price * t.amount);
                    tempInventory.set(t.item, current);
                } else if (t.type === 'SELL') {
                    const current = tempInventory.get(t.item) || { stock: 0, totalCost: 0, realizedProfit: 0 };
                    const avgCostBasis = current.stock > 0 ? (current.totalCost / current.stock) : 0;
                    const costOfGoodsSold = avgCostBasis * t.amount;
                    current.stock -= t.amount;
                    current.totalCost -= costOfGoodsSold;
                    current.realizedProfit += (t.price * t.amount - costOfGoodsSold);
                    tempInventory.set(t.item, current);
                } else if (t.type === 'CONVERT') {
                    const fromCurr = tempInventory.get(t.fromItem) || { stock: 0, totalCost: 0, realizedProfit: 0 };
                    const fromAvgCost = fromCurr.stock > 0 ? (fromCurr.totalCost / fromCurr.stock) : 0;
                    const fromCostOfGoods = fromAvgCost * t.fromAmount;
                    fromCurr.stock -= t.fromAmount;
                    fromCurr.totalCost -= fromCostOfGoods;
                    tempInventory.set(t.fromItem, fromCurr);

                    const toCurr = tempInventory.get(t.toItem) || { stock: 0, totalCost: 0, realizedProfit: 0 };
                    toCurr.stock += t.toAmount;
                    toCurr.totalCost += fromCostOfGoods;
                    tempInventory.set(t.toItem, toCurr);
                } else if (t.type === 'SET_CONVERT') {
                    const setItems = t.setType === 'flower' ? FLOWER_SET : PLUSHIE_SET;
                    let totalCostOfGoods = 0;
                    setItems.forEach(item => {
                        const curr = tempInventory.get(item) || { stock: 0, totalCost: 0, realizedProfit: 0 };
                        const avgCost = curr.stock > 0 ? (curr.totalCost / curr.stock) : 0;
                        const costOfGoods = avgCost * t.times;
                        curr.stock -= t.times;
                        curr.totalCost -= costOfGoods;
                        tempInventory.set(item, curr);
                        totalCostOfGoods += costOfGoods;
                    });
                    const pointsCurr = tempInventory.get('points') || { stock: 0, totalCost: 0, realizedProfit: 0 };
                    pointsCurr.stock += t.pointsEarned;
                    pointsCurr.totalCost += totalCostOfGoods;
                    tempInventory.set('points', pointsCurr);
                }
                
                transactionIndex += 1;
            }

            const pointsEntry = tempInventory.get('points') || { realizedProfit: 0 };
            return {
                date: format(period, 'MMM dd'),
                profit: Math.round(pointsEntry.realizedProfit)
            };
        });
    }, [isLoaded, transactions]);

    if (!isLoaded) return <div className="text-center py-20 animate-pulse text-foreground/50">Loading Tracker Data...</div>;

    const pointsAvg = pointsStats.stock > 0 ? pointsStats.totalCost / pointsStats.stock : 0;

    return (
        <div
            className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10"
            style={{
                '--primary': '#f59e0b', // Amber
            } as React.CSSProperties}
        >
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
                    title="Flower Stock"
                    value={flowersData.reduce((acc, curr) => acc + curr.stats.stock, 0).toLocaleString()}
                    icon={<Flower2 className="text-primary w-5 h-5" />}
                    description="Total flowers acquired"
                />
                <StatCard
                    title="Plushie Stock"
                    value={plushiesData.reduce((acc, curr) => acc + curr.stats.stock, 0).toLocaleString()}
                    icon={<Ghost className="text-primary w-5 h-5" />}
                    description="Total plushies acquired"
                />
                <StatCard
                    title="Museum Inventory Value"
                    value={formatMoney(totalValue)}
                    icon={<Box className="text-primary w-5 h-5" />}
                    description="Total cost basis of sets & points"
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

                {/* Set Values */}
                <div className="bg-panel rounded-xl border border-border shadow-sm p-6 relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 bg-primary/10 w-32 h-32 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <Box className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Set Assembly Cost</h2>
                            <p className="text-sm text-foreground/60">Calculated sum of avg costs</p>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                        <div className="flex justify-between items-center py-3 border-b border-border/50">
                            <div className="flex items-center gap-2">
                                <Flower2 className="w-4 h-4 text-foreground/50" />
                                <span className="text-foreground/70">Avg Cost of Flower Set</span>
                            </div>
                            <span className="font-medium bg-foreground/5 px-2 py-1 rounded">
                                {formatMoney(flowersData.reduce((acc, curr) => acc + (curr.stats.stock > 0 ? curr.stats.totalCost / curr.stats.stock : 0), 0))}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-3">
                            <div className="flex items-center gap-2">
                                <Ghost className="w-4 h-4 text-foreground/50" />
                                <span className="text-foreground/70">Avg Cost of Plushie Set</span>
                            </div>
                            <span className="font-medium bg-foreground/5 px-2 py-1 rounded">
                                {formatMoney(plushiesData.reduce((acc, curr) => acc + (curr.stats.stock > 0 ? curr.stats.totalCost / curr.stats.stock : 0), 0))}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profit Trend Chart */}
            <div className="bg-panel rounded-xl border border-border shadow-sm p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-bl-full -z-10 pointer-events-none" />
                <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <TrendingUp className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Points Profit Trend</h2>
                            <p className="text-sm text-foreground/60">30-day cumulative points realized profit tracking</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-foreground/40 font-medium uppercase tracking-wider">Total Realized</p>
                        <p className="text-2xl font-black text-primary">{formatMoney(pointsStats.realizedProfit)}</p>
                    </div>
                </div>

                <div className="h-[300px] w-full relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.06} />
                            <XAxis 
                                dataKey="date" 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 11 }}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 11 }}
                                tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: 'hsl(var(--panel))', 
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                                }}
                                itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                                labelStyle={{ opacity: 0.5, marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                formatter={(value: any) => [formatMoney(value), "Cumulative Profit"]}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="profit" 
                                stroke="#f59e0b" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorProfit)" 
                                animationDuration={1500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
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
    title, value, icon, description, valueClass = "", colorClass = "bg-primary"
}: {
    title: string, value: string, icon: React.ReactNode, description: string, valueClass?: string, colorClass?: string
}) {
    return (
        <div className="bg-panel p-6 rounded-xl border border-border flex flex-col justify-between hover:border-primary/50 transition-colors relative overflow-hidden group">
            <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-2xl transition-colors opacity-10 group-hover:opacity-20 ${colorClass}`} />
            <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="text-sm font-medium text-foreground/70">{title}</h3>
                {icon}
            </div>
            <div className="relative z-10">
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
