"use client";

import { useJournal } from "@/store/useJournal";
import { InventoryItemStats } from "@/lib/old/interfaces/transactions";
import { CATEGORY_COLORS } from "@/lib/old/theme";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Analytics01Icon,
    PackageIcon,
    Clock01Icon,
    LibraryIcon,
    Package01Icon,
    FlowerIcon,
    Coins01Icon,
    AnonymousIcon,
    DropletIcon,
    Exchange01Icon,
    ShoppingBasket03Icon,
    DashboardSpeed01Icon,
    AlertCircleIcon,
    Loading03Icon,
    CheckmarkCircle01Icon,
    SettingsIcon,
    PencilEdit02Icon,
} from "@hugeicons/core-free-icons";
import { useMemo, useState, useEffect, useCallback } from "react";
import {
    getApiKey as getWeav3rApiKey,
    getUserId as getWeav3rUserId,
    getTEApiKey,
} from "@/lib/old/api-keys";
import {
    formatItemName,
    FLOWER_SET,
    MUSEUM_EXCHANGE_DEFINITIONS,
    MUSEUM_TRACKED_ITEMS,
    PLUSHIE_SET,
    FLOWER_SET_ITEMS,
    PLUSHIE_SET_ITEMS,
} from "@/lib/old/parser";
import { ProfitChart } from "@/components/ProfitChart";
import { ItemGridCard } from "@/components/ItemGridCard";
import { TornExchange } from "@/lib/tornexchange";
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
import { InventorySnapshot, applyTransaction, getTotals } from "@/lib/old/chartUtils";

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
 * Compute buy plan to maximize sets by buying a specific number of different items.
 * @param items - Array of items with name and current stock
 * @param numItems - Number of different items to buy (N)
 * @returns Object containing target sets, purchase details, and summary stats
 *
 * Algorithm:
 * - Sort items by stock ascending (least to most)
 * - Target = stock of (N+1)th item (the item just after the N items we're buying)
 * - For each of first N items: buy = target - current stock
 * - If N >= total items, target = last item stock (no buying beyond that)
 *
 * Example: Kitten(5), Wolverine(19), Nessie(27), Chamois(30), ...
 * - N=1: Target=19 (Wolverine), buy 14 of Kitten (19-5)
 * - N=3: Target=30 (Chamois), buy 25 Kitten, 11 Wolverine, 3 Nessie
 */
function computeBuyPlanByItems(items: { name: string; stock: number }[], numItems: number) {
    if (items.length === 0 || numItems <= 0) {
        return { target: 0, purchases: [], itemsToBuy: 0, totalQty: 0 };
    }

    const sorted = [...items].sort((a, b) => a.stock - b.stock);
    const targetIndex = Math.min(numItems, sorted.length - 1);
    const target = sorted[targetIndex]?.stock ?? sorted[sorted.length - 1].stock;

    const purchases = sorted.map((item) => {
        const buy = Math.max(0, target - item.stock);
        return { name: item.name, current: item.stock, buy };
    });

    const itemsToBuyCount = purchases.filter((p) => p.buy > 0).length;
    const totalQty = purchases.reduce((sum, p) => sum + p.buy, 0);

    return {
        target,
        purchases,
        itemsToBuy: itemsToBuyCount,
        totalQty,
    };
}

export default function MuseumDashboard() {
    const { isLoaded, inventory, transactions, weav3rApiKey, weav3rUserId } = useJournal();

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
                              ...items.map((item) => Math.floor(item.stats.stock / item.quantity))
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
            FLOWER_SET.length > 0 ? Math.min(...flowersData.map((f) => f.stats.stock)) : 0;
        const plushieSetsPossible =
            PLUSHIE_SET.length > 0 ? Math.min(...plushiesData.map((p) => p.stats.stock)) : 0;

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
            flushieStats.realizedProfit + pointsStats.realizedProfit + itemsRealizedProfit;

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

    const [timeRange, setTimeRange] = useState<"daily" | "weekly" | "monthly" | "yearly">(() => {
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
    const [flowerNumItems, setFlowerNumItems] = useState<number>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("museum-flower-num-items");
            if (saved !== null) {
                const n = parseInt(saved, 10);
                if (!isNaN(n) && n >= 1) return n;
            }
        }
        return 1;
    });
    const [plushieNumItems, setPlushieNumItems] = useState<number>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("museum-plushie-num-items");
            if (saved !== null) {
                const n = parseInt(saved, 10);
                if (!isNaN(n) && n >= 1) return n;
            }
        }
        return 1;
    });
    const [flowerMode, setFlowerMode] = useState<"view" | "buy" | "price">("view");
    const [plushieMode, setPlushieMode] = useState<"view" | "buy" | "price">("view");
    const [flowerDrift, setFlowerDrift] = useState(false);
    const [plushieDrift, setPlushieDrift] = useState(false);
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["weav3r"]);
    const [tePricelist, setTePricelist] = useState<any[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem("museum-drift-status");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setFlowerDrift(parsed.flowers);
                setPlushieDrift(parsed.plushies);
            } catch {}
        }
        
        const handleSync = (e: any) => {
            if (e.detail) {
                setFlowerDrift(e.detail.flowers);
                setPlushieDrift(e.detail.plushies);
            }
        };

        window.addEventListener("museum-sync-updated", handleSync);
        return () => window.removeEventListener("museum-sync-updated", handleSync);
    }, []);

    const clearDriftStatus = useCallback((setType: "flower" | "plushie") => {
        if (setType === "flower") setFlowerDrift(false);
        else setPlushieDrift(false);
        
        const saved = localStorage.getItem("museum-drift-status");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const val = { ...parsed, ...(setType === "flower" ? { flowers: false } : { plushies: false }) };
                localStorage.setItem("museum-drift-status", JSON.stringify(val));
                window.dispatchEvent(new CustomEvent("museum-sync-updated", { detail: val }));
            } catch {}
        }
    }, []);

    const defaultThresholds = {
        threshold1: 500,
        threshold2: 1000,
        threshold3: 2000,
        offer1: 101,
        offer2: 100,
        offer3: 98,
        offerElse: 95,
    };

    const [thresholdSettings, setThresholdSettings] = useState<typeof defaultThresholds>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("museum-pricelist-thresholds");
            if (saved !== null) {
                try {
                    return { ...defaultThresholds, ...JSON.parse(saved) };
                } catch {
                    return defaultThresholds;
                }
            }
        }
        return defaultThresholds;
    });

    const [marketPrices, setMarketPrices] = useState<Record<number, number>>({});
    const [userPricelist, setUserPricelist] = useState<Record<string, number>>({});
    const [isFetchingPricelist, setIsFetchingPricelist] = useState(false);
    const [isUpdatingPricelist, setIsUpdatingPricelist] = useState(false);
    const [pricelistError, setPricelistError] = useState<string | null>(null);
    const [pricelistSuccess, setPricelistSuccess] = useState<string | null>(null);

    const [flowerPricelistEdits, setFlowerPricelistEdits] = useState<Record<string, number>>({});
    const [plushiePricelistEdits, setPlushiePricelistEdits] = useState<Record<string, number>>({});
    const [showThresholdSettings, setShowThresholdSettings] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("museum-range", timeRange);
            localStorage.setItem("museum-view", viewType);
            localStorage.setItem("museum-mode", mode);
            localStorage.setItem("museum-flower-num-items", flowerNumItems.toString());
            localStorage.setItem("museum-plushie-num-items", plushieNumItems.toString());
            localStorage.setItem("museum-pricelist-thresholds", JSON.stringify(thresholdSettings));
        }
    }, [
        timeRange,
        viewType,
        mode,
        flowerNumItems,
        plushieNumItems,
        flowerMode,
        plushieMode,
        thresholdSettings,
    ]);

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
            periods = Array.from({ length: 5 }, (_, i) => subMonths(now, (4 - i) * 12)); // 5 years
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
        const mugState = { total: 0 };

        // Calculate baseline totals for data before the first period
        if (periods.length > 0) {
            let firstPeriodStart: Date;
            if (timeRange === "daily") firstPeriodStart = startOfDay(periods[0]);
            else if (timeRange === "weekly") firstPeriodStart = startOfWeek(periods[0]);
            else if (timeRange === "monthly") firstPeriodStart = startOfMonth(periods[0]);
            else firstPeriodStart = startOfYear(periods[0]);

            while (
                transactionIndex < sortedTransactions.length &&
                getTransactionTimestamp(sortedTransactions[transactionIndex]) < firstPeriodStart.getTime()
            ) {
                applyTransaction(tempInventory, sortedTransactions[transactionIndex], mugState);
                transactionIndex += 1;
            }
        }

        const baselineTotals = getTotals(tempInventory, mugState.total);
        let lastPeriodProfit = baselineTotals.museumProfit;

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
                viewType === "total" ? currentTotalProfit : currentTotalProfit - lastPeriodProfit;
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
        const relevantPeriods = chartData.filter((p) => p.ts >= firstRelevantTxDate);
        if (relevantPeriods.length === 0) return 0;
        return relevantPeriods.reduce((acc, curr) => acc + curr.profit, 0) / relevantPeriods.length;
    }, [chartData, firstRelevantTxDate]);

    const flowerBuyPlan = useMemo(
        () =>
            computeBuyPlanByItems(
                flowersData.map((f) => ({ name: f.name, stock: f.stats.stock })),
                flowerNumItems
            ),
        [flowersData, flowerNumItems]
    );
    const plushieBuyPlan = useMemo(
        () =>
            computeBuyPlanByItems(
                plushiesData.map((p) => ({ name: p.name, stock: p.stats.stock })),
                plushieNumItems
            ),
        [plushiesData, plushieNumItems]
    );

    const fetchPricelistData = useCallback(async () => {
        if (!weav3rUserId) {
            setPricelistError("Weav3r User ID not configured. Please set it up in Terminal.");
            return;
        }

        setIsFetchingPricelist(true);
        setPricelistError(null);

        try {
            const teKey = getTEApiKey();
            const promises = [
                fetch("https://weav3r.dev/api/marketplace").then(res => res.json()),
                fetch(`https://weav3r.dev/api/pricelist/${weav3rUserId}`).then(res => res.json())
            ];

            if (teKey) {
                const teClient = TornExchange.getInstance();
                promises.push(teClient.getPricelist(weav3rUserId).catch(err => ({ error: err.message, items: [] })));
            }

            const [marketData, pricelistData, teData] = await Promise.all(promises);

            if (marketData.error) throw new Error(marketData.error);
            if (pricelistData.error) throw new Error(pricelistData.error);

            const priceMap: Record<number, number> = {};
            if (Array.isArray(marketData.items)) {
                marketData.items.forEach((item: any) => {
                    if (item.item_id && item.market_price) {
                        priceMap[item.item_id] = item.market_price;
                    }
                });
            }
            setMarketPrices(priceMap);

            const userPriceMap: Record<string, number> = {};
            if (Array.isArray(pricelistData)) {
                pricelistData.forEach((item: any) => {
                    const normalizedName = item.name?.trim().toLowerCase();
                    if (normalizedName && item.buyPrice) {
                        userPriceMap[normalizedName] = item.buyPrice;
                    }
                });
            }
            setUserPricelist(userPriceMap);

            if (teData && teData.items) {
                setTePricelist(teData.items);
            }
        } catch (err: any) {
            console.error("Failed to fetch pricelist data", err);
            setPricelistError(err.message || "Failed to load pricelist data");
        } finally {
            setIsFetchingPricelist(false);
        }
    }, [weav3rUserId]);

    useEffect(() => {
        if ((flowerMode === "price" || plushieMode === "price") && isLoaded) {
            fetchPricelistData();
        }
    }, [flowerMode, plushieMode, isLoaded, fetchPricelistData]);

    const calculateOfferPercentage = useCallback(
        (stock: number, thresholds: typeof thresholdSettings): number => {
            if (stock <= thresholds.threshold1) return thresholds.offer1;
            if (stock <= thresholds.threshold2) return thresholds.offer2;
            if (stock <= thresholds.threshold3) return thresholds.offer3;
            return thresholds.offerElse;
        },
        []
    );

    const applyAutoPricing = useCallback(
        (setType: "flower" | "plushie") => {
            const data = setType === "flower" ? flowersData : plushiesData;
            const setEdits =
                setType === "flower" ? setFlowerPricelistEdits : setPlushiePricelistEdits;
            const setItems = setType === "flower" ? FLOWER_SET_ITEMS : PLUSHIE_SET_ITEMS;

            const newEdits: Record<string, number> = {};
            data.forEach((item) => {
                const percentage = calculateOfferPercentage(item.stats.stock, thresholdSettings);
                const setItem = setItems.find((si) => si.name === item.name);
                const itemId = setItem?.id || 0;
                const marketPrice = marketPrices[itemId] || setItem?.marketValue || 0;
                const currentPrice = userPricelist[item.name.toLowerCase()] || 0;
                const currentPercentage = marketPrice > 0 ? Number(((currentPrice / marketPrice) * 100).toFixed(1)) : 0;
                
                if (percentage !== currentPercentage) {
                    newEdits[item.name] = percentage;
                }
            });
            setEdits(newEdits);
        },
        [flowersData, plushiesData, calculateOfferPercentage, thresholdSettings, marketPrices, userPricelist]
    );

    const savePricelist = useCallback(
        async (type: "flower" | "plushie") => {
            setIsUpdatingPricelist(true);
            setPricelistError(null);
            setPricelistSuccess(null);

            try {
                const edits = type === "flower" ? flowerPricelistEdits : plushiePricelistEdits;
                const setItems = type === "flower" ? FLOWER_SET_ITEMS : PLUSHIE_SET_ITEMS;
                
                const updates = Object.entries(edits).map(([name, percentage]) => {
                    const item = setItems.find((si) => si.name === name);
                    return {
                        itemId: item?.id || 0,
                        percentage: Number(percentage),
                    };
                }).filter(u => u.itemId > 0);

                if (updates.length === 0) {
                    throw new Error("No items to update.");
                }

                const promises = [];

                // Weav3r Update
                if (selectedPlatforms.includes("weav3r")) {
                    const userId = getWeav3rUserId();
                    const apiKey = getWeav3rApiKey();
                    if (!userId || !apiKey) throw new Error("Weav3r config missing");

                    promises.push(
                        fetch(`https://weav3r.dev/api/pricelist/${userId}?apiKey=${apiKey}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ 
                                items: updates.map(u => ({
                                    itemID: u.itemId,
                                    pricingType: "market_percentage" as const,
                                    pricingValue: u.percentage,
                                    inflationProtectionEnabled: false,
                                    roundToPlace: 0,
                                }))
                            }),
                        }).then(async res => {
                            if (!res.ok) {
                                const err = await res.json();
                                throw new Error(`W3B Error: ${err.message || res.statusText}`);
                            }
                        })
                    );
                }

                // TornExchange Update
                if (selectedPlatforms.includes("tornexchange")) {
                    const teKey = getTEApiKey();
                    if (!teKey) throw new Error("TornExchange API key missing");

                    const teClient = TornExchange.getInstance();
                    promises.push(
                        teClient.updateItemPricesByPercentage(updates)
                        .catch(err => {
                            throw new Error(`TE Error: ${err.message || "Failed to update TE"}`);
                        })
                    );
                }

                if (promises.length === 0) {
                    throw new Error("No platforms selected for update.");
                }

                await Promise.all(promises);

                setPricelistSuccess(`Pricelist updated successfully on ${selectedPlatforms.join(" & ")}!`);
                if (type === "flower") setFlowerPricelistEdits({});
                else setPlushiePricelistEdits({});
                
                // Refresh data
                fetchPricelistData();
                clearDriftStatus(type);
                setTimeout(() => setPricelistSuccess(null), 3000);
            } catch (error: any) {
                console.error("Failed to save pricelist:", error);
                setPricelistError(error.message || "Failed to update pricelist.");
            } finally {
                setIsUpdatingPricelist(false);
            }
        },
        [weav3rApiKey, weav3rUserId, flowerPricelistEdits, plushiePricelistEdits, selectedPlatforms, fetchPricelistData, clearDriftStatus]
    );

    if (!isLoaded)
        return (
            <div className="text-center py-20 animate-pulse text-foreground/50">
                Loading Tracker Data...
            </div>
        );

    const pointsAvg = pointsStats.stock > 0 ? pointsStats.totalCost / pointsStats.stock : 0;
    const finalTotalValue = chartData.length > 0 ? chartData[chartData.length - 1].profit : 0;
    const referenceValue = viewType === "daily" ? averageProfit : finalTotalValue;

    return (
        <div
            className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10"
            style={
                {
                    "--primary": CATEGORY_COLORS.museum.hex,
                } as React.CSSProperties
            }
        >
            {/* Hero Section: 1/3 Stats List - 2/3 Chart (always visible) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-panel rounded-3xl border border-border shadow-2xl p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-bl-[10rem] -z-10 pointer-events-none transition-transform group-hover:scale-110 duration-700" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-tr-[8rem] -z-10 pointer-events-none transition-transform group-hover:scale-110 duration-700" />

                {/* Overview List (1/3) */}
                <div className="space-y-8 pr-0 lg:pr-8 border-r-0 lg:border-r border-border/50">
                    <div>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-6 flex items-center gap-2">
                            <HugeiconsIcon icon={Analytics01Icon} size={12} />
                            Inventory Overview
                        </h2>

                        <div className="space-y-6">
                            <OverviewItem
                                icon={<HugeiconsIcon icon={Coins01Icon} size={16} />}
                                label="Points Stock"
                                value={pointsStats.stock.toLocaleString()}
                                subValue={`Avg Cost: ${formatMoney(pointsAvg)}`}
                            />
                            <OverviewItem
                                icon={<HugeiconsIcon icon={FlowerIcon} size={16} />}
                                label="Flower Stock"
                                value={flowersData
                                    .reduce((acc, curr) => acc + curr.stats.stock, 0)
                                    .toLocaleString()}
                                subValue={`${flowerSetsPossible} Sets Ready`}
                            />
                            <OverviewItem
                                icon={<HugeiconsIcon icon={AnonymousIcon} size={16} />}
                                label="Plushie Stock"
                                value={plushiesData
                                    .reduce((acc, curr) => acc + curr.stats.stock, 0)
                                    .toLocaleString()}
                                subValue={`${plushieSetsPossible} Sets Ready`}
                            />
                            <OverviewItem
                                icon={<HugeiconsIcon icon={LibraryIcon} size={16} />}
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
                                <HugeiconsIcon
                                    icon={PackageIcon}
                                    size={24}
                                    className="text-primary"
                                />
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
                        primaryColor={CATEGORY_COLORS.museum.hex}
                        formatValue={formatMoney}
                    />
                </div>
            </div>

            <>
                {/* Flowers Section */}
                <div className="bg-panel rounded-xl border border-border shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6 border-b border-border/50 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <HugeiconsIcon
                                    icon={FlowerIcon}
                                    size={24}
                                    className="text-primary"
                                />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Flower Sets</h2>
                                <p className="text-sm text-foreground/60">
                                    {Math.max(0, flowerSetsPossible)} complete sets ready to
                                    convert.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setFlowerMode(flowerMode === "buy" ? "view" : "buy")}
                                className={`p-2 rounded-lg transition-all ${
                                    flowerMode === "buy"
                                        ? "bg-success text-success-foreground shadow-sm"
                                        : "bg-success/10 text-success hover:bg-success/20"
                                }`}
                                title="Buy Mode"
                            >
                                <HugeiconsIcon icon={ShoppingBasket03Icon} size={20} />
                            </button>
                            <button
                                onClick={() => {
                                    if (flowerMode === "price") {
                                        setFlowerMode("view");
                                    } else {
                                        setFlowerMode("price");
                                        applyAutoPricing("flower");
                                        clearDriftStatus("flower");
                                    }
                                }}
                                className={`relative p-2 rounded-lg transition-all ${
                                    flowerMode === "price"
                                        ? "bg-blue-500 text-white shadow-sm"
                                        : "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                                }`}
                                title="Set Pricelist"
                            >
                                <HugeiconsIcon icon={PencilEdit02Icon} size={20} />
                                {flowerDrift && (
                                    <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-warning rounded-full border border-background shadow-sm pointer-events-none" />
                                )}
                            </button>
                        </div>
                    </div>
                    {flowerMode === "buy" && (
                        <div className="mb-4 flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-foreground/60 whitespace-nowrap">
                                    Different Items:
                                </span>
                                <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={flowerNumItems}
                                    onChange={(e) => {
                                        const n = parseInt(e.target.value, 10);
                                        if (!isNaN(n) && n >= 1) setFlowerNumItems(n);
                                        else if (e.target.value === "") setFlowerNumItems(1);
                                    }}
                                    className="w-16 px-2 py-1.5 text-sm font-bold text-center bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                                />
                            </div>
                            {flowerBuyPlan.totalQty > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 border border-success/30 rounded-lg">
                                    <HugeiconsIcon
                                        icon={ShoppingBasket03Icon}
                                        size={14}
                                        className="text-success flex-shrink-0"
                                    />
                                    <p className="text-xs text-foreground/80">
                                        Buy{" "}
                                        <span className="font-bold text-success">
                                            {flowerBuyPlan.totalQty}
                                        </span>{" "}
                                        items across{" "}
                                        <span className="font-bold text-success">
                                            {flowerBuyPlan.itemsToBuy}
                                        </span>{" "}
                                        types to reach{" "}
                                        <span className="font-bold text-success">
                                            {flowerBuyPlan.target}
                                        </span>{" "}
                                        sets.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                    {flowerMode === "price" && (
                        <div className="mb-6">
                            {!weav3rApiKey || !weav3rUserId ? (
                                <div className="bg-warning/10 border border-warning/20 p-4 rounded-xl flex items-start gap-4">
                                    <HugeiconsIcon
                                        icon={AlertCircleIcon}
                                        size={20}
                                        className="text-warning shrink-0 mt-0.5"
                                    />
                                    <div>
                                        <h3 className="font-semibold text-warning">
                                            Weav3r Config Missing
                                        </h3>
                                        <p className="text-sm text-foreground/70 mt-1">
                                            Configure your Weav3r API Key and User ID on the
                                            Terminal page to enable the "Set Pricelist" feature.
                                        </p>
                                    </div>
                                </div>
                            ) : isFetchingPricelist ? (
                                <div className="flex items-center justify-center gap-2 py-8 text-foreground/60">
                                    <HugeiconsIcon
                                        icon={Loading03Icon}
                                        size={20}
                                        className="animate-spin"
                                    />
                                    <span>Loading pricelist data...</span>
                                </div>
                            ) : (
                                <>
                                    {pricelistError && (
                                        <div className="mb-4 bg-danger/10 border border-danger/20 p-3 rounded-lg flex items-center gap-2 text-danger text-sm">
                                            <HugeiconsIcon icon={AlertCircleIcon} size={16} />
                                            {pricelistError}
                                        </div>
                                    )}
                                    {pricelistSuccess && (
                                        <div className="mb-4 bg-success/10 border border-success/20 p-3 rounded-lg flex items-center gap-2 text-success text-sm">
                                            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} />
                                            {pricelistSuccess}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-6 mb-4 pb-4 border-b border-border/50 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">Target Platforms</span>
                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedPlatforms.includes("weav3r")}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedPlatforms([...selectedPlatforms, "weav3r"]);
                                                            else setSelectedPlatforms(selectedPlatforms.filter(p => p !== "weav3r"));
                                                        }}
                                                        className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/50 bg-background transition-all"
                                                    />
                                                    <span className={`text-[11px] font-bold uppercase tracking-tight transition-colors ${selectedPlatforms.includes("weav3r") ? "text-primary" : "text-foreground/40 group-hover:text-foreground/60"}`}>TornW3B</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedPlatforms.includes("tornexchange")}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedPlatforms([...selectedPlatforms, "tornexchange"]);
                                                            else setSelectedPlatforms(selectedPlatforms.filter(p => p !== "tornexchange"));
                                                        }}
                                                        className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/50 bg-background transition-all"
                                                    />
                                                    <span className={`text-[11px] font-bold uppercase tracking-tight transition-colors ${selectedPlatforms.includes("tornexchange") ? "text-primary" : "text-foreground/40 group-hover:text-foreground/60"}`}>TornExchange</span>
                                                </label>
                                            </div>
                                        </div>

                                        {selectedPlatforms.includes("weav3r") && (!weav3rApiKey || !weav3rUserId) && (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-warning/10 border border-warning/20 rounded-full">
                                                <HugeiconsIcon icon={AlertCircleIcon} size={12} className="text-warning" />
                                                <span className="text-[10px] font-bold text-warning uppercase">TornW3B Config Missing</span>
                                            </div>
                                        )}
                                        {selectedPlatforms.includes("tornexchange") && !getTEApiKey() && (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-warning/10 border border-warning/20 rounded-full">
                                                <HugeiconsIcon icon={AlertCircleIcon} size={12} className="text-warning" />
                                                <span className="text-[10px] font-bold text-warning uppercase">TE Config Missing</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                                        <button
                                            onClick={() => applyAutoPricing("flower")}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                                        >
                                            <HugeiconsIcon icon={DashboardSpeed01Icon} size={14} />
                                            Auto
                                        </button>
                                        <button
                                            onClick={() => savePricelist("flower")}
                                            disabled={
                                                isUpdatingPricelist ||
                                                Object.keys(flowerPricelistEdits).length === 0
                                            }
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-success/10 text-success hover:bg-success/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                        >
                                            {isUpdatingPricelist ? (
                                                <HugeiconsIcon
                                                    icon={Loading03Icon}
                                                    size={14}
                                                    className="animate-spin"
                                                />
                                            ) : (
                                                <HugeiconsIcon
                                                    icon={CheckmarkCircle01Icon}
                                                    size={14}
                                                />
                                            )}
                                            Save Pricelist
                                        </button>
                                        {Object.keys(flowerPricelistEdits).length > 0 && (
                                            <span className="text-xs text-foreground/60">
                                                {Object.keys(flowerPricelistEdits).length} pending
                                                change(s)
                                            </span>
                                        )}
                                        <button
                                            onClick={() =>
                                                setShowThresholdSettings(!showThresholdSettings)
                                            }
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                                showThresholdSettings
                                                    ? "bg-primary text-primary-foreground shadow-sm"
                                                    : "bg-primary/10 text-primary hover:bg-primary/20"
                                            }`}
                                        >
                                            <HugeiconsIcon icon={SettingsIcon} size={14} />
                                            Settings
                                        </button>
                                    </div>
                                    {showThresholdSettings && (
                                        <div className="mb-4 p-4 bg-foreground/5 rounded-lg border border-border">
                                            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/60 mb-3">
                                                Stock Thresholds (Auto Button)
                                            </h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div>
                                                    <label className="text-xs text-foreground/60 block mb-1">
                                                        Threshold 1
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={thresholdSettings.threshold1}
                                                        onChange={(e) =>
                                                            setThresholdSettings((prev) => ({
                                                                ...prev,
                                                                threshold1:
                                                                    parseFloat(e.target.value) || 0,
                                                            }))
                                                        }
                                                        className="w-full px-2 py-1 text-sm bg-background border border-border rounded-lg"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60 block mb-1">
                                                        Offer %
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={200}
                                                        value={thresholdSettings.offer1}
                                                        onChange={(e) =>
                                                            setThresholdSettings((prev) => ({
                                                                ...prev,
                                                                offer1:
                                                                    parseFloat(e.target.value) || 0,
                                                            }))
                                                        }
                                                        className="w-full px-2 py-1 text-sm bg-background border border-border rounded-lg"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60 block mb-1">
                                                        Threshold 2
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={thresholdSettings.threshold2}
                                                        onChange={(e) =>
                                                            setThresholdSettings((prev) => ({
                                                                ...prev,
                                                                threshold2:
                                                                    parseFloat(e.target.value) || 0,
                                                            }))
                                                        }
                                                        className="w-full px-2 py-1 text-sm bg-background border border-border rounded-lg"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60 block mb-1">
                                                        Offer %
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={200}
                                                        value={thresholdSettings.offer2}
                                                        onChange={(e) =>
                                                            setThresholdSettings((prev) => ({
                                                                ...prev,
                                                                offer2:
                                                                    parseFloat(e.target.value) || 0,
                                                            }))
                                                        }
                                                        className="w-full px-2 py-1 text-sm bg-background border border-border rounded-lg"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60 block mb-1">
                                                        Threshold 3
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={thresholdSettings.threshold3}
                                                        onChange={(e) =>
                                                            setThresholdSettings((prev) => ({
                                                                ...prev,
                                                                threshold3:
                                                                    parseFloat(e.target.value) || 0,
                                                            }))
                                                        }
                                                        className="w-full px-2 py-1 text-sm bg-background border border-border rounded-lg"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60 block mb-1">
                                                        Offer %
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={200}
                                                        value={thresholdSettings.offer3}
                                                        onChange={(e) =>
                                                            setThresholdSettings((prev) => ({
                                                                ...prev,
                                                                offer3:
                                                                    parseFloat(e.target.value) || 0,
                                                            }))
                                                        }
                                                        className="w-full px-2 py-1 text-sm bg-background border border-border rounded-lg"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60 block mb-1">
                                                        Above Threshold 3
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={200}
                                                        value={thresholdSettings.offerElse}
                                                        onChange={(e) =>
                                                            setThresholdSettings((prev) => ({
                                                                ...prev,
                                                                offerElse:
                                                                    parseFloat(e.target.value) || 0,
                                                            }))
                                                        }
                                                        className="w-full px-2 py-1 text-sm bg-background border border-border rounded-lg"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Removed table to use ItemGridCard natively */}
                                </>
                            )}
                        </div>
                    )}
                    <div
                        className={`grid gap-2 p-0 rounded-xl transition-colors ${
                            flowerMode === "price"
                                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                                : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
                        }`}
                    >
                        {flowersData.map((item) => {
                            const maxFlowerStock = Math.max(...flowersData.map((f) => f.stats.stock), 1);
                            const buyInfo =
                                flowerMode === "buy"
                                    ? flowerBuyPlan.purchases.find((p) => p.name === item.name)
                                    : undefined;
                            const setItem = FLOWER_SET_ITEMS.find((si) => si.name === item.name);
                            const itemId = setItem?.id || 0;
                            const marketPrice = marketPrices[itemId] || setItem?.marketValue || 0;
                            const currentPrice = userPricelist[item.name.toLowerCase()] || 0;
                            const currentPercentage = marketPrice > 0 ? Number(((currentPrice / marketPrice) * 100).toFixed(1)) : 0;
                            const newPercentage = flowerPricelistEdits[item.name] ?? currentPercentage;

                            return (
                                <ItemGridCard
                                    key={item.name}
                                    name={item.name}
                                    stats={item.stats}
                                    buyInfo={buyInfo}
                                    mode={flowerMode}
                                    itemId={itemId}
                                    maxStock={maxFlowerStock}
                                    priceInfo={
                                        flowerMode === "price"
                                            ? {
                                                  marketPrice,
                                                  currentPercentage,
                                                  newPercentage,
                                                  onPercentageChange: (val) => {
                                                      const num = parseFloat(val as string);
                                                      if (!isNaN(num) && num >= 0) {
                                                          setFlowerPricelistEdits((prev) => ({
                                                              ...prev,
                                                              [item.name]: num,
                                                          }));
                                                      } else if (val === "") {
                                                          setFlowerPricelistEdits((prev) => ({
                                                              ...prev,
                                                              [item.name]: "" as any,
                                                          }));
                                                      }
                                                  },
                                              }
                                            : undefined
                                    }
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Plushies Section */}
                <div className="bg-panel rounded-xl border border-border shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6 border-b border-border/50 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <HugeiconsIcon
                                    icon={AnonymousIcon}
                                    size={24}
                                    className="text-primary"
                                />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Plushie Sets</h2>
                                <p className="text-sm text-foreground/60">
                                    {Math.max(0, plushieSetsPossible)} complete sets ready to
                                    convert.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() =>
                                    setPlushieMode(plushieMode === "buy" ? "view" : "buy")
                                }
                                className={`p-2 rounded-lg transition-all ${
                                    plushieMode === "buy"
                                        ? "bg-success text-success-foreground shadow-sm"
                                        : "bg-success/10 text-success hover:bg-success/20"
                                }`}
                                title="Buy Mode"
                            >
                                <HugeiconsIcon icon={ShoppingBasket03Icon} size={20} />
                            </button>
                            <button
                                onClick={() => {
                                    if (plushieMode === "price") {
                                        setPlushieMode("view");
                                    } else {
                                        setPlushieMode("price");
                                        applyAutoPricing("plushie");
                                        clearDriftStatus("plushie");
                                    }
                                }}
                                className={`relative p-2 rounded-lg transition-all ${
                                    plushieMode === "price"
                                        ? "bg-blue-500 text-white shadow-sm"
                                        : "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                                }`}
                                title="Set Pricelist"
                            >
                                <HugeiconsIcon icon={PencilEdit02Icon} size={20} />
                                {plushieDrift && (
                                    <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-warning rounded-full border border-background shadow-sm pointer-events-none" />
                                )}
                            </button>
                        </div>
                    </div>
                    {plushieMode === "buy" && (
                        <div className="mb-4 flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-foreground/60 whitespace-nowrap">
                                    Different Items:
                                </span>
                                <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={plushieNumItems}
                                    onChange={(e) => {
                                        const n = parseInt(e.target.value, 10);
                                        if (!isNaN(n) && n >= 1) setPlushieNumItems(n);
                                        else if (e.target.value === "") setPlushieNumItems(1);
                                    }}
                                    className="w-16 px-2 py-1.5 text-sm font-bold text-center bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                                />
                            </div>
                            {plushieBuyPlan.totalQty > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 border border-success/30 rounded-lg">
                                    <HugeiconsIcon
                                        icon={ShoppingBasket03Icon}
                                        size={14}
                                        className="text-success flex-shrink-0"
                                    />
                                    <p className="text-xs text-foreground/80">
                                        Buy{" "}
                                        <span className="font-bold text-success">
                                            {plushieBuyPlan.totalQty}
                                        </span>{" "}
                                        items across{" "}
                                        <span className="font-bold text-success">
                                            {plushieBuyPlan.itemsToBuy}
                                        </span>{" "}
                                        types to reach{" "}
                                        <span className="font-bold text-success">
                                            {plushieBuyPlan.target}
                                        </span>{" "}
                                        sets.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                    {plushieMode === "price" && (
                        <div className="mb-6">
                            {!weav3rApiKey || !weav3rUserId ? (
                                <div className="bg-warning/10 border border-warning/20 p-4 rounded-xl flex items-start gap-4">
                                    <HugeiconsIcon
                                        icon={AlertCircleIcon}
                                        size={20}
                                        className="text-warning shrink-0 mt-0.5"
                                    />
                                    <div>
                                        <h3 className="font-semibold text-warning">
                                            Weav3r Config Missing
                                        </h3>
                                        <p className="text-sm text-foreground/70 mt-1">
                                            Configure your Weav3r API Key and User ID on the
                                            Terminal page to enable the "Set Pricelist" feature.
                                        </p>
                                    </div>
                                </div>
                            ) : isFetchingPricelist ? (
                                <div className="flex items-center justify-center gap-2 py-8 text-foreground/60">
                                    <HugeiconsIcon
                                        icon={Loading03Icon}
                                        size={20}
                                        className="animate-spin"
                                    />
                                    <span>Loading pricelist data...</span>
                                </div>
                            ) : (
                                <>
                                    {pricelistError && (
                                        <div className="mb-4 bg-danger/10 border border-danger/20 p-3 rounded-lg flex items-center gap-2 text-danger text-sm">
                                            <HugeiconsIcon icon={AlertCircleIcon} size={16} />
                                            {pricelistError}
                                        </div>
                                    )}
                                    {pricelistSuccess && (
                                        <div className="mb-4 bg-success/10 border border-success/20 p-3 rounded-lg flex items-center gap-2 text-success text-sm">
                                            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} />
                                            {pricelistSuccess}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                                        <button
                                            onClick={() => applyAutoPricing("plushie")}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                                        >
                                            <HugeiconsIcon icon={DashboardSpeed01Icon} size={14} />
                                            Auto
                                        </button>
                                        <button
                                            onClick={() => savePricelist("plushie")}
                                            disabled={
                                                isUpdatingPricelist ||
                                                Object.keys(plushiePricelistEdits).length === 0
                                            }
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-success/10 text-success hover:bg-success/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                        >
                                            {isUpdatingPricelist ? (
                                                <HugeiconsIcon
                                                    icon={Loading03Icon}
                                                    size={14}
                                                    className="animate-spin"
                                                />
                                            ) : (
                                                <HugeiconsIcon
                                                    icon={CheckmarkCircle01Icon}
                                                    size={14}
                                                />
                                            )}
                                            Save Pricelist
                                        </button>
                                        {Object.keys(plushiePricelistEdits).length > 0 && (
                                            <span className="text-xs text-foreground/60">
                                                {Object.keys(plushiePricelistEdits).length} pending
                                                change(s)
                                            </span>
                                        )}
                                        <button
                                            onClick={() =>
                                                setShowThresholdSettings(!showThresholdSettings)
                                            }
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                                showThresholdSettings
                                                    ? "bg-primary text-primary-foreground shadow-sm"
                                                    : "bg-primary/10 text-primary hover:bg-primary/20"
                                            }`}
                                        >
                                            <HugeiconsIcon icon={SettingsIcon} size={14} />
                                            Settings
                                        </button>
                                    </div>
                                    {showThresholdSettings && (
                                        <div className="mb-4 p-4 bg-foreground/5 rounded-lg border border-border">
                                            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/60 mb-3">
                                                Stock Thresholds (Auto Button)
                                            </h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div>
                                                    <label className="text-xs text-foreground/60 block mb-1">
                                                        Threshold 1
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={thresholdSettings.threshold1}
                                                        onChange={(e) =>
                                                            setThresholdSettings((prev) => ({
                                                                ...prev,
                                                                threshold1:
                                                                    parseFloat(e.target.value) || 0,
                                                            }))
                                                        }
                                                        className="w-full px-2 py-1 text-sm bg-background border border-border rounded-lg"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60 block mb-1">
                                                        Offer %
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={200}
                                                        value={thresholdSettings.offer1}
                                                        onChange={(e) =>
                                                            setThresholdSettings((prev) => ({
                                                                ...prev,
                                                                offer1:
                                                                    parseFloat(e.target.value) || 0,
                                                            }))
                                                        }
                                                        className="w-full px-2 py-1 text-sm bg-background border border-border rounded-lg"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60 block mb-1">
                                                        Threshold 2
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={thresholdSettings.threshold2}
                                                        onChange={(e) =>
                                                            setThresholdSettings((prev) => ({
                                                                ...prev,
                                                                threshold2:
                                                                    parseFloat(e.target.value) || 0,
                                                            }))
                                                        }
                                                        className="w-full px-2 py-1 text-sm bg-background border border-border rounded-lg"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60 block mb-1">
                                                        Offer %
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={200}
                                                        value={thresholdSettings.offer2}
                                                        onChange={(e) =>
                                                            setThresholdSettings((prev) => ({
                                                                ...prev,
                                                                offer2:
                                                                    parseFloat(e.target.value) || 0,
                                                            }))
                                                        }
                                                        className="w-full px-2 py-1 text-sm bg-background border border-border rounded-lg"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60 block mb-1">
                                                        Threshold 3
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={thresholdSettings.threshold3}
                                                        onChange={(e) =>
                                                            setThresholdSettings((prev) => ({
                                                                ...prev,
                                                                threshold3:
                                                                    parseFloat(e.target.value) || 0,
                                                            }))
                                                        }
                                                        className="w-full px-2 py-1 text-sm bg-background border border-border rounded-lg"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60 block mb-1">
                                                        Offer %
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={200}
                                                        value={thresholdSettings.offer3}
                                                        onChange={(e) =>
                                                            setThresholdSettings((prev) => ({
                                                                ...prev,
                                                                offer3:
                                                                    parseFloat(e.target.value) || 0,
                                                            }))
                                                        }
                                                        className="w-full px-2 py-1 text-sm bg-background border border-border rounded-lg"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60 block mb-1">
                                                        Above Threshold 3
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={200}
                                                        value={thresholdSettings.offerElse}
                                                        onChange={(e) =>
                                                            setThresholdSettings((prev) => ({
                                                                ...prev,
                                                                offerElse:
                                                                    parseFloat(e.target.value) || 0,
                                                            }))
                                                        }
                                                        className="w-full px-2 py-1 text-sm bg-background border border-border rounded-lg"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Removed plushie table to use ItemGridCard natively */}
                                </>
                            )}
                        </div>
                    )}
                    <div
                        className={`grid gap-2 p-0 rounded-xl transition-colors ${
                            plushieMode === "price"
                                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                                : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
                        }`}
                    >
                        {plushiesData.map((item) => {
                            const maxPlushieStock = Math.max(...plushiesData.map((p) => p.stats.stock), 1);
                            const buyInfo =
                                plushieMode === "buy"
                                    ? plushieBuyPlan.purchases.find((p) => p.name === item.name)
                                    : undefined;
                            const setItem = PLUSHIE_SET_ITEMS.find((si) => si.name === item.name);
                            const itemId = setItem?.id || 0;
                            const marketPrice = marketPrices[itemId] || setItem?.marketValue || 0;
                            const currentPrice = userPricelist[item.name.toLowerCase()] || 0;
                            const currentPercentage = marketPrice > 0 ? Number(((currentPrice / marketPrice) * 100).toFixed(1)) : 0;
                            const newPercentage = plushiePricelistEdits[item.name] ?? currentPercentage;

                            return (
                                <ItemGridCard
                                    key={item.name}
                                    name={item.name}
                                    stats={item.stats}
                                    buyInfo={buyInfo}
                                    mode={plushieMode}
                                    itemId={itemId}
                                    maxStock={maxPlushieStock}
                                    priceInfo={
                                        plushieMode === "price"
                                            ? {
                                                  marketPrice,
                                                  currentPercentage,
                                                  newPercentage,
                                                  onPercentageChange: (val) => {
                                                      const num = parseFloat(val as string);
                                                      if (!isNaN(num) && num >= 0) {
                                                          setPlushiePricelistEdits((prev) => ({
                                                              ...prev,
                                                              [item.name]: num,
                                                          }));
                                                      } else if (val === "") {
                                                          setPlushiePricelistEdits((prev) => ({
                                                              ...prev,
                                                              [item.name]: "" as any,
                                                          }));
                                                      }
                                                  },
                                              }
                                            : undefined
                                    }
                                />
                            );
                        })}
                    </div>
                </div>

                <div className="bg-panel rounded-xl border border-border shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6 border-b border-border/50 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <HugeiconsIcon
                                    icon={LibraryIcon}
                                    size={24}
                                    className="text-primary"
                                />
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
                                        <h3 className="font-semibold">
                                            {exchange.definition.label}
                                        </h3>
                                        <p className="text-sm text-foreground/60">
                                            {exchange.exchangesReady} ready ·{" "}
                                            {exchange.definition.pointsPerExchange.toLocaleString()}{" "}
                                            points each
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
                <p className={`text-2xl font-bold tracking-tight ${valueClass}`}>{value}</p>
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
                <p className="text-xl font-black tracking-tight text-foreground/90">{value}</p>
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
    numItems,
    setNumItems,
    buyPlan,
    currentSets,
}: {
    title: string;
    icon: React.ReactNode;
    numItems: number;
    setNumItems: (n: number) => void;
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
                        Different Items:
                    </span>
                    <input
                        type="number"
                        min={1}
                        max={20}
                        value={numItems}
                        onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            if (!isNaN(n) && n >= 1) setNumItems(n);
                            else if (e.target.value === "") setNumItems(1);
                        }}
                        className="w-16 px-2 py-1.5 text-sm font-bold text-center bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                    />
                </div>
            </div>

            {buyPlan.itemsToBuy > 0 ? (
                <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <HugeiconsIcon
                        icon={ShoppingBasket03Icon}
                        size={16}
                        className="text-primary flex-shrink-0"
                    />
                    <p className="text-sm text-foreground/80">
                        Buy <span className="font-bold text-primary">{buyPlan.totalQty}</span> items
                        across <span className="font-bold text-primary">{buyPlan.itemsToBuy}</span>{" "}
                        types to reach{" "}
                        <span className="font-bold text-primary">{buyPlan.target}</span> sets.
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
function BuyPlanCard({ item }: { item: { name: string; current: number; buy: number } }) {
    const needsBuy = item.buy > 0;
    return (
        <div
            className={`p-4 rounded-lg border ${needsBuy ? "border-primary/30 bg-primary/5" : "border-border/50 bg-background/50"}`}
        >
            <h4 className="font-semibold text-sm truncate" title={formatItemName(item.name)}>
                {formatItemName(item.name)}
            </h4>
            <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xs text-foreground/60">Current:</span>
                <span className="font-bold text-foreground/70">{item.current}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs text-foreground/60">Buy:</span>
                <span className={`font-bold ${needsBuy ? "text-success" : "text-foreground/40"}`}>
                    {needsBuy ? `+${item.buy}` : "—"}
                </span>
            </div>
        </div>
    );
}
