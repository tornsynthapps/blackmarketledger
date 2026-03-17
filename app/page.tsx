"use client";

import { useJournal, InventoryItemStats } from "@/store/useJournal";
import { formatItemName } from "@/lib/parser";
import { TrendingUp, PackageSearch, AlertTriangle, Activity, Edit2, ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useHapticFeedback } from "@/lib/useHapticFeedback";

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
  } = useJournal();
  const router = useRouter();
  const { vibrate } = useHapticFeedback();

  type SortKey = 'name' | 'stock' | 'avgCost' | 'totalCost' | 'realizedProfit';
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'stock',
    direction: 'desc'
  });
  const [search, setSearch] = useState("");

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

    let sorted = filtered.sort((a, b) => {
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

  if (!isLoaded) return <div className="text-center py-20 animate-pulse text-foreground/50">Loading Tracker Data...</div>;

  const handleSort = (key: SortKey) => {
    vibrate("utility");
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const netTotal = stats.profit - totalMugLoss;
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Realized Profit"
          value={formatMoney(stats.profit)}
          icon={<TrendingUp className="text-success w-5 h-5" />}
          description="From sold items only"
        />
        <StatCard
          title="Current Inventory Value"
          value={formatMoney(stats.invValue)}
          icon={<PackageSearch className="text-primary w-5 h-5" />}
          description="Cost basis of stock"
        />
        <StatCard
          title="Total Mug Loss"
          value={formatMoney(totalMugLoss)}
          icon={<AlertTriangle className="text-danger w-5 h-5" />}
          description="Lost to muggers"
          valueClass="text-danger"
        />
        <StatCard
          title="Net Total Profit"
          value={formatMoney(netTotal)}
          icon={<Activity className="text-primary w-5 h-5" />}
          description="Realized - Mug Loss"
          valueClass={netTotal >= 0 ? "text-success" : "text-danger"}
        />
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
    </div>
  );
}

function StatCard({
  title, value, icon, description, valueClass = "", colorClass = "bg-primary"
}: {
  title: string, value: string, icon: React.ReactNode, description: string, valueClass?: string, colorClass?: string
}) {
  return (
    <div className="bg-panel p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-2xl transition-colors opacity-10 group-hover:opacity-20 ${colorClass}`} />
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-sm font-medium text-foreground/70">{title}</h3>
        <div className="p-2 bg-foreground/5 rounded-lg">{icon}</div>
      </div>
      <div className="relative z-10">
        <p className={`text-2xl font-bold tracking-tight ${valueClass}`}>{value}</p>
        <p className="text-xs text-foreground/50 mt-2">{description}</p>
      </div>
    </div>
  );
}
