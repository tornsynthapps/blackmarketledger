"use client";

import { useJournal, InventoryItemStats } from "@/store/useJournal";
import { formatItemName } from "@/lib/parser";
import { TrendingUp, PackageSearch, AlertTriangle, Activity, Edit2, ArrowUpDown, ArrowUp, ArrowDown, Search, Coins } from "lucide-react";
import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useHapticFeedback } from "@/lib/useHapticFeedback";
import StatsModal from "@/components/StatsModal";
import { ProfitChart } from "@/components/ProfitChart";
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subYears, endOfYear } from "date-fns";

const formatMoney = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(val);
};

export default function Home() {
  const {
    isLoaded,
    inventory,
    totalMugLoss,
    renameItem,
    transactions,
  } = useJournal();
  const router = useRouter();
  const { vibrate } = useHapticFeedback();

  type SortKey = 'name' | 'stock' | 'avgCost' | 'totalCost' | 'realizedProfit';
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'stock',
    direction: 'desc'
  });
  const [search, setSearch] = useState("");
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    statType: 'profit' | 'inventory' | 'mugLoss' | 'netProfit';
  }>({
    isOpen: false,
    title: '',
    statType: 'profit'
  });

  // Chart state
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [viewType, setViewType] = useState<'daily' | 'total'>('daily');

  const { stats, sortedItems } = useMemo(() => {
    let profit = 0;
    let invValue = 0;
    const items: { name: string; stats: InventoryItemStats }[] = [];

    inventory.forEach((stat, name) => {
      // Exclude Flushies and Points from main dashboard
      if (name.toLowerCase() !== 'flushie' && name.toLowerCase() !== 'points') {
        profit += stat.realizedProfit;
        invValue += Math.max(0, stat.totalCost);
        items.push({ name, stats: stat });
      }
    });

    let filtered = items;
    if (search.trim()) {
      filtered = items.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));
    }

    const sorted = filtered.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      if (sortConfig.key === 'name') {
        aVal = a.name;
        bVal = b.name;
      } else if (sortConfig.key === 'avgCost') {
        aVal = a.stats.stock > 0 ? a.stats.totalCost / a.stats.stock : 0;
        bVal = b.stats.stock > 0 ? b.stats.totalCost / b.stats.stock : 0;
      } else {
        aVal = a.stats[sortConfig.key];
        bVal = b.stats[sortConfig.key];
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return {
      stats: { profit, invValue },
      sortedItems: sorted
    };
  }, [inventory, sortConfig, search]);

  const handleSort = (key: SortKey) => {
    vibrate("utility");
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const openStatsModal = (title: string, statType: 'profit' | 'inventory' | 'mugLoss' | 'netProfit') => {
    vibrate("nav");
    setModalState({ isOpen: true, title, statType });
  };

  const closeStatsModal = () => {
    setModalState({ isOpen: false, title: '', statType: 'profit' });
  };

  const netTotal = stats.profit - totalMugLoss;


  // Chart data generation
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
      periods = Array.from({ length: 5 }, (_, i) => subMonths(now, (4 - i) * 12));
      dateFormat = 'yyyy';
    }
    
    const sortedTransactions = [...transactions].sort((a, b) => {
      if (a.date !== b.date) return a.date - b.date;
      return (a.type === 'BUY' ? 0 : 1) - (b.type === 'BUY' ? 0 : 1);
    });

    // Process transactions similar to StatsModal but for all items (excluding flushie and points)
    const tempInventory = new Map<string, { stock: number; totalCost: number; realizedProfit: number }>();
    let totalMug = 0;
    let transactionIndex = 0;
    
    // Track previous totals for incremental view
    let lastPeriodRealized = 0;
    let lastPeriodMug = 0;
    
    return periods.map(period => {
      let periodEnd: Date;
      if (timeRange === 'daily') periodEnd = endOfDay(startOfDay(period));
      else if (timeRange === 'weekly') periodEnd = endOfWeek(startOfWeek(period));
      else if (timeRange === 'monthly') periodEnd = endOfMonth(startOfMonth(period));
      else periodEnd = endOfYear(startOfMonth(period));

      while (transactionIndex < sortedTransactions.length && sortedTransactions[transactionIndex].date <= periodEnd.getTime()) {
        const t = sortedTransactions[transactionIndex];
        
        if (t.type === 'MUG') {
          totalMug += t.amount;
        } else if ('item' in t && t.item) {
          // Skip flushie and points
          if (t.item.toLowerCase() === 'flushie' || t.item.toLowerCase() === 'points') {
            transactionIndex++;
            continue;
          }
          
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
        }
        
        transactionIndex++;
      }

      // Calculate totals
      let totalRealized = 0;
      tempInventory.forEach(item => {
        totalRealized += item.realizedProfit;
      });
      
      const totalMugLoss = totalMug;
      const netProfit = totalRealized - totalMugLoss;
      
      // For incremental view, get period-over-period values
      const incrementalRealized = totalRealized - lastPeriodRealized;
      const incrementalMug = totalMugLoss - lastPeriodMug;
      const incrementalNet = netProfit - (lastPeriodRealized - lastPeriodMug);
      
      lastPeriodRealized = totalRealized;
      lastPeriodMug = totalMugLoss;

      return {
        date: format(period, dateFormat),
        ts: periodEnd.getTime(),
        realizedProfit: Math.round(viewType === 'total' ? totalRealized : incrementalRealized),
        mugLoss: -Math.round(viewType === 'total' ? totalMugLoss : incrementalMug), // Negative so it shows below axis
        netProfit: Math.round(viewType === 'total' ? netProfit : incrementalNet)
      };
    });
  }, [isLoaded, transactions, timeRange, viewType]);
  
  if (!isLoaded) return <div className="text-center py-20 animate-pulse text-foreground/50">Loading Tracker Data...</div>;


  // Calculate reference values
  const finalNetProfit = chartData.length > 0 ? chartData[chartData.length - 1].netProfit : 0;
  const averageNetProfit = chartData.length > 0 
    ? Math.round(chartData.reduce((acc, curr) => acc + curr.netProfit, 0) / chartData.length) 
    : 0;
  const referenceValue = viewType === 'daily' ? averageNetProfit : finalNetProfit;
  return (
    <div
      className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{
        '--primary': '#3b82f6', // Blue
      } as React.CSSProperties}
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Main Dashboard</h1>
          <p className="text-foreground/60 mt-2">Track your general trading items, profits, and losses. Click an item to view history.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/docs')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-panel border border-border hover:bg-foreground/5 transition-colors font-medium text-sm text-foreground/80 hover:text-foreground"
          >
            Documentation
          </button>
        </div>
      </div>

      {/* Hero Section: 1/3 Stats List - 2/3 Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-panel rounded-3xl border border-border shadow-2xl p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-bl-[10rem] -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-tr-[8rem] -z-10 pointer-events-none" />

        {/* Overview List (1/3) */}
        <div className="space-y-8 pr-0 lg:pr-8 border-r-0 lg:border-r border-border/50">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-6 flex items-center gap-2">
              <Activity className="w-3 h-3" />
              Profit Overview
            </h2>
            
            <div className="space-y-6">
              <OverviewItem 
                icon={<TrendingUp className="w-4 h-4" />}
                label="Total Realized Profit"
                value={formatMoney(stats.profit)}
                subValue="From sold items"
                valueClass="text-success"
              />
              <OverviewItem 
                icon={<AlertTriangle className="w-4 h-4" />}
                label="Total Mug Loss"
                value={formatMoney(totalMugLoss)}
                subValue="Lost to muggers"
                valueClass="text-danger"
              />
              <OverviewItem 
                icon={<Activity className="w-4 h-4" />}
                label="Net Total Profit"
                value={formatMoney(netTotal)}
                subValue="Realized - Mug"
                valueClass={netTotal >= 0 ? "text-success" : "text-danger"}
              />
              <OverviewItem 
                icon={<PackageSearch className="w-4 h-4" />}
                label="Inventory Value"
                value={formatMoney(stats.invValue)}
                subValue="Cost basis"
              />
            </div>
          </div>
        </div>

        {/* Chart Area (2/3) */}
        <div className="lg:col-span-2 pl-0 lg:pl-4 mt-6 lg:mt-0">
          <ProfitChart 
            chartId="dashboard-main"
            data={chartData}
            viewType={viewType}
            setViewType={setViewType}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            referenceValue={referenceValue}
            primaryColor="#3b82f6"
            formatValue={formatMoney}
            stackedMode={true}
          />
        </div>
      </div>

      <div className="mt-8 bg-panel rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-foreground/[0.02] flex items-center justify-between gap-4">
          <h2 className="font-semibold text-lg hidden sm:block">Inventory & Profits</h2>
          <div className="relative w-full sm:max-w-xs text-sm">
            <Search className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search inventory items..."
              value={search}
              onChange={(e) => {
                if (!search && e.target.value) {
                  vibrate("utility");
                }
                setSearch(e.target.value);
              }}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-foreground/60 bg-foreground/5">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:bg-foreground/10 transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-2">Item Name {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-50" />}</div>
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-foreground/10 transition-colors" onClick={() => handleSort('stock')}>
                  <div className="flex items-center justify-end gap-2">{sortConfig.key === 'stock' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-50" />} Stock</div>
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-foreground/10 transition-colors" onClick={() => handleSort('avgCost')}>
                  <div className="flex items-center justify-end gap-2">{sortConfig.key === 'avgCost' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-50" />} Avg Cost Basis</div>
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-foreground/10 transition-colors" onClick={() => handleSort('totalCost')}>
                  <div className="flex items-center justify-end gap-2">{sortConfig.key === 'totalCost' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-50" />} Total Cost</div>
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-foreground/10 transition-colors" onClick={() => handleSort('realizedProfit')}>
                  <div className="flex items-center justify-end gap-2">{sortConfig.key === 'realizedProfit' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-50" />} Realized Profit</div>
                </th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-foreground/50 italic">
                    No items found. Add some logs to start tracking.
                  </td>
                </tr>
              ) : (
                sortedItems.map(({ name, stats }) => {
                  const avgCost = stats.stock > 0 ? stats.totalCost / stats.stock : 0;
                  return (
                    <tr
                      key={name}
                      onClick={() => {
                        vibrate("nav");
                        router.push(`/logs?item=${encodeURIComponent(name)}`);
                      }}
                      className="hover:bg-primary/5 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 font-medium group-hover:text-primary transition-colors">{formatItemName(name)}</td>
                      <td className="px-6 py-4 text-right font-mono">
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded-md">
                          {stats.stock.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-foreground/70">{formatMoney(avgCost)}</td>
                      <td className="px-6 py-4 text-right">{formatMoney(stats.totalCost)}</td>
                      <td className={`px-6 py-4 text-right font-medium ${stats.realizedProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatMoney(stats.realizedProfit)}
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newName = prompt(`Enter new name for ${formatItemName(name)}.\n\nIf you enter the name of another existing item, their logs will be MERGED automatically.`, formatItemName(name));
                            if (newName !== null && newName !== formatItemName(name)) {
                              if (confirm(`Are you sure you want to rename/merge '${formatItemName(name)}' to '${formatItemName(newName)}'? This updates all logs.`)) {
                                vibrate("success");
                                renameItem(name, newName);
                              }
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 text-foreground/50 hover:text-primary hover:bg-primary/10 p-2 rounded-lg transition-all"
                          title="Rename or Merge Item"
                        >
                          <Edit2 className="w-4 h-4" />
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
        transactions={transactions}
        statType={modalState.statType}
        excludedItems={['flushie', 'points']}
        inventoryScope="normal"
      />
    </div>
  );
}

function StatCard({
  title, value, icon, description, valueClass = "", colorClass = "bg-primary", onClick
}: {
  title: string, value: string, icon: React.ReactNode, description: string, valueClass?: string, colorClass?: string, onClick?: () => void
}) {
  return (
    <div 
      className={`bg-panel p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-all relative overflow-hidden group ${
        onClick ? 'cursor-pointer hover:scale-[1.02]' : ''
      }`}
      onClick={onClick}
    >
      <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-2xl transition-colors opacity-10 group-hover:opacity-20 ${colorClass}`} />
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-sm font-medium text-foreground/70">{title}</h3>
        <div className="p-2 bg-foreground/5 rounded-lg">{icon}</div>
      </div>
      <div className="relative z-10">
        <p className={`text-2xl font-bold tracking-tight ${valueClass}`}>{value}</p>
        <p className="text-xs text-foreground/50 mt-2">{description}</p>
        {onClick && (
          <p className="text-xs text-primary/70 mt-1 font-medium">Click to view trends</p>
        )}
      </div>
    </div>
  );
}

function OverviewItem({
  icon, label, value, subValue, valueClass = ""
}: {
  icon: React.ReactNode, label: string, value: string, subValue: string, valueClass?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-foreground/5 rounded-lg mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">{label}</p>
        <p className={`text-lg font-black tracking-tight ${valueClass}`}>{value}</p>
        <p className="text-[9px] font-medium text-foreground/30 mt-0.5">{subValue}</p>
      </div>
    </div>
  );
}
