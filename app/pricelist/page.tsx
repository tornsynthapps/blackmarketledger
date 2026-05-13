"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
    ArrowRight01Icon,
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

function PricelistComparisonContent() {
    const searchParams = useSearchParams();
    const legacyUserID = searchParams.get("userID");

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

    if (legacyUserID) {
        return (
            <div className="min-h-screen bg-background text-foreground p-6 max-w-2xl mx-auto flex flex-col items-center justify-center">
                <div className="bg-panel p-8 rounded-2xl border border-border shadow-xl text-center flex flex-col items-center max-w-lg w-full">
                    <HugeiconsIcon icon={ArrowRight01Icon} size={48} className="text-primary mb-4" />
                    <h1 className="text-2xl font-black uppercase font-departure tracking-wide mb-2">Page Moved</h1>
                    <p className="text-muted text-sm mb-6">
                        The public pricelist viewer has been moved to <strong>/pricelist/view</strong>, and now uses XID.
                    </p>
                    <Link
                        href={`/pricelist/view/?XID=${legacyUserID}`}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Go to new Pricelist
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <div className="bg-panel p-8 rounded-2xl border border-border shadow-xl text-center flex flex-col items-center max-w-lg w-full">
                <HugeiconsIcon icon={AlertCircleIcon} size={48} className="text-warning mb-4" />
                <h1 className="text-3xl font-black uppercase font-departure tracking-wide mb-2">Under Construction</h1>
                <p className="text-muted text-sm mb-6">
                    The Pricelist manage functionality is currently being rebuilt. Check back soon.
                </p>
                <Link
                    href="/"
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    Return to Dashboard
                </Link>
            </div>
        </div>
    );
}

export default function PricelistComparisonPage() {
    return (
        <Suspense fallback={null}>
            <PricelistComparisonContent />
        </Suspense>
    );
}
