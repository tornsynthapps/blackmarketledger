"use client";

import { useEffect, useState, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    TableIcon,
    AlertCircleIcon,
    CheckmarkCircle01Icon,
    Loading03Icon,
    FilterIcon,
    Search01Icon,
    ArrowUp02Icon,
    ArrowDown02Icon,
    Exchange01Icon,
    BankIcon,
    SavingsIcon,
    DashboardSpeed02Icon,
    RefreshIcon,
} from "@hugeicons/core-free-icons";
import { TornExchange } from "@/lib/tornexchange";
import { getApiKey, getUserId, getTEApiKey } from "@/lib/old/api-keys";
import Link from "next/link";

interface PricelistItem {
    id: number;
    name: string;
    w3bPrice: number;
    tePrice: number;
    marketPrice: number;
    category: string;
}

export default function PricelistComparisonPage() {
    const [w3bPricelist, setW3bPricelist] = useState<any[]>([]);
    const [tePricelist, setTePricelist] = useState<any[]>([]);
    const [marketPrices, setMarketPrices] = useState<Record<number, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [teConfigMissing, setTeConfigMissing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState<"all" | "diff" | "match">("all");
    const [sortField, setSortField] = useState<keyof PricelistItem>("name");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [isSyncing, setIsSyncing] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const w3bKey = getApiKey();
            const w3bUser = getUserId();
            const teKey = getTEApiKey();

            if (!w3bUser) {
                throw new Error("Weav3r User ID not configured. Please set it in Terminal settings.");
            }

            // Fetch TornW3B Pricelist
            const w3bRes = await fetch(`https://weav3r.dev/api/pricelist/${w3bUser}`, {
                headers: { accept: "application/json" },
            });
            if (!w3bRes.ok) throw new Error("Failed to fetch TornW3B pricelist");
            const w3bData = await w3bRes.json();
            setW3bPricelist(w3bData);

            // Fetch Market Prices
            const marketRes = await fetch("https://weav3r.dev/api/marketplace");
            if (marketRes.ok) {
                const marketData = await marketRes.json();
                const mPrices: Record<number, number> = {};
                (marketData.items || []).forEach((item: any) => {
                    mPrices[item.item_id] = item.market_price || 0;
                });
                setMarketPrices(mPrices);
            }

            // Fetch TornExchange Pricelist
            if (teKey) {
                try {
                    setTeConfigMissing(false);
                    const teClient = TornExchange.getInstance();
                    const teData = await teClient.getPricelist(w3bUser);
                    setTePricelist(teData.items || []);
                } catch (teErr: any) {
                    console.error("TE Fetch Error:", teErr);
                    // Don't fail the whole page if only TE fails, but log it
                    // We could also set a specific TE error state if needed
                }
            } else {
                setTeConfigMissing(true);
            }
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSyncToTE = async (specificItem?: PricelistItem) => {
        const itemsToSync = specificItem 
            ? [specificItem] 
            : mergedData.filter(i => (i.w3bPrice || 0) !== (i.tePrice || 0) && i.w3bPrice > 0);

        if (itemsToSync.length === 0) return;

        const message = specificItem 
            ? `Sync price for ${specificItem.name} to TornExchange?`
            : `Sync ${itemsToSync.length} discrepant prices from TornW3B to TornExchange?`;

        if (!window.confirm(message)) return;

        setIsSyncing(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const teClient = TornExchange.getInstance();
            const updates = itemsToSync.map(i => ({
                itemId: i.id,
                price: i.w3bPrice
            }));

            await teClient.updateItemPricesByFixed(updates);
            setSuccessMessage(`Successfully synced ${itemsToSync.length} prices!`);
            setTimeout(() => setSuccessMessage(null), 3000);
            fetchData();
        } catch (err: any) {
            console.error("Sync Error:", err);
            setError(err.message || "Failed to sync prices to TornExchange.");
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const mergedData = useMemo(() => {
        const itemsMap = new Map<number, Partial<PricelistItem>>();

        // Process W3B
        w3bPricelist.forEach((item: any) => {
            itemsMap.set(item.itemId, {
                id: item.itemId,
                name: item.name,
                w3bPrice: item.buyPrice,
                marketPrice: marketPrices[item.itemId] || 0,
                category: "Unknown", // W3B doesn't provide category in this endpoint easily
            });
        });

        // Process TE
        tePricelist.forEach((item: any) => {
            const existing = itemsMap.get(item.item_id) || {
                id: item.item_id,
                name: item.name,
                w3bPrice: 0,
                marketPrice: marketPrices[item.item_id] || 0,
                category: item.type || "Other",
            };
            itemsMap.set(item.item_id, {
                ...existing,
                tePrice: item.price,
                category: item.type || existing.category || "Other",
            });
        });

        return Array.from(itemsMap.values()) as PricelistItem[];
    }, [w3bPricelist, tePricelist, marketPrices]);

    const filteredData = useMemo(() => {
        return mergedData
            .filter((item) => {
                const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesFilter = 
                    filter === "all" ? true :
                    filter === "diff" ? (item.w3bPrice || 0) !== (item.tePrice || 0) :
                    (item.w3bPrice || 0) === (item.tePrice || 0);
                return matchesSearch && matchesFilter;
            })
            .sort((a, b) => {
                const aVal = a[sortField];
                const bVal = b[sortField];
                const modifier = sortDirection === "asc" ? 1 : -1;
                
                if (typeof aVal === "string" && typeof bVal === "string") {
                    return aVal.localeCompare(bVal) * modifier;
                }
                return ((aVal as number) - (bVal as number)) * modifier;
            });
    }, [mergedData, searchQuery, filter, sortField, sortDirection]);

    const handleSort = (field: keyof PricelistItem) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-6 max-w-7xl mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-4">
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20 shadow-sm">
                        <HugeiconsIcon icon={Exchange01Icon} size={28} className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight uppercase font-vt323 leading-none italic">
                            Pricelist <span className="text-primary">Sync</span>
                        </h1>
                        <p className="text-xs font-bold font-mono tracking-[0.2em] text-foreground/40 mt-1 uppercase">
                            Cross-Platform Valuation Monitor
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {mergedData.some(i => (i.w3bPrice || 0) !== (i.tePrice || 0) && i.w3bPrice > 0) && (
                        <button
                            onClick={() => handleSyncToTE()}
                            disabled={isLoading || isSyncing}
                            className="flex items-center gap-2 px-4 py-2 bg-success text-success-foreground rounded-xl text-xs font-bold shadow-lg shadow-success/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                        >
                            <HugeiconsIcon icon={RefreshIcon} size={14} className={isSyncing ? "animate-spin" : ""} />
                            Sync All to TE
                        </button>
                    )}
                    <button
                        onClick={fetchData}
                        disabled={isLoading || isSyncing}
                        className="flex items-center gap-2 px-4 py-2 bg-foreground/5 hover:bg-foreground/10 border border-border rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                        <HugeiconsIcon icon={Loading03Icon} size={14} className={isLoading ? "animate-spin" : ""} />
                        Refresh Data
                    </button>
                    <Link
                        href="/museum"
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <HugeiconsIcon icon={BankIcon} size={14} />
                        Update in Museum
                    </Link>
                </div>
            </header>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-panel p-5 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Total Items</span>
                        <HugeiconsIcon icon={TableIcon} size={16} className="text-primary/60" />
                    </div>
                    <div className="text-3xl font-bold font-vt323">{mergedData.length}</div>
                </div>
                <div className="bg-panel p-5 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Discrepancies</span>
                        <HugeiconsIcon icon={AlertCircleIcon} size={16} className="text-warning/60" />
                    </div>
                    <div className="text-3xl font-bold font-vt323 text-warning">
                        {mergedData.filter(i => (i.w3bPrice || 0) !== (i.tePrice || 0)).length}
                    </div>
                </div>
                <div className="bg-panel p-5 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Synchronized</span>
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} className="text-success/60" />
                    </div>
                    <div className="text-3xl font-bold font-vt323 text-success">
                        {mergedData.filter(i => (i.w3bPrice || 0) === (i.tePrice || 0) && i.w3bPrice > 0).length}
                    </div>
                </div>
            </div>

            {/* TE Config Warning */}
            {teConfigMissing && (
                <div className="mb-8 p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between gap-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <HugeiconsIcon icon={AlertCircleIcon} size={20} className="text-primary" />
                        <div>
                            <p className="text-sm font-bold text-primary">TornExchange Not Configured</p>
                            <p className="text-xs text-foreground/60">Cross-platform price comparison requires your TornExchange API key.</p>
                        </div>
                    </div>
                    <Link 
                        href="/account"
                        className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
                    >
                        Configure Now
                    </Link>
                </div>
            )}

            {/* Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <HugeiconsIcon icon={Search01Icon} size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30" />
                    <input
                        type="text"
                        placeholder="Search items by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-foreground/5 border border-border rounded-xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                    />
                </div>

                <div className="flex items-center gap-2 bg-foreground/5 p-1 rounded-xl border border-border">
                    <button
                        onClick={() => setFilter("all")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === "all" ? "bg-background text-primary shadow-sm" : "text-foreground/60 hover:text-foreground"}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter("diff")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === "diff" ? "bg-background text-warning shadow-sm" : "text-foreground/60 hover:text-foreground"}`}
                    >
                        Differences
                    </button>
                    <button
                        onClick={() => setFilter("match")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === "match" ? "bg-background text-success shadow-sm" : "text-foreground/60 hover:text-foreground"}`}
                    >
                        Matches
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-panel rounded-2xl border border-border overflow-hidden shadow-xl">
                <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-border">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-panel/95 backdrop-blur-md z-10">
                            <tr className="border-b border-border shadow-sm">
                                <th onClick={() => handleSort("name")} className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 cursor-pointer hover:text-primary transition-colors">
                                    <div className="flex items-center gap-2">
                                        Item Name
                                        {sortField === "name" && (sortDirection === "asc" ? <HugeiconsIcon icon={ArrowUp02Icon} size={12} /> : <HugeiconsIcon icon={ArrowDown02Icon} size={12} />)}
                                    </div>
                                </th>
                                <th onClick={() => handleSort("category")} className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 cursor-pointer hover:text-primary transition-colors">
                                    <div className="flex items-center gap-2">
                                        Category
                                        {sortField === "category" && (sortDirection === "asc" ? <HugeiconsIcon icon={ArrowUp02Icon} size={12} /> : <HugeiconsIcon icon={ArrowDown02Icon} size={12} />)}
                                    </div>
                                </th>
                                <th onClick={() => handleSort("marketPrice")} className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 cursor-pointer hover:text-primary transition-colors">
                                    <div className="flex items-center gap-2">
                                        Market
                                        {sortField === "marketPrice" && (sortDirection === "asc" ? <HugeiconsIcon icon={ArrowUp02Icon} size={12} /> : <HugeiconsIcon icon={ArrowDown02Icon} size={12} />)}
                                    </div>
                                </th>
                                <th onClick={() => handleSort("w3bPrice")} className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 cursor-pointer hover:text-primary transition-colors">
                                    <div className="flex items-center gap-2">
                                        TornW3B
                                        {sortField === "w3bPrice" && (sortDirection === "asc" ? <HugeiconsIcon icon={ArrowUp02Icon} size={12} /> : <HugeiconsIcon icon={ArrowDown02Icon} size={12} />)}
                                    </div>
                                </th>
                                <th onClick={() => handleSort("tePrice")} className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 cursor-pointer hover:text-primary transition-colors">
                                    <div className="flex items-center gap-2">
                                        TornExchange
                                        {sortField === "tePrice" && (sortDirection === "asc" ? <HugeiconsIcon icon={ArrowUp02Icon} size={12} /> : <HugeiconsIcon icon={ArrowDown02Icon} size={12} />)}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-5"><div className="h-4 bg-foreground/5 rounded w-32" /></td>
                                        <td className="px-6 py-5"><div className="h-4 bg-foreground/5 rounded w-20" /></td>
                                        <td className="px-6 py-5"><div className="h-4 bg-foreground/5 rounded w-24" /></td>
                                        <td className="px-6 py-5"><div className="h-4 bg-foreground/5 rounded w-24" /></td>
                                        <td className="px-6 py-5"><div className="h-4 bg-foreground/5 rounded w-24" /></td>
                                        <td className="px-6 py-5"><div className="h-4 bg-foreground/5 rounded w-16" /></td>
                                    </tr>
                                ))
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-foreground/40 font-mono text-sm">
                                        No items found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item) => {
                                    const hasDiff = (item.w3bPrice || 0) !== (item.tePrice || 0);
                                    const isZero = (item.w3bPrice || 0) === 0 && (item.tePrice || 0) === 0;
                                    
                                    return (
                                        <tr key={item.id} className={`group hover:bg-foreground/[0.02] transition-colors ${hasDiff && !isZero ? "bg-warning/[0.02]" : ""}`}>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-sm tracking-tight">{item.name}</div>
                                                <div className="text-[10px] font-mono text-foreground/30">ID: {item.id}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-0.5 rounded-full bg-foreground/5 border border-border text-[10px] font-bold text-foreground/60">
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-foreground/60">
                                                ${(item.marketPrice || 0).toLocaleString()}
                                            </td>
                                            <td className={`px-6 py-4 font-mono text-sm font-bold ${hasDiff && !isZero ? "text-warning" : "text-foreground"}`}>
                                                ${(item.w3bPrice || 0).toLocaleString()}
                                            </td>
                                            <td className={`px-6 py-4 font-mono text-sm font-bold ${hasDiff && !isZero ? "text-warning" : "text-foreground"}`}>
                                                ${(item.tePrice || 0).toLocaleString()}
                                            </td>
                                             <td className="px-6 py-4">
                                                <div className="flex items-center justify-between">
                                                    {isZero ? (
                                                        <div className="flex items-center gap-2 text-foreground/20 text-[10px] font-black uppercase italic">
                                                            <HugeiconsIcon icon={AlertCircleIcon} size={12} />
                                                            Inactive
                                                        </div>
                                                    ) : hasDiff ? (
                                                        <div className="flex items-center gap-2 text-warning text-[10px] font-black uppercase italic animate-pulse">
                                                            <HugeiconsIcon icon={AlertCircleIcon} size={12} />
                                                            Conflict
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-success text-[10px] font-black uppercase italic">
                                                            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} />
                                                            Synced
                                                        </div>
                                                    )}

                                                    {hasDiff && !isZero && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSyncToTE(item);
                                                            }}
                                                            disabled={isSyncing}
                                                            className="p-1.5 rounded-lg bg-warning/10 text-warning hover:bg-warning hover:text-white transition-all disabled:opacity-50"
                                                            title="Sync this item to TornExchange"
                                                        >
                                                            <HugeiconsIcon icon={RefreshIcon} size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="mt-6 bg-success/10 border border-success/20 p-4 rounded-2xl flex items-start gap-4 animate-in slide-in-from-bottom-2">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} className="text-success shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-success text-sm uppercase tracking-wide">Success</h3>
                        <p className="text-xs text-foreground/70 mt-1">{successMessage}</p>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="mt-6 bg-danger/10 border border-danger/20 p-4 rounded-2xl flex items-start gap-4">
                    <HugeiconsIcon icon={AlertCircleIcon} size={20} className="text-danger shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-danger text-sm uppercase tracking-wide">Error Fetching Data</h3>
                        <p className="text-xs text-foreground/70 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Empty Config Warning */}
            {!getTEApiKey() && (
                <div className="mt-6 bg-warning/10 border border-warning/20 p-4 rounded-2xl flex items-start gap-4">
                    <HugeiconsIcon icon={AlertCircleIcon} size={20} className="text-warning shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-warning text-sm uppercase tracking-wide">TornExchange Not Configured</h3>
                        <p className="text-xs text-foreground/70 mt-1">
                            Set your TornExchange API Key in the Account settings to enable price comparison.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
