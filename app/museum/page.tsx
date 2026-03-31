"use client";

import { useJournal, InventoryItemStats } from "@/store/useJournal";
import {
  TrendingUp,
  Package,
  History,
  Library as Museum,
  Box,
  Flower2,
  Coins,
  Ghost,
  Droplet,
  ArrowRightLeft,
  ShoppingCart,
  LayoutDashboard,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import {
  formatItemName,
  FLOWER_SET,
  MUSEUM_EXCHANGE_DEFINITIONS,
  MUSEUM_TRACKED_ITEMS,
  PLUSHIE_SET,
} from "@/lib/parser";
import { ProfitChart } from "@/components/ProfitChart";
import {
  format,
  subDays,
  subWeeks,
  subMonths,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subYears,
  startOfYear,
  endOfYear,
} from "date-fns";
import { InventorySnapshot, applyTransaction, getTotals } from "@/lib/chartUtils";

const getTransactionTimestamp = (transaction: any) =>
  "date" in transaction ? transaction.date : transaction.timestamp;

const isMuseumTrackedTransaction = (transaction: any) => {
  if ("isWrapper" in transaction && transaction.isWrapper) {
    return false;
  }

  const itemName = "itemName" in transaction ? transaction.itemName : undefined;
  if (typeof itemName === "string") {
    return (
      itemName === "points" ||
      itemName === "flushie" ||
      MUSEUM_TRACKED_ITEMS.includes(itemName)
    );
  }

  if ("item" in transaction && typeof transaction.item === "string") {
    return (
      transaction.item === "points" ||
      transaction.item === "flushie" ||
      MUSEUM_TRACKED_ITEMS.includes(transaction.item)
    );
  }

  return false;
};

const formatMoney = (val: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
};

const formatLargeNumber = (val: number) => {
  const absVal = Math.abs(val);
  if (absVal >= 1e9) return (val / 1e9).toFixed(1) + "B";
  if (absVal >= 1e6) return (val / 1e6).toFixed(1) + "M";
  if (absVal >= 1e3) return (val / 1e3).toFixed(0) + "K";
  return val.toString();
};

/**
 * Compute the optimal buy plan to maximize complete sets using effort-based heuristic.
 * Effort = maximum average additional sets gained per item type purchased.
 * Condition: (target - currentSets) / itemsToBuy <= effort
 * Constraint: never buy ALL items (at least 1 item must have stock >= target).
 * @param items - Array of items with name and current stock
 * @param effort - Maximum average additional sets per item type purchased
 * @returns Object containing target sets, purchase details, and summary stats
 */
function computeBuyPlan(
  items: { name: string; stock: number }[],
  effort: number,
) {
  if (items.length === 0) {
    return { target: 0, purchases: [], itemsToBuy: 0, totalQty: 0 };
  }

  const sorted = [...items].sort((a, b) => a.stock - b.stock);
  const currentSets = sorted[0].stock;
  let bestTarget = currentSets;

  for (let i = 1; i < sorted.length; i++) {
    const target = sorted[i].stock;
    if (target <= currentSets) continue;
    const itemsToBuy = i;
    const setsPerItem = (target - currentSets) / itemsToBuy;
    if (setsPerItem > effort) break;
    bestTarget = target + 1;
  }

  if (bestTarget === currentSets) {
    const itemsAtMin = sorted.filter((s) => s.stock === currentSets).length;
    if (itemsAtMin < sorted.length && effort >= 1 / itemsAtMin) {
      bestTarget = currentSets + 1;
    }
  }

  const purchases = items.map((item) => {
    const buy = Math.max(0, bestTarget - item.stock);
    return { name: item.name, current: item.stock, buy };
  });

  const itemsToBuyCount = purchases.filter((p) => p.buy > 0).length;
  const totalQty = purchases.reduce((sum, p) => sum + p.buy, 0);

  return {
    target: bestTarget,
    purchases,
    itemsToBuy: itemsToBuyCount,
    totalQty,
  };
}

export default function MuseumDashboard() {
  const { isLoaded, inventory, transactions } = useJournal();

  const {
    flushieStats,
    pointsStats,
    flowersData,
    plushiesData,
    artifactExchangeData,
    flowerSetsPossible,
    plushieSetsPossible,
    totalValue,
    totalProfit,
  } = useMemo(() => {
    const defaultStats = {
      stock: 0,
      totalCost: 0,
      realizedProfit: 0,
      abroadStock: 0,
      abroadTotalCost: 0,
      abroadRealizedProfit: 0,
    };
    const flushieStats = inventory.get("flushie") || defaultStats;
    const pointsStats = inventory.get("points") || defaultStats;

    const flowersData = FLOWER_SET.map((name) => ({
      name,
      stats: inventory.get(name) || defaultStats,
    }));
    const plushiesData = PLUSHIE_SET.map((name) => ({
      name,
      stats: inventory.get(name) || defaultStats,
    }));

    const artifactExchangeData = Object.entries(MUSEUM_EXCHANGE_DEFINITIONS)
      .filter(([key]) => key !== "flower" && key !== "plushie")
      .map(([key, definition]) => {
        const items = definition.items.map((item) => ({
          ...item,
          stats: inventory.get(item.itemName) || defaultStats,
        }));
        const exchangesReady =
          items.length > 0
            ? Math.min(
                ...items.map((item) =>
                  Math.floor(item.stats.stock / item.quantity),
                ),
              )
            : 0;

        return {
          key,
          definition,
          items,
          exchangesReady,
        };
      });

    const flowerSetsPossible =
      FLOWER_SET.length > 0
        ? Math.min(...flowersData.map((f) => f.stats.stock))
        : 0;
    const plushieSetsPossible =
      PLUSHIE_SET.length > 0
        ? Math.min(...plushiesData.map((p) => p.stats.stock))
        : 0;

    let itemsTotalCost = 0;
    let itemsRealizedProfit = 0;

    [...flowersData, ...plushiesData].forEach((item) => {
      itemsTotalCost += Math.max(0, item.stats.totalCost);
      itemsRealizedProfit += item.stats.realizedProfit;
    });

    artifactExchangeData.forEach((exchange) => {
      exchange.items.forEach((item) => {
        itemsTotalCost += Math.max(0, item.stats.totalCost);
        itemsRealizedProfit += item.stats.realizedProfit;
      });
    });

    const totalValue =
      Math.max(0, flushieStats.totalCost) +
      Math.max(0, pointsStats.totalCost) +
      itemsTotalCost;
    const totalProfit =
      flushieStats.realizedProfit +
      pointsStats.realizedProfit +
      itemsRealizedProfit;

    return {
      flushieStats,
      pointsStats,
      flowersData,
      plushiesData,
      artifactExchangeData,
      flowerSetsPossible,
      plushieSetsPossible,
      totalValue,
      totalProfit,
    };
  }, [inventory]);

  const [timeRange, setTimeRange] = useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("museum-range");
      if (saved && ["daily", "weekly", "monthly", "yearly"].includes(saved))
        return saved as any;
    }
    return "daily";
  });
  const [chartType, setChartType] = useState<"line" | "area" | "bar">("area");
  const [viewType, setViewType] = useState<"daily" | "total">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("museum-view");
      if (saved && ["daily", "total"].includes(saved)) return saved as any;
    }
    return "daily";
  });

  const [mode, setMode] = useState<"overview" | "buy">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("museum-mode");
      if (saved === "overview" || saved === "buy") return saved;
    }
    return "overview";
  });
  const [flowerEffort, setFlowerEffort] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("museum-flower-effort");
      if (saved !== null) {
        const n = parseInt(saved, 10);
        if (!isNaN(n) && n >= 0) return n;
      }
    }
    return 5;
  });
  const [plushieEffort, setPlushieEffort] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("museum-plushie-effort");
      if (saved !== null) {
        const n = parseInt(saved, 10);
        if (!isNaN(n) && n >= 0) return n;
      }
    }
    return 5;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("museum-range", timeRange);
      localStorage.setItem("museum-view", viewType);
      localStorage.setItem("museum-mode", mode);
      localStorage.setItem("museum-flower-effort", flowerEffort.toString());
      localStorage.setItem("museum-plushie-effort", plushieEffort.toString());
    }
  }, [timeRange, viewType, mode, flowerEffort, plushieEffort]);

  const chartData = useMemo(() => {
    if (!isLoaded || !transactions.length) return [];

    const now = new Date();
    let periods: Date[] = [];
    let dateFormat = "MMM dd";

    if (timeRange === "daily") {
      periods = Array.from({ length: 30 }, (_, i) => subDays(now, 29 - i));
    } else if (timeRange === "weekly") {
      periods = Array.from({ length: 12 }, (_, i) => subWeeks(now, 11 - i));
      dateFormat = "MMM dd";
    } else if (timeRange === "monthly") {
      periods = Array.from({ length: 12 }, (_, i) => subMonths(now, 11 - i));
      dateFormat = "MMM yyyy";
    } else {
      periods = Array.from({ length: 5 }, (_, i) =>
        subMonths(now, (4 - i) * 12),
      ); // 5 years
      dateFormat = "yyyy";
    }

    const sortedTransactions = [...transactions].sort((a, b) => {
      const left = getTransactionTimestamp(a);
      const right = getTransactionTimestamp(b);
      if (left !== right) return left - right;
      return 0;
    });

    const tempInventory = new Map<string, InventorySnapshot>();
    let transactionIndex = 0;
    let lastPeriodProfit = 0;
    const mugState = { total: 0 };

    return periods.map((period) => {
      let periodEnd: Date;
      if (timeRange === "daily") periodEnd = endOfDay(startOfDay(period));
      else if (timeRange === "weekly") periodEnd = endOfWeek(period);
      else if (timeRange === "monthly") periodEnd = endOfMonth(period);
      else periodEnd = endOfMonth(period); // Yearly end

      while (
        transactionIndex < sortedTransactions.length &&
        getTransactionTimestamp(sortedTransactions[transactionIndex]) <= periodEnd.getTime()
      ) {
        applyTransaction(tempInventory, sortedTransactions[transactionIndex], mugState);
        transactionIndex += 1;
      }

      const totals = getTotals(tempInventory, mugState.total);
      const currentTotalProfit = totals.museumProfit;
      const value =
        viewType === "total"
          ? currentTotalProfit
          : currentTotalProfit - lastPeriodProfit;
      lastPeriodProfit = currentTotalProfit;

      return {
        date: format(period, dateFormat),
        profit: Math.round(value),
        ts: periodEnd.getTime(),
      };
    });
  }, [isLoaded, transactions, timeRange, viewType]);

  const firstRelevantTxDate = useMemo(() => {
    const pointsTxs = transactions.filter(isMuseumTrackedTransaction);
    return pointsTxs.length > 0
      ? Math.min(...pointsTxs.map(getTransactionTimestamp))
      : Infinity;
  }, [transactions]);

  const averageProfit = useMemo(() => {
    const relevantPeriods = chartData.filter(
      (p) => p.ts >= firstRelevantTxDate,
    );
    if (relevantPeriods.length === 0) return 0;
    return (
      relevantPeriods.reduce((acc, curr) => acc + curr.profit, 0) /
      relevantPeriods.length
    );
  }, [chartData, firstRelevantTxDate]);

  const flowerBuyPlan = useMemo(
    () =>
      computeBuyPlan(
        flowersData.map((f) => ({ name: f.name, stock: f.stats.stock })),
        flowerEffort,
      ),
    [flowersData, flowerEffort],
  );
  const plushieBuyPlan = useMemo(
    () =>
      computeBuyPlan(
        plushiesData.map((p) => ({ name: p.name, stock: p.stats.stock })),
        plushieEffort,
      ),
    [plushiesData, plushieEffort],
  );

  if (!isLoaded)
    return (
      <div className="text-center py-20 animate-pulse text-foreground/50">
        Loading Tracker Data...
      </div>
    );

  const pointsAvg =
    pointsStats.stock > 0 ? pointsStats.totalCost / pointsStats.stock : 0;
  const finalTotalValue =
    chartData.length > 0 ? chartData[chartData.length - 1].profit : 0;
  const referenceValue = viewType === "daily" ? averageProfit : finalTotalValue;

  return (
    <div
      className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10"
      style={
        {
          "--primary": "#f59e0b", // Amber
        } as React.CSSProperties
      }
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Museum Dashboard
          </h1>
          <p className="text-foreground/60 mt-2">
            Specialized tracking for points conversions, item sets, and market
            economics.
          </p>
        </div>
        <div className="hidden sm:flex items-center justify-center p-3 bg-primary/10 rounded-2xl border border-primary/20">
          <Box className="w-8 h-8 text-primary shadow-[0_0_15px_-3px_#f59e0b20]" />
        </div>
      </div>

      {/* Hero Section: 1/3 Stats List - 2/3 Chart (always visible) */}
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
                value={flowersData
                  .reduce((acc, curr) => acc + curr.stats.stock, 0)
                  .toLocaleString()}
                subValue={`${flowerSetsPossible} Sets Ready`}
              />
              <OverviewItem
                icon={<Ghost className="w-4 h-4" />}
                label="Plushie Stock"
                value={plushiesData
                  .reduce((acc, curr) => acc + curr.stats.stock, 0)
                  .toLocaleString()}
                subValue={`${plushieSetsPossible} Sets Ready`}
              />
              <OverviewItem
                icon={<Museum className="w-4 h-4" />}
                label="Artifact Exchanges"
                value={artifactExchangeData
                  .reduce((acc, curr) => acc + curr.exchangesReady, 0)
                  .toLocaleString()}
                subValue={`${artifactExchangeData.length} exchange tracks`}
              />
            </div>
          </div>

          <div className="pt-8 border-t border-border/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Box className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-foreground/45">
                  Total Inventory Value
                </p>
                <p className="text-2xl font-black tracking-tight">
                  {formatMoney(totalValue)}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 pl-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40 ml-5" />
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-foreground/30">
                  Points Cost Basis
                </p>
                <p className="text-sm font-bold text-foreground/60">
                  {formatMoney(pointsAvg)}
                </p>
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

      {/* Mode Toggle */}
      <div className="flex justify-center">
        <div className="flex items-center bg-panel border border-border rounded-xl p-1">
          <button
            onClick={() => setMode("overview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === "overview"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-foreground/60 hover:text-foreground/80"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Overview
          </button>
          <button
            onClick={() => setMode("buy")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === "buy"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-foreground/60 hover:text-foreground/80"
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Buy Mode
          </button>
        </div>
      </div>

      {mode === "overview" ? (
        <>
          {/* Flowers Section */}
          <div className="bg-panel rounded-xl border border-border shadow-sm p-6">
            <div className="flex items-center justify-between mb-6 border-b border-border/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Flower2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Flower Sets</h2>
                  <p className="text-sm text-foreground/60">
                    {Math.max(0, flowerSetsPossible)} complete sets ready to
                    convert.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {flowersData.map((item) => (
                <ItemGridCard
                  key={item.name}
                  name={item.name}
                  stats={item.stats}
                />
              ))}
            </div>
          </div>

          {/* Plushies Section */}
          <div className="bg-panel rounded-xl border border-border shadow-sm p-6">
            <div className="flex items-center justify-between mb-6 border-b border-border/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Ghost className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Plushie Sets</h2>
                  <p className="text-sm text-foreground/60">
                    {Math.max(0, plushieSetsPossible)} complete sets ready to
                    convert.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {plushiesData.map((item) => (
                <ItemGridCard
                  key={item.name}
                  name={item.name}
                  stats={item.stats}
                />
              ))}
            </div>
          </div>

          <div className="bg-panel rounded-xl border border-border shadow-sm p-6">
            <div className="flex items-center justify-between mb-6 border-b border-border/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Museum className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Artifact Exchanges</h2>
                  <p className="text-sm text-foreground/60">
                    Museum conversions beyond flower and plushie sets.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {artifactExchangeData.map((exchange) => (
                <div
                  key={exchange.key}
                  className="rounded-xl border border-border/70 bg-background/50 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{exchange.definition.label}</h3>
                      <p className="text-sm text-foreground/60">
                        {exchange.exchangesReady} ready · {exchange.definition.pointsPerExchange.toLocaleString()} points each
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {exchange.items.map((item) => (
                      <div
                        key={`${exchange.key}:${item.itemID}`}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-foreground/75">
                          {item.quantity}x {formatItemName(item.itemName)}
                        </span>
                        <span className="font-medium text-primary">
                          {item.stats.stock.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Buy Mode: Flower Sets */}
          <BuyPlanSection
            title="Flower Sets"
            icon={<Flower2 className="w-6 h-6 text-primary" />}
            effort={flowerEffort}
            setEffort={setFlowerEffort}
            buyPlan={flowerBuyPlan}
            currentSets={flowerSetsPossible}
          />

          {/* Buy Mode: Plushie Sets */}
          <BuyPlanSection
            title="Plushie Sets"
            icon={<Ghost className="w-6 h-6 text-primary" />}
            effort={plushieEffort}
            setEffort={setPlushieEffort}
            buyPlan={plushieBuyPlan}
            currentSets={plushieSetsPossible}
          />
        </>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
  valueClass = "",
  colorClass = "bg-primary",
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  description: string;
  valueClass?: string;
  colorClass?: string;
}) {
  return (
    <div className="bg-panel p-6 rounded-xl border border-border flex flex-col justify-between hover:border-primary/50 transition-colors relative overflow-hidden group">
      <div
        className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-2xl transition-colors opacity-10 group-hover:opacity-20 ${colorClass}`}
      />
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-sm font-medium text-foreground/70">{title}</h3>
        {icon}
      </div>
      <div className="relative z-10">
        <p className={`text-2xl font-bold tracking-tight ${valueClass}`}>
          {value}
        </p>
        <p className="text-xs text-foreground/50 mt-1">{description}</p>
      </div>
    </div>
  );
}

function OverviewItem({
  icon,
  label,
  value,
  subValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
}) {
  return (
    <div className="flex items-center justify-between group/item">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary/10 rounded-lg text-primary group-hover/item:scale-110 transition-transform">
          {icon}
        </div>
        <div>
          <p className="text-[10px] uppercase font-black tracking-widest text-foreground/45">
            {label}
          </p>
          <p className="text-sm font-bold text-foreground/70">{subValue}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xl font-black tracking-tight text-foreground/90">
          {value}
        </p>
      </div>
    </div>
  );
}

function ItemGridCard({
  name,
  stats,
}: {
  name: string;
  stats: InventoryItemStats;
}) {
  const avgCost = stats.stock > 0 ? stats.totalCost / stats.stock : 0;
  return (
    <div
      className={`p-4 rounded-lg border ${stats.stock > 0 ? "border-primary/30 bg-primary/5" : "border-border/50 bg-background/50"}`}
    >
      <h4
        className="font-semibold text-sm truncate"
        title={formatItemName(name)}
      >
        {formatItemName(name)}
      </h4>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-xs text-foreground/60">Stock:</span>
        <span
          className={`font-bold ${stats.stock > 0 ? "text-primary" : "text-foreground/50"}`}
        >
          {stats.stock}
        </span>
      </div>
      <div className="mt-1 flex items-baseline justify-between">
        <span className="text-xs text-foreground/60">Avg Cost:</span>
        <span className="text-xs font-medium">{formatMoney(avgCost)}</span>
      </div>
    </div>
  );
}

/**
 * Displays a buy plan section for a set type (flowers or plushies).
 * Shows an effort input, summary of the plan, and a grid of item cards.
 */
function BuyPlanSection({
  title,
  icon,
  effort,
  setEffort,
  buyPlan,
  currentSets,
}: {
  title: string;
  icon: React.ReactNode;
  effort: number;
  setEffort: (n: number) => void;
  buyPlan: {
    target: number;
    purchases: { name: string; current: number; buy: number }[];
    itemsToBuy: number;
    totalQty: number;
  };
  currentSets: number;
}) {
  return (
    <div className="bg-panel rounded-xl border border-border shadow-sm p-6">
      <div className="flex items-center justify-between mb-6 border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">{icon}</div>
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-sm text-foreground/60">
              Currently {currentSets} sets. Target {buyPlan.target} sets.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground/60 whitespace-nowrap">
            Effort:
          </span>
          <input
            type="number"
            min={0}
            max={99}
            value={effort}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (!isNaN(n) && n >= 0) setEffort(n);
              else if (e.target.value === "") setEffort(0);
            }}
            className="w-16 px-2 py-1.5 text-sm font-bold text-center bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
          />
        </div>
      </div>

      {buyPlan.itemsToBuy > 0 ? (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-lg">
          <ShoppingCart className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-sm text-foreground/80">
            Buy{" "}
            <span className="font-bold text-primary">{buyPlan.totalQty}</span>{" "}
            items across{" "}
            <span className="font-bold text-primary">{buyPlan.itemsToBuy}</span>{" "}
            types to reach{" "}
            <span className="font-bold text-primary">{buyPlan.target}</span>{" "}
            sets.
          </p>
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-success/5 border border-success/20 rounded-lg">
          <p className="text-sm text-foreground/80">
            No buys needed — all items are balanced at current stock levels.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {buyPlan.purchases.map((item) => (
          <BuyPlanCard key={item.name} item={item} />
        ))}
      </div>
    </div>
  );
}

/**
 * Card displaying a single item's buy plan details.
 * Shows only current stock and buy quantity (no total).
 * Highlighted when the item needs to be purchased.
 */
function BuyPlanCard({
  item,
}: {
  item: { name: string; current: number; buy: number };
}) {
  const needsBuy = item.buy > 0;
  return (
    <div
      className={`p-4 rounded-lg border ${needsBuy ? "border-primary/30 bg-primary/5" : "border-border/50 bg-background/50"}`}
    >
      <h4
        className="font-semibold text-sm truncate"
        title={formatItemName(item.name)}
      >
        {formatItemName(item.name)}
      </h4>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-xs text-foreground/60">Current:</span>
        <span className="font-bold text-foreground/70">{item.current}</span>
      </div>
      <div className="mt-1 flex items-baseline justify-between">
        <span className="text-xs text-foreground/60">Buy:</span>
        <span
          className={`font-bold ${needsBuy ? "text-success" : "text-foreground/40"}`}
        >
          {needsBuy ? `+${item.buy}` : "—"}
        </span>
      </div>
    </div>
  );
}
