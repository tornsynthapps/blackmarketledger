"use client";

import { useJournal, InventoryItemStats } from "@/store/useJournal";
import { Coins, Droplet, ArrowRightLeft, TrendingUp, Flower2, Ghost, Box, Activity, Calendar, BarChart3, BarChart as LucideBarChart, LineChart as LucideLineChart, Layers } from "lucide-react";
import { useMemo, useState } from "react";
import { formatItemName, FLOWER_SET, PLUSHIE_SET, Transaction } from "@/lib/parser";
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    LineChart, Line, BarChart, Bar 
} from 'recharts';
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

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

    const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('area');
    const [viewType, setViewType] = useState<'daily' | 'total'>('total');

    const chartData = useMemo(() => {
        if (!isLoaded || !transactions.length) return [];

        const now = new Date();
        let periods: Date[] = [];
        let dateFormat = 'MMM dd';

        if (timeRange === 'daily') {
            periods = Array.from({ length: 30 }, (_, i) => subDays(now, 29 - i));
        } else if (timeRange === 'weekly') {
            periods = Array.from({ length: 12 }, (_, i) => subWeeks(now, 11 - i));
        } else {
            periods = Array.from({ length: 12 }, (_, i) => subMonths(now, 11 - i));
            dateFormat = 'MMM yyyy';
        }
        
        const sortedTransactions = [...transactions].sort((a, b) => {
            if (a.date !== b.date) return a.date - b.date;
            return (a.type === 'BUY' ? 0 : 1) - (b.type === 'BUY' ? 0 : 1);
        });

        const tempInventory = new Map<string, any>();
        let transactionIndex = 0;
        let lastPeriodProfit = 0;
        
        return periods.map(period => {
            let periodEnd: Date;
            if (timeRange === 'daily') periodEnd = endOfDay(startOfDay(period));
            else if (timeRange === 'weekly') periodEnd = endOfWeek(period);
            else periodEnd = endOfMonth(period);

            while (transactionIndex < sortedTransactions.length && sortedTransactions[transactionIndex].date <= periodEnd.getTime()) {
                const t = sortedTransactions[transactionIndex];
                
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
            const currentTotalProfit = pointsEntry.realizedProfit;
            const value = viewType === 'total' ? currentTotalProfit : currentTotalProfit - lastPeriodProfit;
            lastPeriodProfit = currentTotalProfit;

            return {
                date: format(period, dateFormat),
                profit: Math.round(value)
            };
        });
    }, [isLoaded, transactions, timeRange, viewType]);

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
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Museum Dashboard</h1>
                    <p className="text-foreground/60 mt-2">Specialized tracking for points conversions, item sets, and market economics.</p>
                </div>
                <div className="hidden sm:flex items-center justify-center p-3 bg-primary/10 rounded-2xl border border-primary/20">
                    <Box className="w-8 h-8 text-primary shadow-[0_0_15px_-3px_#f59e0b20]" />
                </div>
            </div>

            {/* Hero Section: 1/3 Stats List - 2/3 Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-panel rounded-3xl border border-border shadow-2xl p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-bl-[10rem] -z-10 pointer-events-none transition-transform group-hover:scale-110 duration-700" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-tr-[8rem] -z-10 pointer-events-none transition-transform group-hover:scale-110 duration-700" />

                {/* Overview List (1/3) */}
                <div className="space-y-8 pr-0 lg:pr-8 border-r-0 lg:border-r border-border/50">
                    <div>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-6 flex items-center gap-2">
                            <TrendingUp className="w-3 h-3" />
                            Inventory Overview
                        </h2>
                        
                        <div className="space-y-6">
                            <OverviewItem 
                                icon={<Coins className="w-4 h-4" />}
                                label="Points Stock"
                                value={pointsStats.stock.toLocaleString()}
                                subValue={`Avg Cost: ${formatMoney(pointsAvg)}`}
                            />
                            <OverviewItem 
                                icon={<Flower2 className="w-4 h-4" />}
                                label="Flower Stock"
                                value={flowersData.reduce((acc, curr) => acc + curr.stats.stock, 0).toLocaleString()}
                                subValue={`${flowerSetsPossible} Sets Ready`}
                            />
                            <OverviewItem 
                                icon={<Ghost className="w-4 h-4" />}
                                label="Plushie Stock"
                                value={plushiesData.reduce((acc, curr) => acc + curr.stats.stock, 0).toLocaleString()}
                                subValue={`${plushieSetsPossible} Sets Ready`}
                            />
                        </div>
                    </div>

                    <div className="pt-8 border-t border-border/50">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <Box className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-black tracking-widest text-foreground/45">Total Inventory Value</p>
                                <p className="text-2xl font-black tracking-tight">{formatMoney(totalValue)}</p>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-4 pl-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 ml-5" />
                            <div>
                                <p className="text-[10px] uppercase font-black tracking-widest text-foreground/30">Points Cost Basis</p>
                                <p className="text-sm font-bold text-foreground/60">{formatMoney(pointsStats.totalCost)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chart Area (2/3) */}
                <div className="lg:col-span-2 pl-0 lg:pl-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-1">Point Profit Trends</h2>
                            <div className="flex items-center gap-2">
                                <p className="text-lg font-bold">{viewType === 'total' ? 'Cumulative' : 'Incremental'} Growth</p>
                                <div className="flex bg-foreground/5 p-1 rounded-lg">
                                    <button 
                                        onClick={() => setViewType('daily')}
                                        className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${viewType === 'daily' ? 'bg-primary text-white shadow-sm' : 'text-foreground/40 hover:text-foreground/60'}`}
                                    >Daily</button>
                                    <button 
                                        onClick={() => setViewType('total')}
                                        className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${viewType === 'total' ? 'bg-primary text-white shadow-sm' : 'text-foreground/40 hover:text-foreground/60'}`}
                                    >Total</button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Time Select */}
                            <div className="flex bg-foreground/5 p-1 rounded-xl">
                                <ChartControlBtn active={timeRange === 'daily'} onClick={() => setTimeRange('daily')} icon={<Calendar className="w-3.5 h-3.5" />} />
                                <ChartControlBtn active={timeRange === 'weekly'} onClick={() => setTimeRange('weekly')} icon={<BarChart3 className="w-3.5 h-3.5" />} />
                                <ChartControlBtn active={timeRange === 'monthly'} onClick={() => setTimeRange('monthly')} icon={<TrendingUp className="w-3.5 h-3.5" />} />
                            </div>

                            {/* Type Select */}
                            <div className="flex bg-foreground/5 p-1 rounded-xl">
                                <ChartControlBtn active={chartType === 'line'} onClick={() => setChartType('line')} icon={<Activity className="w-3.5 h-3.5" />} />
                                <ChartControlBtn active={chartType === 'area'} onClick={() => setChartType('area')} icon={<Layers className="w-3.5 h-3.5" />} />
                                <ChartControlBtn active={chartType === 'bar'} onClick={() => setChartType('bar')} icon={<LucideBarChart className="w-3.5 h-3.5" />} />
                            </div>
                        </div>
                    </div>

                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            {chartType === 'bar' ? (
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.06} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10 }} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--panel))', border: '1px solid hsl(var(--border))', borderRadius: '16px', padding: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#f59e0b', fontWeight: '900' }} labelStyle={{ opacity: 0.5, marginBottom: '8px', fontSize: '9px', fontWeight: 'bold' }} formatter={(value: any) => [formatMoney(value), viewType === 'total' ? "Total Profit" : "Daily Profit"]} />
                                    <Bar dataKey="profit" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            ) : chartType === 'line' ? (
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.06} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10 }} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--panel))', border: '1px solid hsl(var(--border))', borderRadius: '16px', padding: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#f59e0b', fontWeight: '900' }} labelStyle={{ opacity: 0.5, marginBottom: '8px', fontSize: '9px', fontWeight: 'bold' }} formatter={(value: any) => [formatMoney(value), viewType === 'total' ? "Total Profit" : "Daily Profit"]} />
                                    <Line type="monotone" dataKey="profit" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', strokeWidth: 1.5, r: 3 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                                </LineChart>
                            ) : (
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.06} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10 }} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--panel))', border: '1px solid hsl(var(--border))', borderRadius: '16px', padding: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#f59e0b', fontWeight: '900' }} labelStyle={{ opacity: 0.5, marginBottom: '8px', fontSize: '9px', fontWeight: 'bold' }} formatter={(value: any) => [formatMoney(value), viewType === 'total' ? "Total Profit" : "Daily Profit"]} />
                                    <Area type="monotone" dataKey="profit" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" animationDuration={1500} />
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
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

function OverviewItem({ icon, label, value, subValue }: { icon: React.ReactNode, label: string, value: string, subValue: string }) {
    return (
        <div className="flex items-center justify-between group/item">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-lg text-primary group-hover/item:scale-110 transition-transform">
                    {icon}
                </div>
                <div>
                    <p className="text-[10px] uppercase font-black tracking-widest text-foreground/45">{label}</p>
                    <p className="text-sm font-bold text-foreground/70">{subValue}</p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-xl font-black tracking-tight text-foreground/90">{value}</p>
            </div>
        </div>
    );
}

function ChartControlBtn({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
    return (
        <button 
            onClick={onClick}
            className={`p-2 rounded-lg transition-all ${active ? 'bg-primary text-white shadow-md' : 'text-foreground/40 hover:text-foreground/60 hover:bg-foreground/5'}`}
        >
            {icon}
        </button>
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
