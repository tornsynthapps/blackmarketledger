"use client";

import { useJournal, InventoryItemStats } from "@/store/useJournal";
import { 
    TrendingUp, Package, History, Library as Museum, Box, Flower2, Coins, Ghost, Droplet, ArrowRightLeft
} from 'lucide-react';
import { useMemo, useState, useEffect } from "react";
import { formatItemName, FLOWER_SET, PLUSHIE_SET, Transaction } from "@/lib/parser";
import { ProfitChart } from '@/components/ProfitChart';
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subYears, startOfYear, endOfYear } from 'date-fns';

const formatMoney = (val: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(val);
};

const formatLargeNumber = (val: number) => {
    const absVal = Math.abs(val);
    if (absVal >= 1e9) return (val / 1e9).toFixed(1) + 'B';
    if (absVal >= 1e6) return (val / 1e6).toFixed(1) + 'M';
    if (absVal >= 1e3) return (val / 1e3).toFixed(0) + 'K';
    return val.toString();
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

    const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('museum-range');
            if (saved && ['daily', 'weekly', 'monthly', 'yearly'].includes(saved)) return saved as any;
        }
        return 'daily';
    });
    const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('area');
    const [viewType, setViewType] = useState<'daily' | 'total'>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('museum-view');
            if (saved && ['daily', 'total'].includes(saved)) return saved as any;
        }
        return 'daily';
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('museum-range', timeRange);
            localStorage.setItem('museum-view', viewType);
        }
    }, [timeRange, viewType]);

    const chartData = useMemo(() => {
        if (!isLoaded || !transactions.length) return [];

        const now = new Date();
        let periods: Date[] = [];
        let dateFormat = 'MMM dd';

        if (timeRange === 'daily') {
            periods = Array.from({ length: 30 }, (_, i) => subDays(now, 29 - i));
        } else if (timeRange === 'weekly') {
            periods = Array.from({ length: 12 }, (_, i) => subWeeks(now, 11 - i));
            dateFormat = 'MMM dd';
        } else if (timeRange === 'monthly') {
            periods = Array.from({ length: 12 }, (_, i) => subMonths(now, 11 - i));
            dateFormat = 'MMM yyyy';
        } else {
            periods = Array.from({ length: 5 }, (_, i) => subMonths(now, (4 - i) * 12)); // 5 years
            dateFormat = 'yyyy';
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
            else if (timeRange === 'monthly') periodEnd = endOfMonth(period);
            else periodEnd = endOfMonth(period); // Yearly end

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
                profit: Math.round(value),
                ts: periodEnd.getTime()
            };
        });
    }, [isLoaded, transactions, timeRange, viewType]);

    const firstRelevantTxDate = useMemo(() => {
        const pointsTxs = transactions.filter(t => {
            if (t.type === 'BUY' || t.type === 'SELL') return (t as any).item === 'points';
            if (t.type === 'CONVERT') return t.fromItem === 'points' || t.toItem === 'points';
            if (t.type === 'SET_CONVERT') return (t as any).pointsEarned > 0;
            return false;
        });
        return pointsTxs.length > 0 ? Math.min(...pointsTxs.map(t => t.date)) : Infinity;
    }, [transactions]);

    const averageProfit = useMemo(() => {
        const relevantPeriods = chartData.filter(p => p.ts >= firstRelevantTxDate);
        if (relevantPeriods.length === 0) return 0;
        return relevantPeriods.reduce((acc, curr) => acc + curr.profit, 0) / relevantPeriods.length;
    }, [chartData, firstRelevantTxDate]);

    if (!isLoaded) return <div className="text-center py-20 animate-pulse text-foreground/50">Loading Tracker Data...</div>;

    const pointsAvg = pointsStats.stock > 0 ? pointsStats.totalCost / pointsStats.stock : 0;
    const finalTotalValue = chartData.length > 0 ? chartData[chartData.length - 1].profit : 0;
    const referenceValue = viewType === 'daily' ? averageProfit : finalTotalValue;

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
                    <ProfitChart 
                        chartId="museum-points"
                        data={chartData}
                        viewType={viewType}
                        setViewType={setViewType}
                        timeRange={timeRange}
                        setTimeRange={setTimeRange}
                        referenceValue={referenceValue}
                        primaryColor="#f59e0b"
                        formatValue={formatMoney}
                    />
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
