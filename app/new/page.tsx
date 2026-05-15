"use client";

import { ItemLogService } from "@/lib/domain/ItemLogService";
import { ItemLog } from "@/lib/objects/ItemLog";
import { formatItemName, MUSEUM_TRACKED_ITEMS } from "@/lib/old/parser";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    ArrowUp02Icon,
    PackageSearchIcon,
    AlertCircleIcon,
    Activity01Icon,
    ArrowUpDownIcon,
    ArrowUp01Icon,
    ArrowDown01Icon,
    Search01Icon,
    Coins01Icon,
    ArrowRight01Icon,
    ArrowLeft01Icon,
    StarIcon,
} from "@hugeicons/core-free-icons";
import { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHapticFeedback } from "@/lib/old/useHapticFeedback";
import StatsModal from "@/components/StatsModal";
import { ProfitChart } from "@/components/ProfitChart";
import { PointsIcon } from "@/components/PointsIcon";
import { ItemSetIcon } from "@/components/ItemSetIcon";
import { CATEGORY_COLORS } from "@/lib/old/theme";
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
import { TornAPIClient } from "@/lib/tornAPI";

interface InventoryItemStats {
    stock: number;
    totalCost: number;
    realizedProfit: number;
    abroadStock: number;
    abroadTotalCost: number;
    abroadRealizedProfit: number;
}

const formatMoney = (val: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(val);
};

