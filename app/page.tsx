"use client";

import { useJournal } from "@/store/useJournal";
import { InventoryItemStats } from "@/lib/interfaces/transactions";
import { formatItemName, MUSEUM_TRACKED_ITEMS } from "@/lib/parser";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    ArrowUp02Icon,
    PackageSearchIcon,
    AlertCircleIcon,
    Activity01Icon,
    PencilEdit02Icon,
    ArrowUpDownIcon,
    ArrowUp01Icon,
    ArrowDown01Icon,
    Search01Icon,
    Coins01Icon,
    CheckmarkCircle01Icon,
    Book01Icon,
    ArrowRight01Icon,
    ArrowLeft01Icon,
} from "@hugeicons/core-free-icons";
import { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHapticFeedback } from "@/lib/useHapticFeedback";
import StatsModal from "@/components/StatsModal";
import { ProfitChart } from "@/components/ProfitChart";
import { CATEGORY_COLORS } from "@/lib/theme";
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
import type { AnyTrackedTransaction } from "@/lib/interfaces/transactions";

const getTransactionTimestamp = (transaction: any) =>
    "date" in transaction ? transaction.date : transaction.timestamp;

const getTransactionPriority = (transaction: any) => {
    if ("isWrapper" in transaction && transaction.isWrapper) return 2;
    if ("type" in transaction && transaction.type === "BUY") return 0;
    if ("amount" in transaction && transaction.amount >= 0) return 0;
    return 1;
};

const formatMoney = (val: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(val);
};

