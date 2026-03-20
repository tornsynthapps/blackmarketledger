"use client";

import { useState, useMemo, useEffect } from "react";
import { useJournal } from "@/store/useJournal";
import { formatItemName, FLOWER_SET, PLUSHIE_SET } from "@/lib/parser";
import { Plane, AlertCircle, ArrowRightLeft, Loader2, Check, TrendingUp, Box, Activity, Calendar, BarChart3, BarChart as LucideBarChart, LineChart as LucideLineChart, Layers } from "lucide-react";
import StatsModal from "@/components/StatsModal";
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    LineChart, Line, BarChart, Bar, ReferenceLine 
} from 'recharts';
import { format, subDays, subMonths, startOfDay, endOfDay, endOfMonth } from 'date-fns';

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

export default function AbroadDashboard() {
    const { inventory, weav3rApiKey, weav3rUserId, isLoaded, addLogs, transactions } = useJournal();
    const [prices, setPrices] = useState<Record<string, number>>({});
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [sellingItemId, setSellingItemId] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        title: string;
        statType: 'profit' | 'inventory' | 'mugLoss' | 'netProfit';
    }>({
        isOpen: false,
        title: '',
        statType: 'profit'
    });

    // Fetch Weav3r Pricelist
    useEffect(() => {
        if (!isLoaded || !weav3rUserId || !weav3rApiKey) return;

        setIsFetching(true);
        setError(null);

        fetch(`https://weav3r.dev/api/pricelist/${weav3rUserId}?apiKey=${weav3rApiKey}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);

                if (Array.isArray(data)) {
                    const priceMap: Record<string, number> = {};
                    data.forEach((item: any) => {
                        const normalizedName = item.name.trim().toLowerCase();
                        priceMap[normalizedName] = item.buyPrice;
                    });
                    setPrices(priceMap);
                }
            })
            .catch(err => {
                console.error("Failed to fetch pricelist", err);
                setError(err.message || "Failed to load Weav3r pricelist.");
            })
            .finally(() => {
                setIsFetching(false);
            });

    }, [isLoaded, weav3rUserId, weav3rApiKey]);

    const abroadStats = useMemo(() => {
        const items: { name: string; stock: number; avgCost: number; totalCost: number; realizedProfit: number }[] = [];
        let totalValue = 0;
        let totalProfit = 0;

        inventory.forEach((stats, name) => {
            if (stats.abroadStock > 0 || stats.abroadRealizedProfit !== 0 || stats.abroadTotalCost > 0) {
                const avgCost = stats.abroadStock > 0 ? stats.abroadTotalCost / stats.abroadStock : 0;
                items.push({
                    name,
                    stock: stats.abroadStock,
                    avgCost,
                    totalCost: Math.max(0, stats.abroadTotalCost),
                    realizedProfit: stats.abroadRealizedProfit
                });

                totalValue += Math.max(0, stats.abroadTotalCost);
                totalProfit += stats.abroadRealizedProfit;
            }
        });

        // Sort by realized profit descending
        items.sort((a, b) => b.realizedProfit - a.realizedProfit);

        return { items, totalValue, totalProfit };
    }, [inventory]);

    const [timeRange, setTimeRange] = useState<'daily' | 'monthly' | 'yearly'>('daily');
    const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('area');
    const [viewType, setViewType] = useState<'daily' | 'total'>('total');

    const chartData = useMemo(() => {
        if (!isLoaded || !transactions.length) return [];

        const now = new Date();
        let periods: Date[] = [];
        let dateFormat = 'MMM dd';

        if (timeRange === 'daily') {
            periods = Array.from({ length: 30 }, (_, i) => subDays(now, 29 - i));
        } else if (timeRange === 'monthly') {
            periods = Array.from({ length: 12 }, (_, i) => subMonths(now, 11 - i));
            dateFormat = 'MMM yyyy';
        } else {
            periods = Array.from({ length: 5 }, (_, i) => subMonths(now, (4 - i) * 12));
            dateFormat = 'yyyy';
        }
        
        const sortedTransactions = [...transactions]
            .filter(t => t.tag === 'Abroad')
            .sort((a, b) => {
                if (a.date !== b.date) return a.date - b.date;
                return (a.type === 'BUY' ? 0 : 1) - (b.type === 'BUY' ? 0 : 1);
            });

        const tempInventory = new Map<string, any>();
        let transactionIndex = 0;
        let lastPeriodProfit = 0;
        
        return periods.map(period => {
            let periodEnd: Date;
            if (timeRange === 'daily') periodEnd = endOfDay(startOfDay(period));
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
                }
                
                transactionIndex += 1;
            }

            let currentTotalProfit = 0;
            tempInventory.forEach(stats => {
                currentTotalProfit += stats.realizedProfit;
            });

            const value = viewType === 'total' ? currentTotalProfit : currentTotalProfit - lastPeriodProfit;
            lastPeriodProfit = currentTotalProfit;

            return {
                date: format(period, dateFormat),
                profit: Math.round(value)
            };
        });
    }, [isLoaded, transactions, timeRange, viewType]);

    const averageProfit = useMemo(() => {
        return chartData.length > 0 ? chartData.reduce((acc, curr) => acc + curr.profit, 0) / chartData.length : 0;
    }, [chartData]);

    const handleSelfSell = (itemGroup: { name: string; stock: number }) => {
        if (itemGroup.stock <= 0) return;

        const price = prices[itemGroup.name];
        if (!price || price <= 0) {
            alert(`No valid buy price found for ${formatItemName(itemGroup.name)} on Weav3r. Cannot self sell.`);
            return;
        }

        if (!confirm(`Are you sure you want to self-sell ${itemGroup.stock}x ${formatItemName(itemGroup.name)} for $${price.toLocaleString()} each?\n\nThis will record a sale in Abroad and a reinvested purchase in Normal stock.`)) {
            return;
        }

        setSellingItemId(itemGroup.name);

        // We use addLogs directly to inject the paired explicit transaction objects.
        // Even though standard parser splits them, directly feeding `addLogs` with parsed objects skips the string parser but still routes through store logic.
        const logs: any[] = [
            {
                type: 'SELL',
                item: itemGroup.name,
                amount: itemGroup.stock,
                price: price,
                tag: 'Abroad'
            },
            {
                type: 'BUY',
                item: itemGroup.name,
                amount: itemGroup.stock,
                price: price,
                tag: 'Normal'
            }
        ];

        // Slight delay to allow UI to render spinner
        setTimeout(() => {
            Promise.resolve(addLogs(logs))
                .catch((error) => {
                    console.error("Failed to save abroad self-sell logs", error);
                })
                .finally(() => {
                    setSellingItemId(null);
                });
        }, 500);
    };

    const openStatsModal = (title: string, statType: 'profit' | 'inventory' | 'mugLoss' | 'netProfit') => {
        setModalState({ isOpen: true, title, statType });
    };

    const closeStatsModal = () => {
        setModalState({ isOpen: false, title: '', statType: 'profit' });
    };

    if (!isLoaded) return null;

    return (
        <div
            className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{
                '--primary': '#0d9488', // Emerald/Teal
            } as React.CSSProperties}
        >
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Abroad Tracking</h1>
                <p className="text-foreground/60 mt-2">Manage items purchased internationally and track their separate cost basis.</p>
            </div>

            {/* Config warning */}
            {(!weav3rApiKey || !weav3rUserId) && (
                <div className="bg-warning/10 border border-warning/20 p-4 rounded-xl flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-warning">Weav3r Config Missing</h3>
                        <p className="text-sm text-foreground/70 mt-1">Configure your Weav3r API Key and User ID on the Terminal page to enable the "Self Sell" feature automatically using your pricelist.</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-danger/10 border border-danger/20 p-4 rounded-xl flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-danger">Pricelist Error</h3>
                        <p className="text-sm text-danger/80 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Hero Section: 1/3 Stats List - 2/3 Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-panel rounded-3xl border border-border shadow-2xl p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-bl-[10rem] -z-10 pointer-events-none transition-transform group-hover:scale-110 duration-700" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-tr-[8rem] -z-10 pointer-events-none transition-transform group-hover:scale-110 duration-700" />

                {/* Overview List (1/3) */}
                <div className="space-y-8 pr-0 lg:pr-8 border-r-0 lg:border-r border-border/50">
                    <div>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-6 flex items-center gap-2">
                            <TrendingUp className="w-3" />
                            Abroad Overview
                        </h2>
                        
                        <div className="space-y-6">
                            <OverviewItem 
                                icon={<Plane className="w-4 h-4" />}
                                label="Total Items"
                                value={abroadStats.items.reduce((acc, curr) => acc + curr.stock, 0).toLocaleString()}
                                subValue={`${abroadStats.items.length} Unique SKUs`}
                            />
                            <OverviewItem 
                                icon={<TrendingUp className="w-4 h-4" />}
                                label="Realized Profit"
                                value={formatLargeNumber(abroadStats.totalProfit)}
                                subValue="Net gains international"
                            />
                        </div>
                    </div>

                    <div className="pt-8 border-t border-border/50">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <Box className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-black tracking-widest text-foreground/45">Active Abroad Assets</p>
                                <p className="text-2xl font-black tracking-tight">{formatMoney(abroadStats.totalValue)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chart Area (2/3) */}
                <div className="lg:col-span-2 pl-0 lg:pl-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-1 flex items-center gap-2">
                                <Activity className="w-3" />
                                Profit Dynamics
                            </h2>
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
                            <div className="flex bg-foreground/5 p-1 rounded-xl">
                                <button onClick={() => setTimeRange('daily')} className={`w-8 h-8 flex items-center justify-center text-[10px] font-black rounded-lg transition-all ${timeRange === 'daily' ? 'bg-primary text-white shadow-md' : 'text-foreground/40 hover:text-foreground/60'}`}>D</button>
                                <button onClick={() => setTimeRange('monthly')} className={`w-8 h-8 flex items-center justify-center text-[10px] font-black rounded-lg transition-all ${timeRange === 'monthly' ? 'bg-primary text-white shadow-md' : 'text-foreground/40 hover:text-foreground/60'}`}>M</button>
                                <button onClick={() => setTimeRange('yearly')} className={`w-8 h-8 flex items-center justify-center text-[10px] font-black rounded-lg transition-all ${timeRange === 'yearly' ? 'bg-primary text-white shadow-md' : 'text-foreground/40 hover:text-foreground/60'}`}>Y</button>
                            </div>
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
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10 }} tickFormatter={(val) => `$${formatLargeNumber(val)}`} />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--panel))', border: '1px solid hsl(var(--border))', borderRadius: '16px', padding: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#0d9488', fontWeight: '900' }} labelStyle={{ opacity: 0.5, marginBottom: '8px', fontSize: '9px', fontWeight: 'bold' }} formatter={(value: any) => [`$${formatLargeNumber(value)}`, viewType === 'total' ? "Total Profit" : "Period Profit"]} />
                                    <Bar dataKey="profit" fill="#0d9488" radius={[6, 6, 0, 0]} />
                                    <ReferenceLine y={averageProfit} stroke="#0d9488" strokeDasharray="3 3" opacity={0.2} label={{ value: 'Avg', position: 'right', fill: '#0d9488', fontSize: 9, opacity: 0.4, fontWeight: 'bold' }} />
                                </BarChart>
                            ) : chartType === 'line' ? (
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.06} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10 }} tickFormatter={(val) => `$${formatLargeNumber(val)}`} />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--panel))', border: '1px solid hsl(var(--border))', borderRadius: '16px', padding: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#0d9488', fontWeight: '900' }} labelStyle={{ opacity: 0.5, marginBottom: '8px', fontSize: '9px', fontWeight: 'bold' }} formatter={(value: any) => [`$${formatLargeNumber(value)}`, viewType === 'total' ? "Total Profit" : "Period Profit"]} />
                                    <Line type="monotone" dataKey="profit" stroke="#0d9488" strokeWidth={2} dot={{ fill: '#0d9488', strokeWidth: 1.5, r: 3 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                                    <ReferenceLine y={averageProfit} stroke="#0d9488" strokeDasharray="3 3" opacity={0.2} label={{ value: 'Avg', position: 'right', fill: '#0d9488', fontSize: 9, opacity: 0.4, fontWeight: 'bold' }} />
                                </LineChart>
                            ) : (
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.06} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10 }} tickFormatter={(val) => `$${formatLargeNumber(val)}`} />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--panel))', border: '1px solid hsl(var(--border))', borderRadius: '16px', padding: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#0d9488', fontWeight: '900' }} labelStyle={{ opacity: 0.5, marginBottom: '8px', fontSize: '9px', fontWeight: 'bold' }} formatter={(value: any) => [`$${formatLargeNumber(value)}`, viewType === 'total' ? "Total Profit" : "Period Profit"]} />
                                    <Area type="monotone" dataKey="profit" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" animationDuration={1500} />
                                    <ReferenceLine y={averageProfit} stroke="#0d9488" strokeDasharray="3 3" opacity={0.2} label={{ value: 'Avg', position: 'right', fill: '#0d9488', fontSize: 9, opacity: 0.4, fontWeight: 'bold' }} />
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-panel border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase text-foreground/60 bg-foreground/5">
                            <tr>
                                <th className="px-6 py-4 whitespace-nowrap">Item</th>
                                <th className="px-6 py-4 text-right">Abroad Stock</th>
                                <th className="px-6 py-4 text-right">Avg Cost</th>
                                <th className="px-6 py-4 text-right">Total Cost</th>
                                <th className="px-6 py-4 text-right">Realized Profit</th>
                                <th className="px-6 py-4 text-center">Self Sell</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {abroadStats.items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-foreground/50">
                                        No abroad items found. Logs tagged with `Abroad` will appear here.
                                    </td>
                                </tr>
                            ) : (
                                abroadStats.items.map((item) => {
                                    const availablePrice = prices[item.name];
                                    const isSellingThis = sellingItemId === item.name;

                                    return (
                                        <tr key={item.name} className="hover:bg-foreground/[0.01] transition-colors">
                                            <td className="px-6 py-4 font-medium sm:whitespace-nowrap">{formatItemName(item.name)}</td>
                                            <td className="px-6 py-4 text-right font-mono">
                                                <span className="bg-primary/10 text-primary px-2 py-1 rounded-md">
                                                    {item.stock.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-foreground/70">${Math.round(item.avgCost).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right">${Math.round(item.totalCost).toLocaleString()}</td>
                                            <td className={`px-6 py-4 text-right font-medium ${item.realizedProfit > 0 ? "text-success" : item.realizedProfit < 0 ? "text-danger" : "text-foreground/70"}`}>
                                                {item.realizedProfit > 0 ? "+" : ""}${Math.round(item.realizedProfit).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleSelfSell(item)}
                                                    disabled={item.stock <= 0 || !availablePrice || isSellingThis}
                                                    title={!availablePrice ? `No pricelist data found for ${formatItemName(item.name)}` : `Self sell to standard tracker stock at $${availablePrice.toLocaleString()} each`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    {isSellingThis ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <ArrowRightLeft className="w-3.5 h-3.5" />
                                                    )}
                                                    Self Sell
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <StatsModal
                isOpen={modalState.isOpen}
                onClose={closeStatsModal}
                title={modalState.title}
                transactions={transactions.filter(t => t.tag === 'Abroad')}
                statType={modalState.statType}
                inventoryScope="abroad"
            />
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