export default function NewDashboard() {
    const itemLogService = useMemo(() => new ItemLogService(), []);
    const router = useRouter();
    const { vibrate } = useHapticFeedback();

    const [isLoaded, setIsLoaded] = useState(false);
    const [logs, setLogs] = useState<ItemLog[]>([]);
    const [itemNames, setItemNames] = useState<Record<number, string>>({});

    const fetchData = useCallback(async () => {
        try {
            const [allLogs, names] = await Promise.all([
                itemLogService.getAllLogs(),
                TornAPIClient.getItemNames(),
            ]);
            setLogs(allLogs);
            setItemNames(names);
            setIsLoaded(true);
        } catch (error) {
            console.error("V2 Dashboard fetch failed:", error);
        }
    }, [itemLogService]);

    useEffect(() => {
        fetchData();
        // Refresh periodically
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    type SortKey = "name" | "stock" | "avgCost" | "totalCost" | "realizedProfit";
    const [sortConfig, setSortConfig] = useState<{
        key: SortKey;
        direction: "asc" | "desc";
    }>({
        key: "stock",
        direction: "desc",
    });
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        title: string;
        statType: "profit" | "inventory" | "mugLoss" | "netProfit";
    }>({
        isOpen: false,
        title: "",
        statType: "profit",
    });

    // Chart state
    const [timeRange, setTimeRange] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");
    const [viewType, setViewType] = useState<"daily" | "total">("daily");

    // Chart toggles
    const [includeTrading, setIncludeTrading] = useState(true);
    const [includeMuseum, setIncludeMuseum] = useState(false);
    const [includeAbroad, setIncludeAbroad] = useState(false);
    const [includeMug, setIncludeMug] = useState(true);
    const [includeNetProfit, setIncludeNetProfit] = useState(true);

    // Grouping state
    const [isGrouped, setIsGrouped] = useState(true);
    const [itemTypeMap, setItemTypeMap] = useState<Record<string, { type: string }>>({});
    const [favoriteGroups, setFavoriteGroups] = useState<Set<string>>(new Set());

    // Load prefs
    useEffect(() => {
        const prefs = localStorage.getItem("bml-main-chart-prefs-v2");
        if (prefs) {
            try {
                const p = JSON.parse(prefs);
                if (p.includeTrading !== undefined) setIncludeTrading(p.includeTrading);
                if (p.includeMuseum !== undefined) setIncludeMuseum(p.includeMuseum);
                if (p.includeAbroad !== undefined) setIncludeAbroad(p.includeAbroad);
                if (p.includeMug !== undefined) setIncludeMug(p.includeMug);
                if (p.includeNetProfit !== undefined) setIncludeNetProfit(p.includeNetProfit);
                if (p.viewType !== undefined) setViewType(p.viewType);
                if (p.timeRange !== undefined) setTimeRange(p.timeRange);
            } catch {}
        }

        const sortPref = localStorage.getItem("bml-inventory-sort-pref-v2");
        if (sortPref) {
            try {
                setSortConfig(JSON.parse(sortPref));
            } catch {}
        }

        const groupedPref = localStorage.getItem("bml-dashboard-grouped-pref-v2");
        if (groupedPref) {
            try {
                setIsGrouped(JSON.parse(groupedPref));
            } catch {}
        }

        const savedGroups = localStorage.getItem("bml-dashboard-favorite-groups-v2");
        if (savedGroups) {
            try {
                setFavoriteGroups(new Set(JSON.parse(savedGroups)));
            } catch {}
        }

        // Load item types for grouping
        fetch("/items.json")
            .then((res) => res.json())
            .then((data) => setItemTypeMap(data))
            .catch((err) => console.error("Failed to load item types", err));
    }, []);

    // Save prefs
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(
                "bml-main-chart-prefs-v2",
                JSON.stringify({
                    includeTrading,
                    includeMuseum,
                    includeAbroad,
                    includeMug,
                    includeNetProfit,
                    viewType,
                    timeRange,
                })
            );
        }
    }, [
        includeTrading,
        includeMuseum,
        includeAbroad,
        includeMug,
        includeNetProfit,
        viewType,
        timeRange,
        isLoaded,
    ]);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem("bml-inventory-sort-pref-v2", JSON.stringify(sortConfig));
        }
    }, [sortConfig, isLoaded]);

    useEffect(() => {
        localStorage.setItem("bml-dashboard-grouped-pref-v2", JSON.stringify(isGrouped));
    }, [isGrouped]);

    const toggleGroupFavorites = (groupName: string) => {
        setFavoriteGroups((current) => {
            const next = new Set(current);
            if (next.has(groupName)) {
                next.delete(groupName);
            } else {
                next.add(groupName);
            }
            localStorage.setItem("bml-dashboard-favorite-groups-v2", JSON.stringify(Array.from(next)));
            return next;
        });
    };

    const inventory = useMemo(() => {
        const statsMap = new Map<string, InventoryItemStats>();
        
        // Group logs by item
        const logsByItem = new Map<number, ItemLog[]>();
        logs.forEach(log => {
            if (!logsByItem.has(log.item_id)) logsByItem.set(log.item_id, []);
            logsByItem.get(log.item_id)!.push(log);
        });

        logsByItem.forEach((itemLogs, itemId) => {
            const name = itemNames[itemId] || `Item ${itemId}`;
            
            // Get latest log per category
            const latestByCategory = new Map<string, ItemLog>();
            itemLogs.forEach(log => {
                const existing = latestByCategory.get(log.category);
                if (!existing || log.timestamp > existing.timestamp) {
                    latestByCategory.set(log.category, log);
                }
            });

            const stats: InventoryItemStats = {
                stock: 0,
                totalCost: 0,
                realizedProfit: 0,
                abroadStock: 0,
                abroadTotalCost: 0,
                abroadRealizedProfit: 0,
            };

            latestByCategory.forEach((log, category) => {
                if (category === "abroad") {
                    stats.abroadStock = log.total_stock;
                    stats.abroadTotalCost = log.total_cost;
                    stats.abroadRealizedProfit = log.realized_profit;
                } else if (category !== "skipped") {
                    stats.stock += log.total_stock;
                    stats.totalCost += log.total_cost;
                    stats.realizedProfit += log.realized_profit;
                }
            });

            statsMap.set(name, stats);
        });

        return statsMap;
    }, [logs, itemNames]);

    const { stats, sortedItems } = useMemo(() => {
        let tradingProfit = 0;
        let totalInvValue = 0;
        let museumProfit = 0;
        let abroadProfit = 0;
        const items: { name: string; stats: InventoryItemStats; itemID: number }[] = [];

        inventory.forEach((stat, name) => {
            const isMuseum = name.toLowerCase() === "points";
            abroadProfit += stat.abroadRealizedProfit;

            let itemProfit = stat.realizedProfit;
            let itemValue = Math.max(0, stat.totalCost);
            let itemStock = stat.stock;

            if (includeAbroad) {
                itemProfit += stat.abroadRealizedProfit;
                itemValue += Math.max(0, stat.abroadTotalCost);
                itemStock += stat.abroadStock;
            }

            const itemID = Object.entries(itemNames).find(([, n]) => n === name)?.[0];
            const numericID = itemID ? parseInt(itemID, 10) : 0;

            if (isMuseum) {
                museumProfit += stat.realizedProfit;
                if (includeMuseum) {
                    items.push({
                        name,
                        stats: { ...stat, realizedProfit: itemProfit, totalCost: itemValue, stock: itemStock },
                        itemID: numericID
                    });
                    totalInvValue += itemValue;
                }
            } else {
                tradingProfit += stat.realizedProfit;
                if (includeTrading) {
                    items.push({
                        name,
                        stats: { ...stat, realizedProfit: itemProfit, totalCost: itemValue, stock: itemStock },
                        itemID: numericID
                    });
                    totalInvValue += itemValue;
                }
            }
        });

        const filtered = items.filter((item) => {
            const query = search.toLowerCase();
            const itemNameMatch = item.name.toLowerCase().includes(query);
            
            let itemType = item.name.toLowerCase() === "points" 
                ? "Points" 
                : (item.itemID ? itemTypeMap[String(item.itemID)] : undefined)?.type || "Other";
            
            // Museum set overrides
            if (item.name.toLowerCase() === "flower set") itemType = "Flower";
            if (item.name.toLowerCase() === "plushie set") itemType = "Plushie";
            
            const itemTypeMatch = itemType.toLowerCase().includes(query);
            
            return itemNameMatch || itemTypeMatch;
        });

        const sorted = filtered.sort((a, b) => {
            let aVal: number | string;
            let bVal: number | string;

            if (sortConfig.key === "name") {
                aVal = a.name;
                bVal = b.name;
            } else if (sortConfig.key === "avgCost") {
                aVal = a.stats.stock > 0 ? a.stats.totalCost / a.stats.stock : 0;
                bVal = b.stats.stock > 0 ? b.stats.totalCost / b.stats.stock : 0;
            } else {
                aVal = a.stats[sortConfig.key];
                bVal = b.stats[sortConfig.key];
            }

            if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });

        return {
            stats: { profit: tradingProfit, inventory: totalInvValue, museumProfit, abroadProfit },
            sortedItems: sorted,
        };
    }, [inventory, sortConfig, search, includeTrading, includeMuseum, includeAbroad, itemNames, itemTypeMap]);

    const enrichedItems = useMemo(() => {
        return sortedItems.map(({ name, stats, itemID }) => {
            let itemType = name.toLowerCase() === "points" 
                ? "Points" 
                : (itemID ? itemTypeMap[String(itemID)] : undefined)?.type || "Other";
            
            // Museum set overrides
            if (name.toLowerCase() === "flower set") itemType = "Flower";
            if (name.toLowerCase() === "plushie set") itemType = "Plushie";

            return {
                name,
                stats,
                itemType,
                itemID,
            };
        });
    }, [sortedItems, itemTypeMap]);

    const groupedItems = useMemo(() => {
        if (!isGrouped) return null;
        const groups: Record<string, typeof enrichedItems> = {};

        for (const item of enrichedItems) {
            const type = item.itemType;

            if (!groups[type]) groups[type] = [];
            groups[type].push(item);
        }

        const getGroupValue = (items: typeof enrichedItems) => {
            switch (sortConfig.key) {
                case "stock":
                    return items.reduce((sum, item) => sum + item.stats.stock, 0);
                case "totalCost":
                    return items.reduce((sum, item) => sum + item.stats.totalCost, 0);
                case "realizedProfit":
                    return items.reduce((sum, item) => sum + item.stats.realizedProfit, 0);
                case "avgCost": {
                    const totalStock = items.reduce((sum, item) => sum + item.stats.stock, 0);
                    const totalCost = items.reduce((sum, item) => sum + item.stats.totalCost, 0);
                    return totalStock > 0 ? totalCost / totalStock : 0;
                }
                default:
                    return 0;
            }
        };

        return Object.entries(groups).sort(([a, aItems], [b, bItems]) => {
            const aFav = favoriteGroups.has(a);
            const bFav = favoriteGroups.has(b);
            if (aFav !== bFav) return aFav ? -1 : 1;

            if (sortConfig.key !== "name") {
                const aVal = getGroupValue(aItems);
                const bVal = getGroupValue(bItems);
                if (aVal !== bVal) {
                    return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
                }
            }

            return a.localeCompare(b);
        });
    }, [isGrouped, enrichedItems, favoriteGroups, sortConfig]);

    const totalPages = Math.ceil(sortedItems.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedItems = sortedItems.slice(startIndex, endIndex);

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleSort = (key: SortKey) => {
        vibrate("utility");
        let direction: "asc" | "desc" = "desc";
        if (sortConfig.key === key && sortConfig.direction === "desc") {
            direction = "asc";
        }
        setSortConfig({ key, direction });
    };

    const closeStatsModal = () => {
        setModalState({ isOpen: false, title: "", statType: "profit" });
    };

    const totalMugLoss = 0; // V2 doesn't have mug loss yet
    const netTotal = stats.profit + stats.museumProfit + stats.abroadProfit - totalMugLoss;


    // Chart data generation
    const chartData = useMemo(() => {
        if (!isLoaded || !logs.length) return [];

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
            periods = Array.from({ length: 5 }, (_, i) => subMonths(now, (4 - i) * 12));
            dateFormat = "yyyy";
        }

        const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);

        if (sortedLogs.length > 0) {
            const firstDate = new Date(sortedLogs[0].timestamp);
            let minDate: Date;
            if (timeRange === "daily") minDate = startOfDay(subDays(firstDate, 1));
            else if (timeRange === "weekly") minDate = startOfWeek(subWeeks(firstDate, 1));
            else if (timeRange === "monthly") minDate = startOfMonth(subMonths(firstDate, 1));
            else minDate = startOfYear(subYears(firstDate, 1));

            periods = periods.filter((p) => p.getTime() >= minDate.getTime());
        }

        let logIndex = 0;
        const currentTotalsByCategory = new Map<string, Map<number, { profit: number }>>();

        // Track previous totals for incremental view
        let previousTotals = {
            profit: 0,
            museumProfit: 0,
            abroadProfit: 0,
            netProfit: 0
        };

        return periods.map((period) => {
            let periodEnd: Date;
            if (timeRange === "daily") periodEnd = endOfDay(startOfDay(period));
            else if (timeRange === "weekly") periodEnd = endOfWeek(startOfWeek(period));
            else if (timeRange === "monthly") periodEnd = endOfMonth(startOfMonth(period));
            else periodEnd = endOfYear(startOfMonth(period));

            while (
                logIndex < sortedLogs.length &&
                sortedLogs[logIndex].timestamp <= periodEnd.getTime()
            ) {
                const log = sortedLogs[logIndex];
                if (!currentTotalsByCategory.has(log.category)) {
                    currentTotalsByCategory.set(log.category, new Map());
                }
                currentTotalsByCategory.get(log.category)!.set(log.item_id, { profit: log.realized_profit });
                logIndex++;
            }

            let totalRealized = 0;
            let museumProfit = 0;
            let abroadProfit = 0;

            currentTotalsByCategory.forEach((itemMap, category) => {
                let categoryProfit = 0;
                itemMap.forEach(itemStats => {
                    categoryProfit += itemStats.profit;
                });

                if (category === "abroad") abroadProfit += categoryProfit;
                else if (category === "museum") museumProfit += categoryProfit;
                else if (category !== "skipped") totalRealized += categoryProfit;
            });

            // Special case: "Points" might be in "normal" but we want it in "museum" if it matches old dashboard logic
            // In V2, "Points" should probably just be in "museum" category.

            let baseNetProfit = 0;
            if (includeTrading) baseNetProfit += totalRealized;
            if (includeMuseum) baseNetProfit += museumProfit;
            if (includeAbroad) baseNetProfit += abroadProfit;

            const netProfit = baseNetProfit - (includeMug ? totalMugLoss : 0);

            const incrementalRealized = totalRealized - previousTotals.profit;
            const incrementalNet = netProfit - (previousTotals.netProfit || 0);
            const incrementalMuseum = museumProfit - previousTotals.museumProfit;
            const incrementalAbroad = abroadProfit - previousTotals.abroadProfit;

            previousTotals = {
                profit: totalRealized,
                museumProfit,
                abroadProfit,
                netProfit,
            };

            return {
                date: format(period, dateFormat),
                ts: periodEnd.getTime(),
                realizedProfit: Math.round(
                    viewType === "total" ? totalRealized : incrementalRealized
                ),
                mugLoss: 0,
                netProfit: Math.round(viewType === "total" ? netProfit : incrementalNet),
                museumProfit: includeMuseum
                    ? Math.round(viewType === "total" ? museumProfit : incrementalMuseum)
                    : 0,
                abroadProfit: includeAbroad
                    ? Math.round(viewType === "total" ? abroadProfit : incrementalAbroad)
                    : 0,
            };
        });
    }, [
        isLoaded,
        logs,
        timeRange,
        viewType,
        includeTrading,
        includeMuseum,
        includeAbroad,
        includeMug,
    ]);

    if (!isLoaded)
        return (
            <div className="text-center py-20 animate-pulse text-foreground/50 font-mono">
                INITIALIZING V2 ENGINE...
            </div>
        );

    const finalNetProfit = chartData.length > 0 ? chartData[chartData.length - 1].netProfit : 0;
    const averageNetProfit =
        chartData.length > 0
            ? Math.round(
                  chartData.reduce((acc, curr) => acc + curr.netProfit, 0) / chartData.length
              )
            : 0;

    const referenceValue = viewType === "daily" ? averageNetProfit : finalNetProfit;
    
    return (
        <div className="space-y-8 animate-in fade-in duration-500 p-4 md:p-8">
            {/* Hero Section */}
            <div className="bg-panel border-2 border-primary relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 -mr-32 -mt-32 rotate-45 pointer-events-none" />

                {/* Top: Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-0 border-b-2 border-primary">
                    <OverviewItem
                        icon={<HugeiconsIcon icon={ArrowUp02Icon} size={18} />}
                        label="Trading"
                        value={formatMoney(stats.profit)}
                        color={CATEGORY_COLORS.trading.hex}
                        disabled={!includeTrading}
                        onToggle={() => {
                            vibrate("utility");
                            setIncludeTrading(!includeTrading);
                        }}
                    />
                    <OverviewItem
                        icon={<HugeiconsIcon icon={Coins01Icon} size={18} />}
                        label="Museum"
                        value={formatMoney(stats.museumProfit)}
                        color={CATEGORY_COLORS.museum.hex}
                        disabled={!includeMuseum}
                        onToggle={() => {
                            vibrate("utility");
                            setIncludeMuseum(!includeMuseum);
                        }}
                    />
                    <OverviewItem
                        icon={<HugeiconsIcon icon={PackageSearchIcon} size={18} />}
                        label="Abroad"
                        value={formatMoney(stats.abroadProfit)}
                        color={CATEGORY_COLORS.abroad.hex}
                        disabled={!includeAbroad}
                        onToggle={() => {
                            vibrate("utility");
                            setIncludeAbroad(!includeAbroad);
                        }}
                    />
                    <OverviewItem
                        icon={<HugeiconsIcon icon={AlertCircleIcon} size={18} />}
                        label="Mug"
                        value={formatMoney(totalMugLoss)}
                        color={CATEGORY_COLORS.mug.hex}
                        disabled={!includeMug}
                        onToggle={() => {
                            vibrate("utility");
                            setIncludeMug(!includeMug);
                        }}
                    />
                    <OverviewItem
                        icon={<HugeiconsIcon icon={Activity01Icon} size={18} />}
                        label="Net"
                        value={formatMoney(netTotal)}
                        color={netTotal >= 0 ? CATEGORY_COLORS.net.hex : CATEGORY_COLORS.mug.hex}
                        disabled={!includeNetProfit}
                    />
                </div>

                {/* Chart (Full Width) */}
                <div className="p-6 md:p-8 pt-4 h-[440px]">
                    <ProfitChart
                        chartId="dashboard-main-v2"
                        data={chartData}
                        viewType={viewType}
                        setViewType={setViewType}
                        timeRange={timeRange}
                        setTimeRange={setTimeRange}
                        referenceValue={referenceValue}
                        primaryColor="var(--primary)"
                        formatValue={formatMoney}
                        stackedMode={true}
                        visibleLines={{
                            mugLoss: includeMug,
                            netProfit: includeNetProfit,
                            museumProfit: includeMuseum,
                            abroadProfit: includeAbroad,
                            realizedProfit: includeTrading,
                        }}
                    />
                </div>
            </div>

            <div className="bg-panel border-2 border-border overflow-hidden p-4 bg-foreground/[0.03]">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-primary" />
                        <h2 className="font-black text-xl uppercase tracking-[0.3em]">Inventory V2</h2>
                    </div>
                    <div className="relative w-full sm:max-w-xs">
                        <HugeiconsIcon
                            icon={Search01Icon}
                            size={16}
                            className="text-muted absolute left-4 top-1/2 -translate-y-1/2"
                        />
                        <input
                            type="text"
                            placeholder="FILTER_ITEMS..."
                            value={search}
                            onChange={(e) => {
                                if (!search && e.target.value) {
                                    vibrate("utility");
                                }
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-12 pr-4 py-2 border-2 border-border bg-background focus:border-primary focus:outline-none font-mono text-[11px] uppercase placeholder:opacity-30 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 border-2 border-border-strong px-3 py-1 bg-panel h-[36px]">
                            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">Sort:</span>
                            <select
                                value={`${sortConfig.key}-${sortConfig.direction}`}
                                onChange={(e) => {
                                    const [k, d] = e.target.value.split("-");
                                    setSortConfig({ key: k as SortKey, direction: d as "asc" | "desc" });
                                }}
                                className="bg-transparent font-mono text-[10px] font-bold text-foreground/80 outline-none focus:text-primary transition-colors pr-2 uppercase tracking-[0.05em] cursor-pointer"
                            >
                                <option value="name-asc" className="bg-panel">Name (A-Z)</option>
                                <option value="name-desc" className="bg-panel">Name (Z-A)</option>
                                <option value="stock-desc" className="bg-panel">Stock (H-L)</option>
                                <option value="stock-asc" className="bg-panel">Stock (L-H)</option>
                                <option value="realizedProfit-desc" className="bg-panel">Profit (H-L)</option>
                                <option value="realizedProfit-asc" className="bg-panel">Profit (L-H)</option>
                                <option value="totalCost-desc" className="bg-panel">Value (H-L)</option>
                                <option value="totalCost-asc" className="bg-panel">Value (L-H)</option>
                                <option value="avgCost-desc" className="bg-panel">Avg Cost (H-L)</option>
                                <option value="avgCost-asc" className="bg-panel">Avg Cost (L-H)</option>
                            </select>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsGrouped((current) => !current)}
                            aria-pressed={isGrouped}
                            className={`flex items-center gap-2 border-2 px-3 py-1.5 h-[36px] text-[10px] font-bold uppercase tracking-[0.05em] transition-colors ${
                                isGrouped
                                    ? "border-info/40 bg-info/10 text-info"
                                    : "border-border-strong text-foreground/70 bg-panel hover:text-primary"
                            }`}
                        >
                            <HugeiconsIcon
                                icon={PackageSearchIcon}
                                size={12}
                                className={isGrouped ? "opacity-100" : "opacity-40"}
                            />
                            <span className={isGrouped ? "opacity-100" : "opacity-40"}>Grouped</span>
                        </button>
                    </div>
                </div>
            </div>

            {isGrouped && groupedItems ? (
                <div className="flex flex-col gap-8">
                        {groupedItems.map(([type, items]) => (
                            <div key={type} className="flex flex-col gap-3">
                                <div className="flex items-center gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => toggleGroupFavorites(type)}
                                        className={`flex-shrink-0 transition-colors ${
                                            favoriteGroups.has(type) 
                                                ? "text-warning hover:text-warning/80" 
                                                : "text-muted hover:text-primary"
                                        }`}
                                        title={favoriteGroups.has(type) ? "Unfavorite group" : "Favorite group"}
                                    >
                                        <HugeiconsIcon 
                                            icon={StarIcon} 
                                            size={20} 
                                            className={favoriteGroups.has(type) ? "text-warning" : "text-muted"}
                                        />
                                    </button>
                                    <h3 className="text-xl font-departure tracking-widest text-primary">
                                        {type}
                                    </h3>
                                    <div className="h-px flex-1 bg-border-strong" />
                                    <span className="font-mono text-[10px] text-muted uppercase">
                                        {items.length} Items
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 gap-px bg-border border border-border md:grid-cols-2 xl:grid-cols-3 overflow-hidden">
                                    {items.map((item) => (
                                        <DashboardItemCard
                                            key={item.name}
                                            name={item.name}
                                            stats={item.stats}
                                            itemID={item.itemID}
                                            onClick={() => {
                                                vibrate("nav");
                                                const itemID = item.itemID;
                                                router.push(
                                                    itemID !== undefined && itemID > 0
                                                        ? `/logs?itemID=${encodeURIComponent(String(itemID))}`
                                                        : `/logs?item=${encodeURIComponent(item.name)}`
                                                );
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
            ) : (
                <div className="bg-panel border-2 border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse table-fixed">
                        <thead className="bg-foreground/[0.02]">
                            <tr>
                                <th
                                    className="w-[35%] px-6 py-4 cursor-pointer hover:bg-foreground/5 border-b-2 border-border"
                                    onClick={() => handleSort("name")}
                                >
                                    <div className="flex items-center gap-2 uppercase font-black tracking-widest">
                                        <span>Item Name</span>
                                        {sortConfig.key === "name" ? (
                                            sortConfig.direction === "asc" ? (
                                                <HugeiconsIcon icon={ArrowUp01Icon} size={12} />
                                            ) : (
                                                <HugeiconsIcon icon={ArrowDown01Icon} size={12} />
                                            )
                                        ) : (
                                            <HugeiconsIcon
                                                icon={ArrowUpDownIcon}
                                                size={12}
                                                className="opacity-20"
                                            />
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="w-[15%] px-6 py-4 text-right cursor-pointer hover:bg-foreground/5 border-b-2 border-border"
                                    onClick={() => handleSort("stock")}
                                >
                                    <div className="flex items-center justify-end gap-2 uppercase font-black tracking-widest">
                                        <span>Stock</span>
                                        {sortConfig.key === "stock" ? (
                                            sortConfig.direction === "asc" ? (
                                                <HugeiconsIcon icon={ArrowUp01Icon} size={12} />
                                            ) : (
                                                <HugeiconsIcon icon={ArrowDown01Icon} size={12} />
                                            )
                                        ) : (
                                            <HugeiconsIcon
                                                icon={ArrowUpDownIcon}
                                                size={12}
                                                className="opacity-20"
                                            />
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="w-[15%] px-6 py-4 text-right cursor-pointer hover:bg-foreground/5 border-b-2 border-border"
                                    onClick={() => handleSort("avgCost")}
                                >
                                    <div className="flex items-center justify-end gap-2 uppercase font-black tracking-widest">
                                        <span>Avg Cost</span>
                                        {sortConfig.key === "avgCost" ? (
                                            sortConfig.direction === "asc" ? (
                                                <HugeiconsIcon icon={ArrowUp01Icon} size={12} />
                                            ) : (
                                                <HugeiconsIcon icon={ArrowDown01Icon} size={12} />
                                            )
                                        ) : (
                                            <HugeiconsIcon
                                                icon={ArrowUpDownIcon}
                                                size={12}
                                                className="opacity-20"
                                            />
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="w-[15%] px-6 py-4 text-right cursor-pointer hover:bg-foreground/5 border-b-2 border-border"
                                    onClick={() => handleSort("totalCost")}
                                >
                                    <div className="flex items-center justify-end gap-2 uppercase font-black tracking-widest">
                                        <span>Cost</span>
                                        {sortConfig.key === "totalCost" ? (
                                            sortConfig.direction === "asc" ? (
                                                <HugeiconsIcon icon={ArrowUp01Icon} size={12} />
                                            ) : (
                                                <HugeiconsIcon icon={ArrowDown01Icon} size={12} />
                                            )
                                        ) : (
                                            <HugeiconsIcon
                                                icon={ArrowUpDownIcon}
                                                size={12}
                                                className="opacity-20"
                                            />
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="w-[15%] px-6 py-4 text-right cursor-pointer hover:bg-foreground/5 border-b-2 border-border"
                                    onClick={() => handleSort("realizedProfit")}
                                >
                                    <div className="flex items-center justify-end gap-2 uppercase font-black tracking-widest">
                                        <span>Trading</span>
                                        {sortConfig.key === "realizedProfit" ? (
                                            sortConfig.direction === "asc" ? (
                                                <HugeiconsIcon icon={ArrowUp01Icon} size={12} />
                                            ) : (
                                                <HugeiconsIcon icon={ArrowDown01Icon} size={12} />
                                            )
                                        ) : (
                                            <HugeiconsIcon
                                                icon={ArrowUpDownIcon}
                                                size={12}
                                                className="opacity-20"
                                            />
                                        )}
                                    </div>
                                </th>
                                <th className="w-[5%] px-6 py-4 border-b-2 border-border"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-border/50">
                            {sortedItems.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-6 py-12 text-center text-muted uppercase font-black tracking-[0.2em] italic"
                                    >
                                        NO_DATA_AVAILABLE
                                    </td>
                                </tr>
                            ) : (
                                paginatedItems.map(({ name, stats, itemID }) => {
                                    const avgCost =
                                        stats.stock > 0 ? stats.totalCost / stats.stock : 0;
                                    return (
                                        <tr
                                            key={name}
                                            onClick={() => {
                                                vibrate("nav");
                                                router.push(
                                                    itemID !== undefined && itemID > 0
                                                        ? `/logs?itemID=${encodeURIComponent(String(itemID))}`
                                                        : `/logs?item=${encodeURIComponent(name)}`
                                                );
                                            }}
                                            className="hover:bg-primary/5 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4 font-bold group-hover:text-primary transition-colors uppercase">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-foreground/[0.03] rounded-sm">
                                                       {name.toLowerCase() === "points" ? (
                                                           <PointsIcon className="w-8 h-8 object-contain drop-shadow-sm transition-transform group-hover:scale-110" />
                                                       ) : name.toLowerCase().includes("flower set") || name.toLowerCase().includes("plushie set") ? (
                                                           <ItemSetIcon name={name} className="w-8 h-8" />
                                                       ) : itemID && itemID > 0 ? (
                                                           <img
                                                               src={`https://www.torn.com/images/items/${itemID}/large.png`}
                                                               alt=""
                                                               className="w-8 h-8 object-contain drop-shadow-sm transition-transform group-hover:scale-110"
                                                               loading="lazy"
                                                           />
                                                       ) : (
                                                           <div className="w-2 h-2 rounded-full bg-border" />
                                                       )}
                                                    </div>
                                                    <span className="truncate">{formatItemName(name)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="bg-primary/10 text-primary px-2 py-1 font-bold font-mono whitespace-nowrap">
                                                    {stats.stock.toLocaleString()} UNITS
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-muted font-mono">
                                                {formatMoney(avgCost)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono">
                                                {formatMoney(stats.totalCost)}
                                            </td>
                                            <td
                                                className={`px-6 py-4 text-right font-black font-mono ${stats.realizedProfit >= 0 ? "text-success" : "text-danger"}`}
                                            >
                                                {formatMoney(stats.realizedProfit)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {/* Rename not supported yet in V2 */}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {sortedItems.length > ITEMS_PER_PAGE && (
                    <div className="p-4 border-t-2 border-border flex items-center justify-between">
                        <div className="text-xs font-mono text-muted uppercase tracking-widest">
                            SHOWING {startIndex + 1}-{Math.min(endIndex, sortedItems.length)} OF{" "}
                            {sortedItems.length} ITEMS
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => goToPage(1)}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg hover:bg-foreground/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="First page"
                            >
                                <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
                            </button>
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg hover:bg-foreground/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Previous page"
                            >
                                <HugeiconsIcon
                                    icon={ArrowUp01Icon}
                                    size={14}
                                    className="rotate-270"
                                />
                            </button>
                            <span className="text-xs font-mono text-muted px-2">
                                PAGE {currentPage} OF {totalPages}
                            </span>
                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg hover:bg-foreground/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Next page"
                            >
                                <HugeiconsIcon
                                    icon={ArrowDown01Icon}
                                    size={14}
                                    className="rotate-270"
                                />
                            </button>
                            <button
                                onClick={() => goToPage(totalPages)}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg hover:bg-foreground/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Last page"
                            >
                                <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                            </button>
                        </div>
                    </div>
                    )}
                </div>
            )}

            <StatsModal
                isOpen={modalState.isOpen}
                onClose={closeStatsModal}
                title={modalState.title}
                transactions={[]} // Not used in V2 modal yet or needs adapter
                statType={modalState.statType}
                excludedItems={["flushie", "points", ...MUSEUM_TRACKED_ITEMS]}
                inventoryScope="normal"
            />
        </div>
    );
}

function OverviewItem({
    icon,
    label,
    value,
    color,
    disabled = false,
    onToggle,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
    disabled?: boolean;
    onToggle?: () => void;
}) {
    return (
        <div
            onClick={onToggle}
            className={`flex flex-col gap-1 p-6 transition-all duration-300 border-r-2 last:border-r-0 border-primary/20 relative ${onToggle ? "cursor-pointer hover:bg-primary/5" : ""} ${disabled ? "opacity-30 grayscale" : ""}`}
        >
            <div className="flex items-center justify-between font-mono">
                <p className="text-[12px] font-black uppercase tracking-[0.2em]">{label}</p>
                <div className={disabled ? "text-muted" : "text-primary"}>{icon}</div>
            </div>
            <p
                className={`text-2xl font-black font-mono tracking-tighter mt-2 leading-none truncate ${disabled ? "text-foreground" : ""}`}
                style={{ color: disabled ? undefined : color }}
            >
                {value}
            </p>
            {onToggle && !disabled && (
                <div className="absolute top-2 right-2">
                    <div
                        className="w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"
                        style={{ backgroundColor: "#22c55e" }}
                    />
                </div>
            )}
        </div>
    );
}

function DashboardItemCard({
    name,
    stats,
    itemID,
    onClick,
}: {
    name: string;
    stats: InventoryItemStats;
    itemID?: number;
    onClick: () => void;
}) {
    const avgCost = stats.stock > 0 ? stats.totalCost / stats.stock : 0;
    const profitColor = stats.realizedProfit >= 0 ? "text-success" : "text-danger";

    return (
        <article
            onClick={onClick}
            className="group relative flex items-center justify-between bg-panel/70 px-4 py-3 hover:bg-panel-elevated transition-colors cursor-pointer border-b border-border/50 last:border-b-0"
        >
            <div className="flex items-center gap-4 min-w-0 flex-1 relative">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center">
                    {name.toLowerCase() === "points" ? (
                        <PointsIcon className="h-10 w-10 object-contain drop-shadow-sm transition-transform group-hover:scale-110" />
                    ) : name.toLowerCase().includes("flower set") || name.toLowerCase().includes("plushie set") ? (
                        <ItemSetIcon name={name} className="h-10 w-10" />
                    ) : itemID && itemID > 0 ? (
                        <img
                            src={`https://www.torn.com/images/items/${itemID}/large.png`}
                            alt={formatItemName(name)}
                            width={48}
                            height={48}
                            className="h-10 w-10 object-contain drop-shadow-sm transition-transform group-hover:scale-110"
                            loading="lazy"
                        />
                    ) : (
                        <div className="h-10 w-10 rounded-full bg-foreground/5 flex items-center justify-center">
                            <HugeiconsIcon icon={StarIcon} size={16} className="text-muted/20" />
                        </div>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-1 text-base font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">
                        {formatItemName(name)}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-muted uppercase">
                            {stats.stock.toLocaleString()} UNITS
                        </span>
                        <span className="text-[10px] font-mono text-muted/40 whitespace-nowrap">
                            AVG: {formatMoney(avgCost)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-0.5 ml-4 font-mono">
                <p className="text-sm font-bold text-foreground">
                    {formatMoney(stats.totalCost)}
                </p>
                <div className={`text-[11px] font-black ${profitColor}`}>
                    {stats.realizedProfit >= 0 ? "+" : ""}{formatMoney(stats.realizedProfit)}
                </div>
            </div>
        </article>
    );
}
