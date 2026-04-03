"use client";

import React, { useState } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart as RechartsBarChart,
    Bar,
    ReferenceLine,
} from "recharts";
import { HugeiconsIcon } from "@hugeicons/react";
import { Activity01Icon, Layers01Icon, BarChartIcon } from "@hugeicons/core-free-icons";

interface ChartDataPoint {
    date: string;
    profit?: number;
    ts: number;
    // For stacked mode
    mugLoss?: number;
    realizedProfit?: number;
    netProfit?: number;
    museumProfit?: number;
    abroadProfit?: number;
}

interface ProfitChartProps {
    chartId: string;
    data: ChartDataPoint[];
    viewType: "daily" | "total";
    setViewType: (val: "daily" | "total") => void;
    timeRange: "daily" | "weekly" | "monthly" | "yearly";
    setTimeRange: (val: "daily" | "weekly" | "monthly" | "yearly") => void;
    referenceValue: number;
    primaryColor?: string;
    accentColor?: string;
    formatValue?: (val: number) => string;
    stackedMode?: boolean;
    visibleLines?: {
        mugLoss?: boolean;
        museumProfit?: boolean;
        abroadProfit?: boolean;
        netProfit?: boolean;
    };
}

export function ProfitChart({
    chartId,
    data,
    viewType,
    setViewType,
    timeRange,
    setTimeRange,
    referenceValue,
    primaryColor = "var(--primary)",
    accentColor = "var(--primary)",
    formatValue = (val) => `${val.toLocaleString()}`,
    stackedMode = false,
    visibleLines = { mugLoss: true, museumProfit: true, abroadProfit: true, netProfit: true },
}: ProfitChartProps) {
    const [chartType, setChartType] = useState<"line" | "area" | "bar">(
        stackedMode ? "area" : "area"
    );

    // Persistence
    React.useEffect(() => {
        const saved = localStorage.getItem(`chart-type-${chartId}`);
        if (saved && ["line", "area", "bar"].includes(saved)) {
            setChartType(saved as any);
        }
    }, [chartId]);

    const handleChartTypeChange = (type: "line" | "area" | "bar") => {
        triggerHaptic(5);
        setChartType(type);
        localStorage.setItem(`chart-type-${chartId}`, type);
    };

    const handleToggle = () => {
        triggerHaptic(10);
        setViewType(viewType === "total" ? "daily" : "total");
    };

    const handleRangeChange = (range: "daily" | "weekly" | "monthly" | "yearly") => {
        triggerHaptic(5);
        setTimeRange(range);
    };

    const tooltipStyle = {
        backgroundColor: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: "0px",
        padding: "12px",
        boxShadow: "none",
        opacity: 0.95,
    };

    return (
        <div className="flex flex-col h-full font-mono">
            {/* Header Row */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 border border-border p-4 bg-muted/20">
                <div className="flex flex-col sm:flex-row sm:items-center gap-8">
                    {/* View Type Toggle */}
                    <div className="flex items-center gap-4">
                        <div
                            onClick={handleToggle}
                            className={`group relative flex items-center h-6 w-12 border border-border p-1 cursor-pointer transition-colors ${viewType === "total" ? "bg-primary/20 border-primary" : "bg-muted"}`}
                        >
                            <div
                                className={`h-3 w-3 transition-all ${viewType === "total" ? "translate-x-6 bg-primary" : "translate-x-0 bg-foreground/40"}`}
                            />
                        </div>
                        <div>
                            <p className="text-xs font-bold tracking-tight uppercase">
                                {viewType === "total" ? "Cumulative" : "Incremental"}
                            </p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-foreground/30">
                                {viewType === "total" ? "Total to date" : "Daily gains"}
                            </p>
                        </div>
                    </div>

                    {/* Reference Value Stat */}
                    <div className="hidden sm:block border-l border-border pl-8">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 mb-1">
                            {viewType === "daily" ? "Period Average" : "Period Total"}
                        </h2>
                        <p
                            className="text-xl font-black tracking-tighter"
                            style={{ color: primaryColor }}
                        >
                            {formatValue(referenceValue)}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Time Select */}
                    <div className="flex border border-border p-1 bg-background/50">
                        {(["daily", "weekly", "monthly", "yearly"] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => handleRangeChange(r)}
                                className={`w-10 h-8 flex items-center justify-center text-[10px] font-black transition-all border border-transparent ${timeRange === r ? "bg-primary text-white border-primary" : "text-foreground/40 hover:text-foreground/60"}`}
                            >
                                {r.slice(0, 1).toUpperCase()}
                                {r.slice(1, 3).toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {!stackedMode && (
                        <div className="flex border border-border p-1 bg-background/50">
                            <ChartControlBtn
                                active={chartType === "line"}
                                onClick={() => handleChartTypeChange("line")}
                                icon={<HugeiconsIcon icon={Activity01Icon} size={16} />}
                            />
                            <ChartControlBtn
                                active={chartType === "area"}
                                onClick={() => handleChartTypeChange("area")}
                                icon={<HugeiconsIcon icon={Layers01Icon} size={16} />}
                            />
                            <ChartControlBtn
                                active={chartType === "bar"}
                                onClick={() => handleChartTypeChange("bar")}
                                icon={<HugeiconsIcon icon={BarChartIcon} size={16} />}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Chart Container */}
            <div className="h-[320px] w-full flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                    {stackedMode ? (
                        <AreaChart data={data} stackOffset="sign">
                            <CartesianGrid
                                strokeDasharray="2 4"
                                vertical={false}
                                stroke="var(--border)"
                                opacity={0.5}
                            />
                            <XAxis
                                dataKey="date"
                                axisLine={{ stroke: "var(--border)" }}
                                tickLine={false}
                                tick={{
                                    fill: "var(--foreground)",
                                    opacity: 0.5,
                                    fontSize: 10,
                                    fontFamily: "monospace",
                                }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={{ stroke: "var(--border)" }}
                                tickLine={false}
                                tick={{
                                    fill: "var(--foreground)",
                                    opacity: 0.5,
                                    fontSize: 10,
                                    fontFamily: "monospace",
                                }}
                                tickFormatter={(val) => `${formatLargeNumber(val)}`}
                            />
                            <Tooltip
                                contentStyle={tooltipStyle}
                                labelStyle={{
                                    color: "var(--foreground)",
                                    opacity: 0.7,
                                    marginBottom: "8px",
                                    fontSize: "10px",
                                    fontWeight: "bold",
                                    fontFamily: "monospace",
                                }}
                                itemStyle={{
                                    fontFamily: "monospace",
                                    fontSize: "10px",
                                    textTransform: "uppercase",
                                }}
                                formatter={(value: any, name) => [
                                    formatValue(value),
                                    name === "netProfit"
                                        ? "Net Profit"
                                        : name === "realizedProfit"
                                          ? "Base Profit"
                                          : name === "museumProfit"
                                            ? "Museum Profit"
                                            : name === "abroadProfit"
                                              ? "Abroad Profit"
                                              : "Mug Loss",
                                ]}
                            />
                            {/* Mug Loss Area - shown as negative (red) */}
                            {visibleLines.mugLoss && (
                                <Area
                                    type="stepAfter"
                                    dataKey="mugLoss"
                                    stroke="var(--danger)"
                                    strokeWidth={1.5}
                                    fill="var(--danger)"
                                    fillOpacity={0.2}
                                    stackId="1"
                                />
                            )}
                            {/* Realized Profit Area - shown as positive (green) - Base Stack */}
                            <Area
                                type="stepAfter"
                                dataKey="realizedProfit"
                                stroke="var(--success)"
                                strokeWidth={1.5}
                                fill="var(--success)"
                                fillOpacity={0.2}
                                stackId="1"
                            />
                            {/* Stacked Museum Area */}
                            {visibleLines.museumProfit && (
                                <Area
                                    type="stepAfter"
                                    dataKey="museumProfit"
                                    stroke="#eab308"
                                    strokeWidth={1.5}
                                    fill="#eab308"
                                    fillOpacity={0.5}
                                    stackId="1"
                                />
                            )}
                            {/* Stacked Abroad Area */}
                            {visibleLines.abroadProfit && (
                                <Area
                                    type="stepAfter"
                                    dataKey="abroadProfit"
                                    stroke="#14b8a6"
                                    strokeWidth={1.5}
                                    fill="#14b8a6"
                                    fillOpacity={0.5}
                                    stackId="1"
                                />
                            )}
                            {/* Net Profit Line - theme adaptive */}
                            {visibleLines.netProfit && (
                                <Line
                                    type="stepAfter"
                                    dataKey="netProfit"
                                    stroke="var(--foreground)"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 0, fill: "var(--primary)" }}
                                />
                            )}
                        </AreaChart>
                    ) : chartType === "bar" ? (
                        <RechartsBarChart data={data}>
                            <CartesianGrid
                                strokeDasharray="2 4"
                                vertical={false}
                                stroke="var(--border)"
                                opacity={0.5}
                            />
                            <XAxis
                                dataKey="date"
                                axisLine={{ stroke: "var(--border)" }}
                                tickLine={false}
                                tick={{
                                    fill: "var(--foreground)",
                                    opacity: 0.5,
                                    fontSize: 10,
                                    fontFamily: "monospace",
                                }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={{ stroke: "var(--border)" }}
                                tickLine={false}
                                tick={{
                                    fill: "var(--foreground)",
                                    opacity: 0.5,
                                    fontSize: 10,
                                    fontFamily: "monospace",
                                }}
                                tickFormatter={(val) => `${formatLargeNumber(val)}`}
                            />
                            <Tooltip
                                contentStyle={tooltipStyle}
                                itemStyle={{
                                    color: "var(--primary)",
                                    fontWeight: "bold",
                                    fontSize: "10px",
                                    fontFamily: "monospace",
                                }}
                                labelStyle={{
                                    opacity: 0.5,
                                    marginBottom: "8px",
                                    fontSize: "10px",
                                    fontWeight: "bold",
                                    fontFamily: "monospace",
                                }}
                                formatter={(value: any) => [
                                    formatValue(value),
                                    viewType === "total" ? "TOTAL PROFIT" : "PERIOD PROFIT",
                                ]}
                            />
                            <Bar dataKey="profit" fill="var(--primary)" opacity={0.8} />
                            <ReferenceLine
                                y={referenceValue}
                                stroke="var(--primary)"
                                strokeDasharray="4 4"
                                opacity={0.5}
                                label={{
                                    value: viewType === "daily" ? "AVG" : "TTL",
                                    position: "right",
                                    fill: "var(--primary)",
                                    fontSize: 10,
                                    opacity: 0.6,
                                    fontWeight: "bold",
                                    fontFamily: "monospace",
                                }}
                            />
                        </RechartsBarChart>
                    ) : chartType === "line" ? (
                        <LineChart data={data}>
                            <CartesianGrid
                                strokeDasharray="2 4"
                                vertical={false}
                                stroke="var(--border)"
                                opacity={0.5}
                            />
                            <XAxis
                                dataKey="date"
                                axisLine={{ stroke: "var(--border)" }}
                                tickLine={false}
                                tick={{
                                    fill: "var(--foreground)",
                                    opacity: 0.5,
                                    fontSize: 10,
                                    fontFamily: "monospace",
                                }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={{ stroke: "var(--border)" }}
                                tickLine={false}
                                tick={{
                                    fill: "var(--foreground)",
                                    opacity: 0.5,
                                    fontSize: 10,
                                    fontFamily: "monospace",
                                }}
                                tickFormatter={(val) => `${formatLargeNumber(val)}`}
                            />
                            <Tooltip
                                contentStyle={tooltipStyle}
                                itemStyle={{
                                    color: "var(--primary)",
                                    fontWeight: "bold",
                                    fontSize: "10px",
                                    fontFamily: "monospace",
                                }}
                                labelStyle={{
                                    opacity: 0.5,
                                    marginBottom: "8px",
                                    fontSize: "10px",
                                    fontWeight: "bold",
                                    fontFamily: "monospace",
                                }}
                                formatter={(value: any) => [
                                    formatValue(value),
                                    viewType === "total" ? "TOTAL PROFIT" : "PERIOD PROFIT",
                                ]}
                            />
                            <Line
                                type="stepAfter"
                                dataKey="profit"
                                stroke="var(--primary)"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, strokeWidth: 0, fill: "var(--primary)" }}
                            />
                            <ReferenceLine
                                y={referenceValue}
                                stroke="var(--primary)"
                                strokeDasharray="4 4"
                                opacity={0.5}
                                label={{
                                    value: viewType === "daily" ? "AVG" : "TTL",
                                    position: "right",
                                    fill: "var(--primary)",
                                    fontSize: 10,
                                    opacity: 0.6,
                                    fontWeight: "bold",
                                    fontFamily: "monospace",
                                }}
                            />
                        </LineChart>
                    ) : (
                        <AreaChart data={data}>
                            <CartesianGrid
                                strokeDasharray="2 4"
                                vertical={false}
                                stroke="var(--border)"
                                opacity={0.5}
                            />
                            <XAxis
                                dataKey="date"
                                axisLine={{ stroke: "var(--border)" }}
                                tickLine={false}
                                tick={{
                                    fill: "var(--foreground)",
                                    opacity: 0.5,
                                    fontSize: 10,
                                    fontFamily: "monospace",
                                }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={{ stroke: "var(--border)" }}
                                tickLine={false}
                                tick={{
                                    fill: "var(--foreground)",
                                    opacity: 0.5,
                                    fontSize: 10,
                                    fontFamily: "monospace",
                                }}
                                tickFormatter={(val) => `${formatLargeNumber(val)}`}
                            />
                            <Tooltip
                                contentStyle={tooltipStyle}
                                itemStyle={{
                                    color: "var(--primary)",
                                    fontWeight: "bold",
                                    fontSize: "10px",
                                    fontFamily: "monospace",
                                }}
                                labelStyle={{
                                    opacity: 0.5,
                                    marginBottom: "8px",
                                    fontSize: "10px",
                                    fontWeight: "bold",
                                    fontFamily: "monospace",
                                }}
                                formatter={(value: any) => [
                                    formatValue(value),
                                    viewType === "total" ? "TOTAL PROFIT" : "PERIOD PROFIT",
                                ]}
                            />
                            <Area
                                type="stepAfter"
                                dataKey="profit"
                                stroke="var(--primary)"
                                strokeWidth={2}
                                fillOpacity={0.15}
                                fill="var(--primary)"
                                animationDuration={1000}
                            />
                            <ReferenceLine
                                y={referenceValue}
                                stroke="var(--primary)"
                                strokeDasharray="4 4"
                                opacity={0.5}
                                label={{
                                    value: viewType === "daily" ? "AVG" : "TTL",
                                    position: "right",
                                    fill: "var(--primary)",
                                    fontSize: 10,
                                    opacity: 0.6,
                                    fontWeight: "bold",
                                    fontFamily: "monospace",
                                }}
                            />
                        </AreaChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function formatLargeNumber(val: number) {
    const absVal = Math.abs(val);
    if (absVal >= 1e9) return (val / 1e9).toFixed(1) + "B";
    if (absVal >= 1e6) return (val / 1e6).toFixed(1) + "M";
    if (absVal >= 1e3) return (val / 1e3).toFixed(0) + "K";
    return val.toString();
}

function triggerHaptic(duration: number = 10) {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(duration);
    }
}

function ChartControlBtn({
    active,
    onClick,
    icon,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-10 h-8 flex items-center justify-center transition-all ${active ? "bg-primary text-white" : "text-foreground/40 hover:text-foreground/60 hover:bg-foreground/5"}`}
        >
            {icon}
        </button>
    );
}
