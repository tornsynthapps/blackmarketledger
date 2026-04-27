"use client";

import { PublicPricelistCard } from "@/components/PublicPricelistCard";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
    ThumbsUpIcon, 
    ThumbsDownIcon, 
    Search01Icon,
    StarIcon
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type PricelistItem = {
    itemId: number;
    name: string;
    buyPrice: number;
    bulkThreshold?: number | null;
    bulkBuyPrice?: number | null;
};

type MarketplaceItem = {
    item_id: number;
    market_price: number | null;
};

type MarketplaceResponse = {
    items?: MarketplaceItem[];
};

type FavoriteEntry = {
    itemId: number | null;
    name: string;
};

type SortOption =
    | "favorite-offer-desc"
    | "favorite-offer-asc"
    | "favorite-name-asc"
    | "favorite-name-desc"
    | "favorite-delta-desc"
    | "favorite-delta-asc";

type DeltaFilter = "all" | "above" | "below" | "marketless";

const FAVORITES_STORAGE_KEY = "bml-public-pricelist-favorites";
const FAVORITE_GROUPS_STORAGE_KEY = "bml-public-pricelist-favorite-groups";
const PREFS_STORAGE_KEY = "bml-public-pricelist-prefs";

const normalizeName = (value: string) => value.trim().toLowerCase();

const parseJson = async <T,>(response: Response): Promise<T> => {
    if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
    }

    return response.json() as Promise<T>;
};

const parseFavoriteEntries = (raw: string | null): FavoriteEntry[] => {
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
        .map((entry) => {
            if (typeof entry === "number") {
                return { itemId: entry, name: "" };
            }

            if (entry && typeof entry === "object") {
                const itemId =
                    Number.isInteger(Number(entry.itemId)) && Number(entry.itemId) > 0
                        ? Number(entry.itemId)
                        : null;
                const name = typeof entry.name === "string" ? normalizeName(entry.name) : "";

                if (itemId || name) {
                    return { itemId, name };
                }
            }

            return null;
        })
        .filter((entry): entry is FavoriteEntry => Boolean(entry));
};

