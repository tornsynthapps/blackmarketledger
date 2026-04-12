"use client";

import React, { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Cancel01Icon,
    ChartAreaIcon,
    Calendar01Icon,
    BarChartIcon,
} from "@hugeicons/core-free-icons";
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
} from "recharts";
import { FLOWER_SET, PLUSHIE_SET, Transaction } from "@/lib/old/parser";
import type { AnyTrackedTransaction } from "@/lib/old/interfaces/transactions";
import {
    format,
    startOfDay,
    startOfWeek,
    startOfMonth,
    endOfDay,
    endOfWeek,
    endOfMonth,
    subDays,
    subWeeks,
    subMonths,
} from "date-fns";
import { InventorySnapshot, LedgerTotals, applyTransaction, getTotals } from "@/lib/old/chartUtils";

interface StatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    transactions: Array<Transaction | AnyTrackedTransaction>;
    statType: "profit" | "inventory" | "mugLoss" | "netProfit";
    excludedItems?: string[];
    inventoryScope?: "normal" | "abroad";
}

const getTransactionTimestamp = (transaction: any) =>
    "date" in transaction ? transaction.date : transaction.timestamp;

type TimeRange = "daily" | "weekly" | "monthly";

export default function StatsModal({
    isOpen,
    onClose,
    title,
    transactions,
    statType,
    excludedItems = [],
    inventoryScope = "normal",
}: StatsModalProps) {
    const [timeRange, setTimeRange] = useState<TimeRange>("daily");
    const [viewType, setViewType] = useState<"cumulative" | "incremental">("cumulative");

    if (!isOpen) return null;

    const formatCompactCurrency = (value: number) => {
        const absValue = Math.abs(value);

        if (absValue >= 1_000_000_000) {
            return `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
        }

        if (absValue >= 1_000_000) {
            return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
        }

        if (absValue >= 1_000) {
            return `$${(value / 1_000).toFixed(0)}K`;
        }

        return `$${Math.round(value).toLocaleString()}`;
    };

    const excludedItemSet = new Set(excludedItems.map((item) => item.toLowerCase()));

    const isTrackedItem = (item: string) => !excludedItemSet.has(item.toLowerCase());

    const generateChartData = () => {
        const now = new Date();
        let periods: Date[] = [];
        let formatStr = "";

        switch (timeRange) {
            case "daily":
                periods = Array.from({ length: 30 }, (_, i) => subDays(now, 29 - i));
                formatStr = "MMM dd";
                break;
            case "weekly":
                periods = Array.from({ length: 12 }, (_, i) => subWeeks(now, 11 - i));
                formatStr = "MMM dd";
                break;
            case "monthly":
                periods = Array.from({ length: 12 }, (_, i) => subMonths(now, 11 - i));
                formatStr = "MMM yyyy";
                break;
        }

        const sortedTransactions = [...transactions].sort((a, b) => {
            const left = getTransactionTimestamp(a);
            const right = getTransactionTimestamp(b);
            if (left !== right) return left - right;
            return 0;
        });

        if (sortedTransactions.length > 0) {
            const firstTxDate = new Date(getTransactionTimestamp(sortedTransactions[0]));
            let minDate: Date;
            if (timeRange === "daily") minDate = startOfDay(subDays(firstTxDate, 1));
            else if (timeRange === "weekly") minDate = startOfWeek(subWeeks(firstTxDate, 1));
            else minDate = startOfMonth(subMonths(firstTxDate, 1));

            periods = periods.filter((p) => p.getTime() >= minDate.getTime());
        }

        const inventory = new Map<string, InventorySnapshot>();
        const mugState = { total: 0 };
        let transactionIndex = 0;
        let previousTotals: LedgerTotals = {
            profit: 0,
            inventory: 0,
            mugLoss: 0,
            netProfit: 0,
            abroadProfit: 0,
            abroadInventory: 0,
            museumProfit: 0,
            museumInventory: 0,
        };

        return periods.map((period) => {
            let periodEnd: Date;

            switch (timeRange) {
                case "daily":
                    periodEnd = endOfDay(startOfDay(period));
                    break;
                case "weekly":
                    periodEnd = endOfWeek(startOfWeek(period));
                    break;
                case "monthly":
                    periodEnd = endOfMonth(startOfMonth(period));
                    break;
            }

            while (
                transactionIndex < sortedTransactions.length &&
                getTransactionTimestamp(sortedTransactions[transactionIndex]) <= periodEnd.getTime()
            ) {
                applyTransaction(
                    inventory,
                    sortedTransactions[transactionIndex],
                    mugState,
                    isTrackedItem
                );
                transactionIndex += 1;
            }

            const currentTotalsRaw = getTotals(inventory, mugState.total);

            const currentTotals: LedgerTotals = {
                ...currentTotalsRaw,
                profit:
                    inventoryScope === "abroad"
                        ? currentTotalsRaw.abroadProfit
                        : currentTotalsRaw.profit,
                inventory:
                    inventoryScope === "abroad"
                        ? currentTotalsRaw.abroadInventory
                        : currentTotalsRaw.inventory,
                netProfit:
                    (inventoryScope === "abroad"
                        ? currentTotalsRaw.abroadProfit
                        : currentTotalsRaw.profit) - currentTotalsRaw.mugLoss,
            };

            const realizedProfit = currentTotals.profit;
            const mugLoss = currentTotals.mugLoss;
            const netProfit = currentTotals.netProfit;

            const incrementalRealized = realizedProfit - previousTotals.profit;
            const incrementalMug = mugLoss - previousTotals.mugLoss;
            const incrementalNet = netProfit - previousTotals.netProfit;

            previousTotals = currentTotals;

            return {
                period: format(period, formatStr),
                realizedProfit: Math.round(
                    viewType === "cumulative" ? realizedProfit : incrementalRealized
                ),
                mugLoss: -Math.round(viewType === "cumulative" ? mugLoss : incrementalMug),
                netProfit: Math.round(viewType === "cumulative" ? netProfit : incrementalNet),
                date: period.toISOString(),
            };
        });
    };

    const chartData = generateChartData();

    const totalNetProfit = chartData.reduce((sum, item) => sum + item.netProfit, 0);
    const latestNetProfit = chartData.length > 0 ? chartData[chartData.length - 1].netProfit : 0;
    const averageNetProfit =
        chartData.length > 0 ? Math.round(totalNetProfit / chartData.length) : 0;
    const highestNetProfit =
        chartData.length > 0 ? Math.max(...chartData.map((item) => item.netProfit)) : 0;
    const lowestNetProfit =
        chartData.length > 0 ? Math.min(...chartData.map((item) => item.netProfit)) : 0;

    const tooltipStyle = {
        backgroundColor: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: "0px",
        padding: "12px",
        boxShadow: "none",
        opacity: 0.95,
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-panel border border-border shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col font-mono">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter">
                            {title} Diagnostics
                        </h2>
                        <p className="text-[10px] font-bold text-foreground/50 uppercase tracking-widest mt-1">
                            Industrial Data Stream Analysis
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 border border-border bg-background hover:bg-danger hover:text-white transition-all group"
                    >
                        <HugeiconsIcon icon={Cancel01Icon} size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Controls */}
                    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex border border-border p-1 bg-background/50">
                            {(["daily", "weekly", "monthly"] as TimeRange[]).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-4 py-2 text-[10px] font-black uppercase transition-all flex items-center gap-2 border border-transparent ${
                                        timeRange === range
                                            ? "bg-primary text-white border-primary"
                                            : "text-foreground/40 hover:text-foreground/60"
                                    }`}
                                >
                                    <HugeiconsIcon
                                        icon={
                                            range === "daily"
                                                ? Calendar01Icon
                                                : range === "weekly"
                                                  ? BarChartIcon
                                                  : ChartAreaIcon
                                        }
                                        size={14}
                                    />
                                    {range}
                                </button>
                            ))}
                        </div>

                        <div className="flex border border-border p-1 bg-background/50">
                            {(["cumulative", "incremental"] as const).map((v) => (
                                <button
                                    key={v}
                                    onClick={() => setViewType(v)}
                                    className={`px-4 py-2 text-[10px] font-black uppercase transition-all border border-transparent ${
                                        viewType === v
                                            ? "bg-primary text-white border-primary"
                                            : "text-foreground/40 hover:text-foreground/60"
                                    }`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="h-80 w-full mb-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <CartesianGrid
                                    strokeDasharray="2 4"
                                    vertical={false}
                                    stroke="var(--border)"
                                    opacity={0.5}
                                />
                                <XAxis
                                    dataKey="period"
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
                                    tickFormatter={(value) => formatCompactCurrency(Number(value))}
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
                                        formatCompactCurrency(Number(value || 0)),
                                        name === "netProfit"
                                            ? "Net Profit"
                                            : name === "realizedProfit"
                                              ? "Realized Profit"
                                              : "Mug Loss",
                                    ]}
                                />
                                <Area
                                    type="stepAfter"
                                    dataKey="mugLoss"
                                    stackId="1"
                                    stroke="var(--danger)"
                                    strokeWidth={1.5}
                                    fill="var(--danger)"
                                    fillOpacity={0.2}
                                />
                                <Area
                                    type="stepAfter"
                                    dataKey="realizedProfit"
                                    stackId="1"
                                    stroke="var(--success)"
                                    strokeWidth={1.5}
                                    fill="var(--success)"
                                    fillOpacity={0.2}
                                />
                                <Area
                                    type="stepAfter"
                                    dataKey="netProfit"
                                    stroke="var(--foreground)"
                                    strokeWidth={2}
                                    fill="transparent"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            label="Live Diagnostic"
                            value={latestNetProfit}
                            formatter={formatCompactCurrency}
                        />
                        <StatCard
                            label="Mean Throughput"
                            value={averageNetProfit}
                            formatter={formatCompactCurrency}
                        />
                        <StatCard
                            label="Peak Amplitude"
                            value={highestNetProfit}
                            formatter={formatCompactCurrency}
                        />
                        <StatCard
                            label="Floor Baseline"
                            value={lowestNetProfit}
                            formatter={formatCompactCurrency}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({
    label,
    value,
    formatter,
}: {
    label: string;
    value: number;
    formatter: (v: number) => string;
}) {
    return (
        <div className="border border-border p-4 bg-muted/10">
            <div className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-1">
                {label}
            </div>
            <div className="text-sm font-black tracking-tight">{formatter(value)}</div>
        </div>
    );
}