export default function Home() {
    const { isLoaded, inventory, totalMugLoss, renameItem, transactions } = useJournal();
    const router = useRouter();
    const { vibrate } = useHapticFeedback();

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

    // Load prefs
    useEffect(() => {
        const prefs = localStorage.getItem("bml-main-chart-prefs");
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
            } catch (e) {}
        }
    }, []);

    // Save prefs
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(
                "bml-main-chart-prefs",
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
    }, [includeTrading, includeMuseum, includeAbroad, includeMug, includeNetProfit, viewType, timeRange, isLoaded]);

    const { stats, sortedItems } = useMemo(() => {
        let tradingProfit = 0;
        let totalInvValue = 0;
        let museumProfit = 0;
        let abroadProfit = 0;
        const items: { name: string; stats: any }[] = [];

        inventory.forEach((stat, name) => {
            const isMuseum =
                name.toLowerCase() === "flushie" ||
                name.toLowerCase() === "points" ||
                MUSEUM_TRACKED_ITEMS.includes(name.toLowerCase());

            if (isMuseum) {
                museumProfit += stat.realizedProfit;
                if (includeMuseum) {
                    items.push({ name, stats: stat });
                    totalInvValue += Math.max(0, stat.totalCost);
                }
            } else {
                tradingProfit += stat.realizedProfit;
                abroadProfit += stat.abroadRealizedProfit;

                let itemProfit = stat.realizedProfit;
                let itemValue = Math.max(0, stat.totalCost);
                let itemStock = stat.stock;

                if (includeAbroad) {
                    itemProfit += stat.abroadRealizedProfit;
                    itemValue += Math.max(0, stat.abroadTotalCost);
                    itemStock += stat.abroadStock;
                }

                if (includeTrading) {
                    items.push({
                        name,
                        stats: {
                            ...stat,
                            realizedProfit: itemProfit,
                            totalCost: itemValue,
                            stock: itemStock,
                        },
                    });
                    totalInvValue += itemValue;
                }
            }
        });

        const filtered = items.filter((item) =>
            item.name.toLowerCase().includes(search.toLowerCase())
        );

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
            stats: {
                profit: tradingProfit,
                inventory: totalInvValue,
                museumProfit,
                abroadProfit,
            },
            sortedItems: sorted,
        };
    }, [inventory, sortConfig, search, includeTrading, includeMuseum, includeAbroad]);

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

    const openStatsModal = (
        title: string,
        statType: "profit" | "inventory" | "mugLoss" | "netProfit"
    ) => {
        vibrate("nav");
        setModalState({ isOpen: true, title, statType });
    };

    const closeStatsModal = () => {
        setModalState({ isOpen: false, title: "", statType: "profit" });
    };

    const netTotal = stats.profit + stats.museumProfit + stats.abroadProfit - totalMugLoss;

    const itemIdByName = useMemo(() => {
        const map = new Map<string, number>();
        transactions.forEach((transaction) => {
            if (
                transaction &&
                typeof transaction === "object" &&
                "isWrapper" in transaction &&
                transaction.isWrapper === false &&
                "itemName" in transaction &&
                "itemID" in transaction &&
                typeof transaction.itemName === "string" &&
                typeof transaction.itemID === "number"
            ) {
                map.set(transaction.itemName, transaction.itemID);
            }
        });
        return map;
    }, [transactions]);

    // Chart data generation
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
            periods = Array.from({ length: 5 }, (_, i) => subMonths(now, (4 - i) * 12));
            dateFormat = "yyyy";
        }

        const sortedTransactions = [...transactions].sort((a, b) => {
            const left = getTransactionTimestamp(a);
            const right = getTransactionTimestamp(b);
            if (left !== right) return left - right;
            return getTransactionPriority(a) - getTransactionPriority(b);
        });

        if (sortedTransactions.length > 0) {
            const firstTxDate = new Date(getTransactionTimestamp(sortedTransactions[0]));
            let minDate: Date;
            if (timeRange === "daily") minDate = startOfDay(subDays(firstTxDate, 1));
            else if (timeRange === "weekly") minDate = startOfWeek(subWeeks(firstTxDate, 1));
            else if (timeRange === "monthly") minDate = startOfMonth(subMonths(firstTxDate, 1));
            else minDate = startOfYear(subYears(firstTxDate, 1));

            periods = periods.filter((p) => p.getTime() >= minDate.getTime());
        }

        const tempInventory = new Map<string, InventorySnapshot>();
        const mugState = { total: 0 };
        let transactionIndex = 0;

        // Track previous totals for incremental view
        let previousTotals: any = {
            profit: 0,
            inventory: 0,
            mugLoss: 0,
            netProfit: 0,
            museumProfit: 0,
            abroadProfit: 0,
        };

        return periods.map((period) => {
            let periodEnd: Date;
            if (timeRange === "daily") periodEnd = endOfDay(startOfDay(period));
            else if (timeRange === "weekly") periodEnd = endOfWeek(startOfWeek(period));
            else if (timeRange === "monthly") periodEnd = endOfMonth(startOfMonth(period));
            else periodEnd = endOfYear(startOfMonth(period));

            while (
                transactionIndex < sortedTransactions.length &&
                getTransactionTimestamp(sortedTransactions[transactionIndex]) <= periodEnd.getTime()
            ) {
                const isTrackedItem = (item: string) => true; // Always evaluate all so tempInventory stays structurally accurate
                applyTransaction(
                    tempInventory,
                    sortedTransactions[transactionIndex],
                    mugState,
                    isTrackedItem
                );
                transactionIndex++;
            }

            const currentTotals = getTotals(tempInventory, mugState.total);

            const totalRealized = currentTotals.profit;
            const totalMugLoss = currentTotals.mugLoss;
            const museumProfit = currentTotals.museumProfit;
            const abroadProfit = currentTotals.abroadProfit;

            let baseNetProfit = 0;
            if (includeTrading) baseNetProfit += totalRealized;
            if (includeMuseum) baseNetProfit += museumProfit;
            if (includeAbroad) baseNetProfit += abroadProfit;

            const netProfit = baseNetProfit - (includeMug ? totalMugLoss : 0);

            // For incremental view, get period-over-period values
            const incrementalRealized = totalRealized - previousTotals.profit;
            const incrementalMug = totalMugLoss - previousTotals.mugLoss;
            const incrementalNet = netProfit - previousTotals.netProfit;
            const incrementalMuseum = museumProfit - previousTotals.museumProfit;
            const incrementalAbroad = abroadProfit - previousTotals.abroadProfit;

            previousTotals = {
                ...currentTotals,
                netProfit,
            };

            return {
                date: format(period, dateFormat),
                ts: periodEnd.getTime(),
                realizedProfit: Math.round(
                    viewType === "total" ? totalRealized : incrementalRealized
                ),
                mugLoss: -Math.round(viewType === "total" ? totalMugLoss : incrementalMug),
                netProfit: Math.round(viewType === "total" ? netProfit : incrementalNet),
                museumProfit: includeMuseum
                    ? Math.round(viewType === "total" ? museumProfit : incrementalMuseum)
                    : 0,
                abroadProfit: includeAbroad
                    ? Math.round(viewType === "total" ? abroadProfit : incrementalAbroad)
                    : 0,
            };
        });
    }, [isLoaded, transactions, timeRange, viewType, includeTrading, includeMuseum, includeAbroad, includeMug]);

    if (!isLoaded)
        return (
            <div className="text-center py-20 animate-pulse text-foreground/50 font-mono">
                INITIALIZING ENGINE...
            </div>
        );

    // Calculate reference values
    const finalNetProfit = chartData.length > 0 ? chartData[chartData.length - 1].netProfit : 0;
    const averageNetProfit =
        chartData.length > 0
            ? Math.round(
                  chartData.reduce((acc, curr) => acc + curr.netProfit, 0) / chartData.length
              )
            : 0;

    // Calculate final reference value prioritizing netProfit
    const referenceValue = viewType === "daily" ? averageNetProfit : finalNetProfit;
    return (
        <div className="space-y-8 animate-in fade-in duration-500">

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
                        chartId="dashboard-main"
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

            <div className="bg-panel border-2 border-border overflow-hidden">
                <div className="p-4 bg-foreground/[0.03] border-b-2 border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-primary" />
                        <h2 className="font-black text-xs uppercase tracking-[0.3em]">
                            Inventory
                        </h2>
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
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-[11px] border-collapse">
                        <thead className="bg-foreground/[0.02]">
                            <tr>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-foreground/5 border-b-2 border-border"
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
                                    className="px-6 py-4 text-right cursor-pointer hover:bg-foreground/5 border-b-2 border-border"
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
                                    className="px-6 py-4 text-right cursor-pointer hover:bg-foreground/5 border-b-2 border-border"
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
                                    className="px-6 py-4 text-right cursor-pointer hover:bg-foreground/5 border-b-2 border-border"
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
                                    className="px-6 py-4 text-right cursor-pointer hover:bg-foreground/5 border-b-2 border-border"
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
                                <th className="px-6 py-4 border-b-2 border-border"></th>
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
                                paginatedItems.map(({ name, stats }) => {
                                    const avgCost =
                                        stats.stock > 0 ? stats.totalCost / stats.stock : 0;
                                    return (
                                        <tr
                                            key={name}
                                            onClick={() => {
                                                vibrate("nav");
                                                const itemID = itemIdByName.get(name);
                                                router.push(
                                                    itemID !== undefined
                                                        ? `/logs?itemID=${encodeURIComponent(String(itemID))}`
                                                        : `/logs?item=${encodeURIComponent(name)}`
                                                );
                                            }}
                                            className="hover:bg-primary/5 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4 font-bold group-hover:text-primary transition-colors uppercase">
                                                {formatItemName(name)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="bg-primary/10 text-primary px-2 py-1 font-bold whitespace-nowrap">
                                                    {stats.stock.toLocaleString()} UNITS
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-muted">
                                                {formatMoney(avgCost)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {formatMoney(stats.totalCost)}
                                            </td>
                                            <td
                                                className={`px-6 py-4 text-right font-black ${stats.realizedProfit >= 0 ? "text-success" : "text-danger"}`}
                                            >
                                                {formatMoney(stats.realizedProfit)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const newName = prompt(
                                                            `Enter new name for ${formatItemName(name)}.\n\nIf you enter the name of another existing item, their logs will be MERGED automatically.`,
                                                            formatItemName(name)
                                                        );
                                                        if (
                                                            newName !== null &&
                                                            newName !== formatItemName(name)
                                                        ) {
                                                            if (
                                                                confirm(
                                                                    `Are you sure you want to rename/merge '${formatItemName(name)}' to '${formatItemName(newName)}'? This updates all logs.`
                                                                )
                                                            ) {
                                                                vibrate("success");
                                                                renameItem(name, newName);
                                                            }
                                                        }
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 text-muted hover:text-primary p-2 transition-all"
                                                >
                                                    <HugeiconsIcon
                                                        icon={PencilEdit02Icon}
                                                        size={14}
                                                    />
                                                </button>
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

            <StatsModal
                isOpen={modalState.isOpen}
                onClose={closeStatsModal}
                title={modalState.title}
                transactions={transactions}
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
                className={`text-2xl font-black tracking-tighter mt-2 leading-none truncate ${disabled ? "text-foreground" : ""}`}
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
