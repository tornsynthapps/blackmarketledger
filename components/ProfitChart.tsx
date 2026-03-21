"use client"

import React, { useState } from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    LineChart, Line, BarChart as RechartsBarChart, Bar, ReferenceLine 
} from 'recharts';
import { Activity, Layers, BarChart3 as LucideBarChart } from 'lucide-react';

interface ChartDataPoint {
    date: string;
    profit?: number;
    ts: number;
    // For stacked mode
    mugLoss?: number;
    realizedProfit?: number;
    netProfit?: number;
}

interface ProfitChartProps {
    chartId: string;
    data: ChartDataPoint[];
    viewType: 'daily' | 'total';
    setViewType: (val: 'daily' | 'total') => void;
    timeRange: 'daily' | 'weekly' | 'monthly' | 'yearly';
    setTimeRange: (val: 'daily' | 'weekly' | 'monthly' | 'yearly') => void;
    referenceValue: number;
    primaryColor?: string;
    accentColor?: string;
    formatValue?: (val: number) => string;
    stackedMode?: boolean;
}

export function ProfitChart({ 
    chartId,
    data, 
    viewType, 
    setViewType, 
    timeRange, 
    setTimeRange, 
    referenceValue,
    primaryColor = "#0d9488", // Default teal
    accentColor = "#0d9488",
    formatValue = (val) => `${val.toLocaleString()}`,
    stackedMode = false
}: ProfitChartProps) {
    const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>(stackedMode ? 'area' : 'area');

    // Persistence
    React.useEffect(() => {
        const saved = localStorage.getItem(`chart-type-${chartId}`);
        if (saved && ['line', 'area', 'bar'].includes(saved)) {
            setChartType(saved as any);
        }
    }, [chartId]);

    const handleChartTypeChange = (type: 'line' | 'area' | 'bar') => {
        triggerHaptic(5);
        setChartType(type);
        localStorage.setItem(`chart-type-${chartId}`, type);
    };

    const handleToggle = () => {
        triggerHaptic(10);
        setViewType(viewType === 'total' ? 'daily' : 'total');
    };

    const handleRangeChange = (range: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
        triggerHaptic(5);
        setTimeRange(range);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header Row */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 bg-foreground/[0.02] p-4 rounded-2xl border border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center gap-8">
                    {/* View Type Toggle */}
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleToggle}
                            className={`group relative flex items-center h-6 w-10 rounded-full p-1 transition-colors duration-300 ${viewType === 'total' ? 'bg-primary' : 'bg-foreground/20'}`}
                        >
                            <span 
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-300 ease-in-out ${viewType === 'total' ? 'translate-x-4' : 'translate-x-0'}`}
                            />
                        </button>
                        <div>
                            <p className="text-sm font-bold tracking-tight">{viewType === 'total' ? 'Cumulative' : 'Incremental'} Growth</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-foreground/30">{viewType === 'total' ? 'Total to date' : 'Daily gains'}</p>
                        </div>
                    </div>

                    {/* Reference Value Stat */}
                    <div className="hidden sm:block border-l border-border/50 pl-8">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 mb-0.5">
                            {viewType === 'daily' ? 'Period Average' : 'Period Total'}
                        </h2>
                        <p className="text-lg font-black tracking-tight" style={{ color: primaryColor }}>
                            {formatValue(referenceValue)}
                        </p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    {/* Time Select */}
                    <div className="flex bg-foreground/5 p-1 rounded-xl">
                        {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((r) => (
                            <button 
                                key={r}
                                onClick={() => handleRangeChange(r)}
                                className={`w-8 h-8 flex items-center justify-center text-[10px] font-black rounded-lg transition-all ${timeRange === r ? 'bg-primary text-white shadow-md' : 'text-foreground/40 hover:text-foreground/60'}`}
                            >
                                {r.charAt(0).toUpperCase()}
                            </button>
                        ))}
                    </div>
                    
                    {!stackedMode && (
                        <div className="flex bg-foreground/5 p-1 rounded-xl">
                            <ChartControlBtn active={chartType === 'line'} onClick={() => handleChartTypeChange('line')} icon={<Activity className="w-3.5 h-3.5" />} />
                            <ChartControlBtn active={chartType === 'area'} onClick={() => handleChartTypeChange('area')} icon={<Layers className="w-3.5 h-3.5" />} />
                            <ChartControlBtn active={chartType === 'bar'} onClick={() => handleChartTypeChange('bar')} icon={<LucideBarChart className="w-3.5 h-3.5" />} />
                        </div>
                    )}
                </div>
            </div>

            {/* Chart Container */}
            <div className="h-[320px] w-full flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                    {stackedMode ? (
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorRealized" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
                                </linearGradient>
                                <linearGradient id="colorMug" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                    <stop offset="50%" stopColor="#ef4444" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.8} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.06} />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10 }} tickFormatter={(val) => `${formatLargeNumber(val)}`} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--panel))', border: '1px solid hsl(var(--border))', borderRadius: '16px', padding: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', opacity: 1 }} labelStyle={{ opacity: 0.7, marginBottom: '8px', fontSize: '9px', fontWeight: 'bold' }} formatter={(value: any, name) => [formatValue(value), name === 'netProfit' ? 'Net Profit' : name === 'realizedProfit' ? 'Realized Profit' : 'Mug Loss']} />
                            {/* Mug Loss Area - shown as negative (red) - no stacking, just overlay */}
                            <Area
                                type="monotone"
                                dataKey="mugLoss"
                                stroke="#ef4444"
                                strokeWidth={2}
                                fill="url(#colorMug)"
                                fillOpacity={0.6}
                            />
                            {/* Realized Profit Area - shown as positive (green) - no stacking, just overlay */}
                            <Area
                                type="monotone"
                                dataKey="realizedProfit"
                                stroke="#22c55e"
                                strokeWidth={2}
                                fill="url(#colorRealized)"
                                fillOpacity={0.6}
                            />
                            {/* Net Profit Line - white */}
                            <Line
                                type="monotone"
                                dataKey="netProfit"
                                stroke="#ffffff"
                                strokeWidth={3}
                                dot={{ fill: '#ffffff', strokeWidth: 1.5, r: 3 }}
                                activeDot={{ r: 5, strokeWidth: 0 }}
                            />
                        </AreaChart>
                    ) : chartType === 'bar' ? (
                        <RechartsBarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.06} />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10 }} tickFormatter={(val) => `${formatLargeNumber(val)}`} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--panel))', border: '1px solid hsl(var(--border))', borderRadius: '16px', padding: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: primaryColor, fontWeight: '900' }} labelStyle={{ opacity: 0.5, marginBottom: '8px', fontSize: '9px', fontWeight: 'bold' }} formatter={(value: any) => [formatValue(value), viewType === 'total' ? "Total Profit" : "Period Profit"]} />
                            <Bar dataKey="profit" fill={primaryColor} radius={[6, 6, 0, 0]} />
                            <ReferenceLine y={referenceValue} stroke={primaryColor} strokeDasharray="3 3" opacity={0.2} label={{ value: viewType === 'daily' ? 'Avg' : 'Total', position: 'right', fill: primaryColor, fontSize: 9, opacity: 0.4, fontWeight: 'bold' }} />
                        </RechartsBarChart>
                    ) : chartType === 'line' ? (
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.06} />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10 }} tickFormatter={(val) => `${formatLargeNumber(val)}`} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--panel))', border: '1px solid hsl(var(--border))', borderRadius: '16px', padding: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: primaryColor, fontWeight: '900' }} labelStyle={{ opacity: 0.5, marginBottom: '8px', fontSize: '9px', fontWeight: 'bold' }} formatter={(value: any) => [formatValue(value), viewType === 'total' ? "Total Profit" : "Period Profit"]} />
                            <Line type="monotone" dataKey="profit" stroke={primaryColor} strokeWidth={2} dot={{ fill: primaryColor, strokeWidth: 1.5, r: 3 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                            <ReferenceLine y={referenceValue} stroke={primaryColor} strokeDasharray="3 3" opacity={0.2} label={{ value: viewType === 'daily' ? 'Avg' : 'Total', position: 'right', fill: primaryColor, fontSize: 9, opacity: 0.4, fontWeight: 'bold' }} />
                        </LineChart>
                    ) : (
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.06} />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.4, fontSize: 10 }} tickFormatter={(val) => `${formatLargeNumber(val)}`} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--panel))', border: '1px solid hsl(var(--border))', borderRadius: '16px', padding: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: primaryColor, fontWeight: '900' }} labelStyle={{ opacity: 0.5, marginBottom: '8px', fontSize: '9px', fontWeight: 'bold' }} formatter={(value: any) => [formatValue(value), viewType === 'total' ? "Total Profit" : "Period Profit"]} />
                            <Area type="monotone" dataKey="profit" stroke={primaryColor} strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" animationDuration={1500} />
                            <ReferenceLine y={referenceValue} stroke={primaryColor} strokeDasharray="3 3" opacity={0.2} label={{ value: viewType === 'daily' ? 'Avg' : 'Total', position: 'right', fill: primaryColor, fontSize: 9, opacity: 0.4, fontWeight: 'bold' }} />
                        </AreaChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function formatLargeNumber(val: number) {
    const absVal = Math.abs(val);
    if (absVal >= 1e9) return (val / 1e9).toFixed(1) + 'B';
    if (absVal >= 1e6) return (val / 1e6).toFixed(1) + 'M';
    if (absVal >= 1e3) return (val / 1e3).toFixed(0) + 'K';
    return val.toString();
}

function triggerHaptic(duration: number = 10) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(duration);
    }
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
