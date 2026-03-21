"use client";

import { useState } from 'react';
import { X, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { FLOWER_SET, PLUSHIE_SET, Transaction } from '@/lib/parser';
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  transactions: Transaction[];
  statType: 'profit' | 'inventory' | 'mugLoss' | 'netProfit';
  excludedItems?: string[];
  inventoryScope?: 'normal' | 'abroad';
}

type TimeRange = 'daily' | 'weekly' | 'monthly';
type InventorySnapshot = {
  stock: number;
  totalCost: number;
  realizedProfit: number;
  abroadStock: number;
  abroadTotalCost: number;
  abroadRealizedProfit: number;
};
type LedgerTotals = { profit: number; inventory: number; mugLoss: number; netProfit: number };

export default function StatsModal({
  isOpen,
  onClose,
  title,
  transactions,
  statType,
  excludedItems = [],
  inventoryScope = 'normal'
}: StatsModalProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');
  const [viewType, setViewType] = useState<'cumulative' | 'incremental'>('cumulative');

  if (!isOpen) return null;

  const formatCompactCurrency = (value: number) => {
    const absValue = Math.abs(value);

    if (absValue >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
    }

    if (absValue >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    }

    if (absValue >= 1_000) {
      return `$${(value / 1_000).toFixed(0)}k`;
    }

    return `$${Math.round(value).toLocaleString()}`;
  };

  const excludedItemSet = new Set(excludedItems.map(item => item.toLowerCase()));

  const isTrackedItem = (item: string) => !excludedItemSet.has(item.toLowerCase());

  const getInventoryEntry = (inventory: Map<string, InventorySnapshot>, item: string) => {
    return inventory.get(item) || {
      stock: 0,
      totalCost: 0,
      realizedProfit: 0,
      abroadStock: 0,
      abroadTotalCost: 0,
      abroadRealizedProfit: 0
    };
  };

  const applyTransaction = (
    inventory: Map<string, InventorySnapshot>,
    transaction: Transaction,
    mugState: { total: number }
  ) => {
    switch (transaction.type) {
      case 'BUY': {
        if (!isTrackedItem(transaction.item)) return;
        const current = getInventoryEntry(inventory, transaction.item);
        if (transaction.tag === 'Abroad') {
          current.abroadStock += transaction.amount;
          current.abroadTotalCost += transaction.price * transaction.amount;
        } else {
          current.stock += transaction.amount;
          current.totalCost += transaction.price * transaction.amount;
        }
        inventory.set(transaction.item, current);
        return;
      }
      case 'SELL': {
        if (!isTrackedItem(transaction.item)) return;
        const current = getInventoryEntry(inventory, transaction.item);
        if (transaction.tag === 'Abroad') {
          const avgCost = current.abroadStock > 0 ? current.abroadTotalCost / current.abroadStock : 0;
          const costOfGoodsSold = avgCost * transaction.amount;
          current.abroadStock -= transaction.amount;
          current.abroadTotalCost -= costOfGoodsSold;
          current.abroadRealizedProfit += transaction.price * transaction.amount - costOfGoodsSold;
        } else {
          const avgCost = current.stock > 0 ? current.totalCost / current.stock : 0;
          const costOfGoodsSold = avgCost * transaction.amount;
          current.stock -= transaction.amount;
          current.totalCost -= costOfGoodsSold;
          current.realizedProfit += transaction.price * transaction.amount - costOfGoodsSold;
        }
        inventory.set(transaction.item, current);
        return;
      }
      case 'MUG':
        mugState.total += transaction.amount;
        return;
      case 'CONVERT': {
        const fromCurrent = getInventoryEntry(inventory, transaction.fromItem);
        const fromAvgCost = fromCurrent.stock > 0 ? fromCurrent.totalCost / fromCurrent.stock : 0;
        const fromCostOfGoods = fromAvgCost * transaction.fromAmount;

        if (isTrackedItem(transaction.fromItem)) {
          fromCurrent.stock -= transaction.fromAmount;
          fromCurrent.totalCost -= fromCostOfGoods;
          inventory.set(transaction.fromItem, fromCurrent);
        }

        if (isTrackedItem(transaction.toItem)) {
          const toCurrent = getInventoryEntry(inventory, transaction.toItem);
          toCurrent.stock += transaction.toAmount;
          toCurrent.totalCost += fromCostOfGoods;
          inventory.set(transaction.toItem, toCurrent);
        }
        return;
      }
      case 'SET_CONVERT': {
        const setItems = transaction.setType === 'flower' ? FLOWER_SET : PLUSHIE_SET;

        let totalCostOfGoods = 0;

        setItems.forEach(item => {
          const current = getInventoryEntry(inventory, item);
          const avgCost = current.stock > 0 ? current.totalCost / current.stock : 0;
          const costOfGoods = avgCost * transaction.times;

          if (isTrackedItem(item)) {
            current.stock -= transaction.times;
            current.totalCost -= costOfGoods;
            inventory.set(item, current);
          }

          totalCostOfGoods += costOfGoods;
        });

        if (isTrackedItem('points')) {
          const pointsCurrent = getInventoryEntry(inventory, 'points');
          pointsCurrent.stock += transaction.pointsEarned;
          pointsCurrent.totalCost += totalCostOfGoods;
          inventory.set('points', pointsCurrent);
        }
      }
    }
  };

  const getTotals = (inventory: Map<string, InventorySnapshot>, totalMugLoss: number): LedgerTotals => {
    const totalProfit = Array.from(inventory.values()).reduce((sum, item) => {
      return sum + (inventoryScope === 'abroad' ? item.abroadRealizedProfit : item.realizedProfit);
    }, 0);
    const totalInventoryValue = Array.from(inventory.values()).reduce((sum, item) => {
      const totalCost = inventoryScope === 'abroad' ? item.abroadTotalCost : item.totalCost;
      return sum + Math.max(0, totalCost);
    }, 0);

    return {
      profit: totalProfit,
      inventory: totalInventoryValue,
      mugLoss: totalMugLoss,
      netProfit: totalProfit - totalMugLoss
    };
  };

  const getChartValue = (currentTotals: LedgerTotals, previousTotals: LedgerTotals, cumulative: boolean) => {
    if (cumulative) {
      switch (statType) {
        case 'profit':
          return currentTotals.profit;
        case 'inventory':
          return currentTotals.inventory;
        case 'mugLoss':
          return currentTotals.mugLoss;
        case 'netProfit':
          return currentTotals.netProfit;
      }
    } else {
      switch (statType) {
        case 'profit':
          return currentTotals.profit - previousTotals.profit;
        case 'inventory':
          return currentTotals.inventory;
        case 'mugLoss':
          return currentTotals.mugLoss - previousTotals.mugLoss;
        case 'netProfit':
          return currentTotals.netProfit - previousTotals.netProfit;
      }
    }
  };

  const generateChartData = () => {
    const now = new Date();
    let periods: Date[] = [];
    let formatStr = '';

    switch (timeRange) {
      case 'daily':
        periods = Array.from({ length: 30 }, (_, i) => subDays(now, 29 - i));
        formatStr = 'MMM dd';
        break;
      case 'weekly':
        periods = Array.from({ length: 12 }, (_, i) => subWeeks(now, 11 - i));
        formatStr = 'MMM dd';
        break;
      case 'monthly':
        periods = Array.from({ length: 12 }, (_, i) => subMonths(now, 11 - i));
        formatStr = 'MMM yyyy';
        break;
    }

    const sortedTransactions = [...transactions].sort((a, b) => {
      if (a.date !== b.date) return a.date - b.date;

      const getPriority = (transaction: Transaction) => {
        if (transaction.type === 'BUY') return 0;
        return 1;
      };

      return getPriority(a) - getPriority(b);
    });
    const inventory = new Map<string, InventorySnapshot>();
    const mugState = { total: 0 };
    let transactionIndex = 0;
    let previousTotals: LedgerTotals = { profit: 0, inventory: 0, mugLoss: 0, netProfit: 0 };

    return periods.map(period => {
      let periodEnd: Date;

      switch (timeRange) {
        case 'daily':
          periodEnd = endOfDay(startOfDay(period));
          break;
        case 'weekly':
          periodEnd = endOfWeek(startOfWeek(period));
          break;
        case 'monthly':
          periodEnd = endOfMonth(startOfMonth(period));
          break;
      }

      while (transactionIndex < sortedTransactions.length && sortedTransactions[transactionIndex].date <= periodEnd.getTime()) {
        applyTransaction(inventory, sortedTransactions[transactionIndex], mugState);
        transactionIndex += 1;
      }

      const currentTotals = getTotals(inventory, mugState.total);
      
      const realizedProfit = currentTotals.profit;
      const mugLoss = currentTotals.mugLoss;
      const netProfit = currentTotals.netProfit;
      
      // For incremental view, calculate period-over-period values
      const incrementalRealized = realizedProfit - previousTotals.profit;
      const incrementalMug = mugLoss - previousTotals.mugLoss;
      const incrementalNet = netProfit - previousTotals.netProfit;
      
      previousTotals = currentTotals;

      return {
        period: format(period, formatStr),
        realizedProfit: Math.round(viewType === 'cumulative' ? realizedProfit : incrementalRealized),
        mugLoss: -Math.round(viewType === 'cumulative' ? mugLoss : incrementalMug), // Negative so it shows below axis
        netProfit: Math.round(viewType === 'cumulative' ? netProfit : incrementalNet),
        date: period.toISOString()
      };
    });
  };

  const chartData = generateChartData();
  
  // Calculate stats based on net profit for the summary
  const totalNetProfit = chartData.reduce((sum, item) => sum + item.netProfit, 0);
  const latestNetProfit = chartData.length > 0 ? chartData[chartData.length - 1].netProfit : 0;
  const averageNetProfit = chartData.length > 0
    ? Math.round(totalNetProfit / chartData.length)
    : 0;
  const highestNetProfit = chartData.length > 0 ? Math.max(...chartData.map(item => item.netProfit)) : 0;
  const lowestNetProfit = chartData.length > 0 ? Math.min(...chartData.map(item => item.netProfit)) : 0;
  const primarySummaryLabel = 'Latest Net';
  const primarySummaryValue = latestNetProfit;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-panel rounded-xl border border-border shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold">{title} Trends</h2>
            <p className="text-sm text-foreground/60 mt-1">Historical data over time</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-foreground/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${timeRange === range
                    ? 'bg-primary text-white'
                    : 'bg-foreground/5 hover:bg-foreground/10 text-foreground/70'
                    }`}
                >
                  {range === 'daily' && <Calendar className="w-4 h-4" />}
                  {range === 'weekly' && <BarChart3 className="w-4 h-4" />}
                  {range === 'monthly' && <TrendingUp className="w-4 h-4" />}
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setViewType('cumulative')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewType === 'cumulative'
                  ? 'bg-primary text-white'
                  : 'bg-foreground/5 hover:bg-foreground/10 text-foreground/70'
                  }`}
              >
                Cumulative
              </button>
              <button
                onClick={() => setViewType('incremental')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewType === 'incremental'
                  ? 'bg-primary text-white'
                  : 'bg-foreground/5 hover:bg-foreground/10 text-foreground/70'
                  }`}
              >
                Incremental
              </button>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRealized" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorMug" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis
                  dataKey="period"
                  stroke="currentColor"
                  opacity={0.6}
                  fontSize={12}
                />
                <YAxis
                  stroke="currentColor"
                  opacity={0.6}
                  fontSize={12}
                  tickFormatter={(value) => formatCompactCurrency(Number(value))}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--panel))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value, name) => [formatCompactCurrency(Number(value || 0)), name === 'netProfit' ? 'Net Profit' : name === 'realizedProfit' ? 'Realized Profit' : 'Mug Loss']}
                />
                {/* Mug Loss Area - shown as negative (red) */}
                <Area
                  type="monotone"
                  dataKey="mugLoss"
                  stackId="1"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#colorMug)"
                  fillOpacity={0.6}
                />
                {/* Realized Profit Area - shown as positive (green) */}
                <Area
                  type="monotone"
                  dataKey="realizedProfit"
                  stackId="1"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#colorRealized)"
                  fillOpacity={0.6}
                />
                {/* Net Profit Line - black */}
                <Line
                  type="monotone"
                  dataKey="netProfit"
                  stroke="#000000"
                  strokeWidth={3}
                  dot={{ fill: '#000000', strokeWidth: 1.5, r: 3 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-foreground/5 rounded-lg p-3">
              <div className="text-foreground/60">{primarySummaryLabel}</div>
              <div className="font-semibold">
                {formatCompactCurrency(primarySummaryValue)}
              </div>
            </div>
            <div className="bg-foreground/5 rounded-lg p-3">
              <div className="text-foreground/60">Average Net</div>
              <div className="font-semibold">
                {formatCompactCurrency(averageNetProfit)}
              </div>
            </div>
            <div className="bg-foreground/5 rounded-lg p-3">
              <div className="text-foreground/60">Highest Net</div>
              <div className="font-semibold">
                {formatCompactCurrency(highestNetProfit)}
              </div>
            </div>
            <div className="bg-foreground/5 rounded-lg p-3">
              <div className="text-foreground/60">Lowest Net</div>
              <div className="font-semibold">
                {formatCompactCurrency(lowestNetProfit)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