export default function PricelistClientPage() {
    const searchParams = useSearchParams();
    const xidParam = searchParams.get("XID");
    // Fall back to old userID param temporarily if needed, but prefer XID
    const userID = xidParam ?? searchParams.get("userID") ?? "";
    const numericUserId = Number(userID);
    const isValidUserId = Number.isInteger(numericUserId) && numericUserId > 0;

    const [pricelist, setPricelist] = useState<PricelistItem[]>([]);
    const [marketMap, setMarketMap] = useState<Map<number, number | null>>(new Map());
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [favoriteEntries, setFavoriteEntries] = useState<FavoriteEntry[]>([]);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [isDark, setIsDark] = useState(true);
    const [sortBy, setSortBy] = useState<SortOption>("favorite-delta-desc");
    const [deltaFilter, setDeltaFilter] = useState<DeltaFilter>("all");
    const [showBulkOnly, setShowBulkOnly] = useState(false);
    const [isGrouped, setIsGrouped] = useState(true);
    const [itemTypeMap, setItemTypeMap] = useState<Record<string, { type: string }>>({});
    const [favoriteGroups, setFavoriteGroups] = useState<Set<string>>(new Set());

    useEffect(() => {
        try {
            const savedItems = localStorage.getItem(FAVORITES_STORAGE_KEY);
            if (savedItems) {
                setFavoriteEntries(parseFavoriteEntries(savedItems));
            } else {
                setFavoriteEntries([{ itemId: 453, name: "ganesha sculpture" }]);
            }

            const savedGroups = localStorage.getItem(FAVORITE_GROUPS_STORAGE_KEY);
            if (savedGroups) {
                setFavoriteGroups(new Set(JSON.parse(savedGroups)));
            } else {
                setFavoriteGroups(new Set(["Flower", "Plushie"]));
            }

            const savedPrefs = localStorage.getItem(PREFS_STORAGE_KEY);
            if (savedPrefs) {
                const prefs = JSON.parse(savedPrefs);
                if (typeof prefs.showFavoritesOnly === "boolean") setShowFavoritesOnly(prefs.showFavoritesOnly);
                if (typeof prefs.isGrouped === "boolean") setIsGrouped(prefs.isGrouped);
                if (typeof prefs.showBulkOnly === "boolean") setShowBulkOnly(prefs.showBulkOnly);
                if (prefs.sortBy) setSortBy(prefs.sortBy);
                if (prefs.deltaFilter) setDeltaFilter(prefs.deltaFilter);
            }
        } catch (error) {
            console.error("Failed to load pricelist preferences", error);
        }
    }, []);

    useEffect(() => {
        const prefs = {
            showFavoritesOnly,
            isGrouped,
            showBulkOnly,
            sortBy,
            deltaFilter,
        };
        localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    }, [showFavoritesOnly, isGrouped, showBulkOnly, sortBy, deltaFilter]);

    useEffect(() => {
        setIsDark(
            document.documentElement.classList.contains("dark") ||
                !document.documentElement.classList.contains("light")
        );
        
        // Load item types for grouping
        fetch("/items.json")
            .then(res => res.json())
            .then(data => setItemTypeMap(data))
            .catch(err => console.error("Failed to load item types", err));
    }, []);

    const favoriteItemIds = useMemo(
        () =>
            new Set(
                favoriteEntries
                    .map((entry) => entry.itemId)
                    .filter((value): value is number => value !== null)
            ),
        [favoriteEntries]
    );
    const favoriteNames = useMemo(
        () => new Set(favoriteEntries.map((entry) => entry.name).filter(Boolean)),
        [favoriteEntries]
    );

    useEffect(() => {
        if (!userID) {
            setPricelist([]);
            setMarketMap(new Map());
            setErrorMessage(null);
            setIsLoading(false);
            return;
        }

        if (!isValidUserId) {
            setErrorMessage("Invalid user ID.");
            setPricelist([]);
            setMarketMap(new Map());
            setIsLoading(false);
            return;
        }

        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            setErrorMessage(null);

            try {
                const [pricelistData, marketplaceData] = await Promise.all([
                    fetch(`https://weav3r.dev/api/pricelist/${numericUserId}`, {
                        headers: { accept: "application/json" },
                    }).then((response) => parseJson<PricelistItem[]>(response)),
                    fetch("https://weav3r.dev/api/marketplace", {
                        headers: { accept: "application/json" },
                    }).then((response) => parseJson<MarketplaceResponse>(response)),
                ]);

                if (cancelled) return;

                setPricelist(Array.isArray(pricelistData) ? pricelistData : []);
                setMarketMap(
                    new Map(
                        (marketplaceData.items ?? []).map((item) => [
                            item.item_id,
                            item.market_price ?? null,
                        ])
                    )
                );
            } catch (error) {
                console.error("Failed to load public pricelist page", error);

                if (!cancelled) {
                    setErrorMessage("Failed to load pricelist data right now.");
                    setPricelist([]);
                    setMarketMap(new Map());
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [isValidUserId, numericUserId, userID]);

    const toggleFavorite = (itemId: number, name: string) => {
        const normalizedName = normalizeName(name);

        setFavoriteEntries((current) => {
            const exists = current.some(
                (entry) =>
                    entry.itemId === itemId || (!!entry.name && entry.name === normalizedName)
            );

            const next = exists
                ? current.filter(
                      (entry) =>
                          entry.itemId !== itemId && (!entry.name || entry.name !== normalizedName)
                  )
                : [...current, { itemId, name: normalizedName }];

            localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    };

    const toggleGroupFavorites = (groupName: string) => {
        setFavoriteGroups((current) => {
            const next = new Set(current);
            if (next.has(groupName)) {
                next.delete(groupName);
            } else {
                next.add(groupName);
            }
            localStorage.setItem(FAVORITE_GROUPS_STORAGE_KEY, JSON.stringify(Array.from(next)));
            return next;
        });
    };

    const toggleTheme = () => {
        const nextTheme = isDark ? "light" : "dark";
        const root = document.documentElement;

        root.classList.toggle("dark", nextTheme === "dark");
        root.classList.toggle("light", nextTheme === "light");
        localStorage.setItem("theme", nextTheme);
        setIsDark(nextTheme === "dark");
    };

    const enrichedItems = useMemo(
        () =>
            pricelist.map((item) => {
                const marketPrice = marketMap.get(item.itemId) ?? null;
                const deltaPercent =
                    marketPrice && marketPrice > 0
                        ? ((item.buyPrice - marketPrice) / marketPrice) * 100
                        : null;

                return {
                    ...item,
                    marketPrice,
                    deltaPercent,
                    isFavorite:
                        favoriteItemIds.has(item.itemId) ||
                        favoriteNames.has(normalizeName(item.name)),
                    hasBulk: Boolean(item.bulkThreshold || item.bulkBuyPrice),
                };
            }),
        [favoriteItemIds, favoriteNames, marketMap, pricelist]
    );

    const searchSummary = search.trim();

    const searchFilteredItems = useMemo(() => {
        return enrichedItems.filter((item) => {
            const query = searchSummary.toLowerCase();
            const itemType = itemTypeMap[String(item.itemId)]?.type || "Other";
            
            const matchesSearch =
                searchSummary.length === 0 ||
                item.name.toLowerCase().includes(query) ||
                String(item.itemId).includes(searchSummary) ||
                itemType.toLowerCase().includes(query);

            const matchesBulk = !showBulkOnly || item.hasBulk;

            return matchesSearch && matchesBulk;
        });
    }, [enrichedItems, searchSummary, showBulkOnly, itemTypeMap]);

    const visibleItems = useMemo(() => {
        const filtered = searchFilteredItems.filter((item) => {
            const itemType = itemTypeMap[String(item.itemId)]?.type || "Other";
            const isFromFavoriteGroup = favoriteGroups.has(itemType);
            
            // In favorites view, we show items from favorite groups or items marked favorite
            // In all view, we show everything that passed the search filter
            const matchesFavorites = !showFavoritesOnly || item.isFavorite || isFromFavoriteGroup;
            
            const matchesDelta =
                deltaFilter === "all" ||
                (deltaFilter === "above" && (item.deltaPercent ?? 0) > 0) ||
                (deltaFilter === "below" && (item.deltaPercent ?? 0) < 0) ||
                (deltaFilter === "marketless" && item.deltaPercent === null);

            return matchesFavorites && matchesDelta;
        });

        filtered.sort((left, right) => {
            if (left.isFavorite !== right.isFavorite) {
                return left.isFavorite ? -1 : 1;
            }

            if (sortBy === "favorite-offer-desc") {
                return right.buyPrice - left.buyPrice || left.name.localeCompare(right.name);
            }

            if (sortBy === "favorite-offer-asc") {
                return left.buyPrice - right.buyPrice || left.name.localeCompare(right.name);
            }

            if (sortBy === "favorite-name-asc") {
                return left.name.localeCompare(right.name);
            }

            if (sortBy === "favorite-name-desc") {
                return right.name.localeCompare(left.name);
            }

            const leftDelta = left.deltaPercent ?? Number.NEGATIVE_INFINITY;
            const rightDelta = right.deltaPercent ?? Number.NEGATIVE_INFINITY;

            if (sortBy === "favorite-delta-desc") {
                return rightDelta - leftDelta || right.buyPrice - left.buyPrice;
            }

            return leftDelta - rightDelta || right.buyPrice - left.buyPrice;
        });

        return filtered;
    }, [deltaFilter, searchFilteredItems, showFavoritesOnly, sortBy, favoriteGroups, itemTypeMap]);

    const totalCount = searchFilteredItems.length;
    
    const extraCount = useMemo(
        () => searchFilteredItems.filter((item) => (item.deltaPercent ?? 0) > 0).length,
        [searchFilteredItems]
    );
    const lowerCount = useMemo(
        () => searchFilteredItems.filter((item) => (item.deltaPercent ?? 0) < 0).length,
        [searchFilteredItems]
    );
    const pageFavoriteCount = useMemo(
        () => searchFilteredItems.filter((item) => item.isFavorite).length,
        [searchFilteredItems]
    );

    const groupedItems = useMemo(() => {
        if (!isGrouped) return null;
        const groups: Record<string, typeof visibleItems> = {};
        
        for (const item of visibleItems) {
            let type = itemTypeMap[String(item.itemId)]?.type || "Other";
            
            // Overrides for museum sets
            if (item.name.toLowerCase() === "flower set") type = "Flower";
            if (item.name.toLowerCase() === "plushie set") type = "Plushie";
            
            // If in favorites view, and group isn't favorited but item is, move to special group
            let groupKey = type;
            if (showFavoritesOnly && !favoriteGroups.has(type) && item.isFavorite) {
                groupKey = "Individual Favorites";
            }
            
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(item);
        }
        
        // Sort groups: "Individual Favorites" first, then pinned groups, then alphabetical others
        return Object.entries(groups).sort(([a], [b]) => {
            if (a === "Individual Favorites") return -1;
            if (b === "Individual Favorites") return 1;
            
            const aFav = favoriteGroups.has(a);
            const bFav = favoriteGroups.has(b);
            if (aFav !== bFav) return aFav ? -1 : 1;
            return a.localeCompare(b);
        });
    }, [isGrouped, visibleItems, itemTypeMap, favoriteGroups, showFavoritesOnly]);

    return (
        <div className="pb-12">
            <section className="mb-4 border border-border bg-panel/70 overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center">
                    <Link 
                        href="/"
                        className="group bg-panel/40 px-4 py-3 border-b lg:border-b-0 lg:border-r border-border min-w-[240px] transition-colors hover:bg-panel-elevated/60"
                    >
                        <p className="font-vt323 text-3xl text-foreground leading-none">BlackMarket Ledger</p>
                        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em]">
                            <p className="text-muted group-hover:hidden">
                                Public Pricelist Viewer
                            </p>
                            <p className="text-primary hidden group-hover:block animate-in fade-in slide-in-from-left-1 duration-200">
                                Click to View Ledger
                            </p>
                        </div>
                    </Link>

                    <div className="flex-1 px-4 py-3 bg-panel/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted whitespace-nowrap">Source:</span>
                            <span className="text-[11px] uppercase tracking-[0.05em] text-foreground/60 font-medium">
                                TornW3B API & Intelligence
                            </span>
                        </div>

                        <div className="group relative flex items-center gap-3 sm:border-l border-border sm:pl-4 transition-colors cursor-help">
                            <div className="flex items-center gap-4 transition-opacity duration-200 group-hover:opacity-0">
                                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted whitespace-nowrap">Forum Engagement:</span>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 text-success/70">
                                        <HugeiconsIcon icon={ThumbsUpIcon} size={12} strokeWidth={2.5} />
                                        <span className="text-[11px] font-bold font-mono">0</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-danger/70">
                                        <HugeiconsIcon icon={ThumbsDownIcon} size={12} strokeWidth={2.5} />
                                        <span className="text-[11px] font-bold font-mono">0</span>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute inset-0 hidden group-hover:flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
                                <span className="text-[10px] uppercase tracking-[0.15em] text-primary font-bold">
                                    Currently Unavailable
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-panel/40 px-4 py-3 border-t lg:border-t-0 lg:border-l border-border">
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="w-full lg:w-auto border border-border-strong px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/70 transition-colors hover:border-primary hover:text-primary bg-panel"
                        >
                            {isDark ? "Light Theme" : "Dark Theme"}
                        </button>
                    </div>
                </div>
            </section>

            <section className="border border-border bg-panel/90 shadow-sm">
                <div className="border-b border-border bg-panel-elevated/20 px-4 py-3">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="bg-foreground text-background px-3 py-1.5 text-[11px] font-bold font-mono tracking-tight">
                                {userID ? `USER:${userID}` : "NO_USER"}
                            </div>
                            {userID ? (
                                <>
                                    <Link
                                        href={`https://www.torn.com/profiles.php?XID=${userID}`}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        className="border border-border-strong px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.05em] text-foreground/70 transition-colors hover:border-primary hover:text-primary bg-panel"
                                    >
                                        Profile
                                    </Link>
                                    <Link
                                        href={`https://www.torn.com/trade.php#step=start&userID=${userID}`}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        className="border border-success/30 bg-success/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.05em] text-success transition-colors hover:border-success/60 hover:bg-success/15"
                                    >
                                        Trade
                                    </Link>
                                </>
                            ) : null}
                            <div className="h-4 w-px bg-border-strong mx-1 invisible lg:visible" />
                            <div className="flex bg-panel border border-border-strong p-0.5">
                                <button
                                    type="button"
                                    onClick={() => setShowFavoritesOnly(false)}
                                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-[0.05em] transition-all ${
                                        !showFavoritesOnly ? "bg-foreground text-background" : "text-muted hover:text-foreground"
                                    }`}
                                >
                                    All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowFavoritesOnly(true)}
                                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-[0.05em] transition-all ${
                                        showFavoritesOnly ? "bg-warning text-black" : "text-muted hover:text-warning"
                                    }`}
                                >
                                    Favorites
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsGrouped((current) => !current)}
                                aria-pressed={isGrouped}
                                className={`flex items-center gap-2 border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.05em] transition-colors ${
                                    isGrouped
                                        ? "border-info/40 bg-info/10 text-info"
                                        : "border-border-strong text-foreground/70 bg-panel hover:text-primary"
                                }`}
                            >
                                <span className={isGrouped ? "opacity-100" : "opacity-40"}>Grouped</span>
                            </button>
                        </div>

                        <div className="relative w-full max-w-sm lg:max-w-xs">
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search..."
                                className="w-full border border-border-strong bg-background/50 px-3 py-1.5 pl-8 font-mono text-[11px] text-foreground outline-none transition-colors placeholder:text-muted/40 focus:border-primary focus:bg-background"
                            />
                            <HugeiconsIcon icon={Search01Icon} size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted/40" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto] border-b border-border">
                    <div className="flex bg-panel/30">
                        <button 
                            type="button"
                            onClick={() => {
                                setDeltaFilter("all");
                                setShowFavoritesOnly(false);
                            }}
                            className={`flex-1 group text-left px-4 py-2.5 border-r border-border transition-all hover:bg-panel-elevated ${deltaFilter === "all" && !showFavoritesOnly ? "bg-panel-elevated/40" : ""}`}
                        >
                            <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-muted group-hover:text-primary">Items</p>
                            <p className="mt-0.5 text-xl font-medium tracking-tight text-foreground">{isLoading ? "..." : totalCount}</p>
                        </button>
                        <button 
                            type="button"
                            onClick={() => {
                                setDeltaFilter("all");
                                setShowFavoritesOnly(true);
                            }}
                            className={`flex-1 group text-left px-4 py-2.5 border-r border-border transition-all hover:bg-panel-elevated ${showFavoritesOnly ? "bg-warning/5" : ""}`}
                        >
                            <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-muted group-hover:text-warning text-warning/70">Favorites</p>
                            <p className="mt-0.5 text-xl font-medium tracking-tight text-warning">{isLoading ? "..." : pageFavoriteCount}</p>
                        </button>
                        <button 
                            type="button"
                            onClick={() => {
                                setDeltaFilter("above");
                                setShowFavoritesOnly(false);
                            }}
                            className={`flex-1 group text-left px-4 py-2.5 border-r border-border transition-all hover:bg-panel-elevated ${deltaFilter === "above" && !showFavoritesOnly ? "bg-success/5" : ""}`}
                        >
                            <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-muted group-hover:text-success text-success/70">Above Market</p>
                            <p className="mt-0.5 text-xl font-medium tracking-tight text-success">{isLoading ? "..." : extraCount}</p>
                        </button>
                        <button 
                            type="button"
                            onClick={() => {
                                setDeltaFilter("below");
                                setShowFavoritesOnly(false);
                            }}
                            className={`flex-1 group text-left px-4 py-2.5 transition-all hover:bg-panel-elevated ${deltaFilter === "below" && !showFavoritesOnly ? "bg-danger/5" : ""}`}
                        >
                            <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-muted group-hover:text-danger text-danger/70">Below Market</p>
                            <p className="mt-0.5 text-xl font-medium tracking-tight text-danger">{isLoading ? "..." : lowerCount}</p>
                        </button>
                    </div>

                    <div className="bg-panel/40 border-t lg:border-t-0 lg:border-l border-border px-4 py-2.5 flex items-center gap-2">
                        <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-muted">Sort:</span>
                        <select
                            value={sortBy}
                            onChange={(event) => setSortBy(event.target.value as SortOption)}
                            className="bg-transparent font-mono text-[10px] font-bold text-foreground/80 outline-none focus:text-primary transition-colors pr-4 uppercase tracking-[0.05em]"
                        >
                            <option value="favorite-offer-desc">Value (H-L)</option>
                            <option value="favorite-offer-asc">Value (L-H)</option>
                            <option value="favorite-name-asc">Name (A-Z)</option>
                            <option value="favorite-name-desc">Name (Z-A)</option>
                            <option value="favorite-delta-desc">Delta (H-L)</option>
                            <option value="favorite-delta-asc">Delta (L-H)</option>
                        </select>
                    </div>
                </div>
            </section>

                {!isLoading &&
                (searchSummary || showFavoritesOnly || showBulkOnly || deltaFilter !== "all") ? (
                    <div className="border-t border-border px-5 py-3 font-mono text-xs uppercase tracking-[0.22em] text-muted">
                        {searchSummary ? `Search: ${searchSummary}` : null}
                        {searchSummary && showFavoritesOnly ? " / " : null}
                        {showFavoritesOnly ? "Favorites only" : null}
                        {(searchSummary || showFavoritesOnly) &&
                        (showBulkOnly || deltaFilter !== "all")
                            ? " / "
                            : null}
                        {showBulkOnly ? "Bulk only" : null}
                        {showBulkOnly && deltaFilter !== "all" ? " / " : null}
                        {deltaFilter !== "all"
                            ? `Delta: ${
                                  deltaFilter === "above"
                                      ? "above"
                                      : deltaFilter === "below"
                                        ? "below"
                                        : "no market"
                              }`
                            : null}
                    </div>
                ) : null}


            {!userID ? (
                <section className="mt-6 border border-border bg-panel px-5 py-6">
                    <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
                        Open with `?XID=3165209`.
                    </p>
                </section>
            ) : null}

            {errorMessage ? (
                <section className="mt-6 border border-danger/40 bg-danger/10 px-5 py-4">
                    <p className="font-mono text-xs uppercase tracking-[0.25em] text-danger">
                        {errorMessage}
                    </p>
                </section>
            ) : null}

            {isLoading ? (
                <section className="mt-6 border border-border bg-panel px-5 py-6">
                    <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
                        Loading pricelist...
                    </p>
                </section>
            ) : null}

            {!errorMessage && !isLoading && visibleItems.length > 0 ? (
                <section className="mt-6 flex flex-col gap-8">
                    {isGrouped && groupedItems ? (
                        groupedItems.map(([type, items]) => (
                            <div key={type} className="flex flex-col gap-3">
                                <div className="flex items-center gap-4 px-2">
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
                                    <h3 className="text-xl font-vt323 tracking-widest text-primary">
                                        {type}
                                    </h3>
                                    <div className="h-px flex-1 bg-border-strong" />
                                    <span className="font-mono text-[10px] text-muted uppercase">
                                        {items.length} Items
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 gap-px bg-border border border-border md:grid-cols-2 xl:grid-cols-3 overflow-hidden">
                                    {items.map((item) => (
                                        <div key={`${item.itemId}-${item.name}`} className="bg-panel">
                                            <PublicPricelistCard
                                                itemId={item.itemId}
                                                name={item.name}
                                                buyPrice={item.buyPrice}
                                                marketPrice={item.marketPrice}
                                                bulkBuyPrice={item.bulkBuyPrice ?? null}
                                                bulkThreshold={item.bulkThreshold ?? null}
                                                isFavorite={item.isFavorite}
                                                onToggleFavorite={toggleFavorite}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="grid grid-cols-1 gap-px bg-border border border-border md:grid-cols-2 xl:grid-cols-3 overflow-hidden">
                            {visibleItems.map((item) => (
                                <div key={`${item.itemId}-${item.name}`} className="bg-panel">
                                    <PublicPricelistCard
                                        itemId={item.itemId}
                                        name={item.name}
                                        buyPrice={item.buyPrice}
                                        marketPrice={item.marketPrice}
                                        bulkBuyPrice={item.bulkBuyPrice ?? null}
                                        bulkThreshold={item.bulkThreshold ?? null}
                                        isFavorite={item.isFavorite}
                                        onToggleFavorite={toggleFavorite}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            ) : null}

            {!errorMessage && !isLoading && userID && visibleItems.length === 0 ? (
                <section className="mt-6 border border-border bg-panel px-5 py-6">
                    <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
                        {searchSummary || showFavoritesOnly
                            ? "No matching items."
                            : `No pricelist items found for user #${userID}.`}
                    </p>
                </section>
            ) : null}
        </div>
    );
}
