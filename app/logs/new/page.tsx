"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { ItemLogService } from "@/lib/domain/ItemLogService";
import { ItemLog } from "@/lib/objects/ItemLog";
import { PageHeader } from "@/components/PageHeader";
import { ReceiptTextIcon } from "@hugeicons/core-free-icons";
import { ActivityLogTable } from "@/components/ActivityLogTable";
import { useSettings } from "@/lib/old/useSettings";

/**
 * Page to display item logs using the new domain service.
 * Provides a clean table view of all activity tracked in the new system.
 * Respects the "Compact Table" setting.
 */
export default function NewLogsPage() {
    const { settings } = useSettings();
    const [logs, setLogs] = useState<ItemLog[]>([]);
    const [itemMap, setItemMap] = useState<Record<number, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [totalFilteredCount, setTotalFilteredCount] = useState(0);
    const [refreshDate, setRefreshDate] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const logsPerPage = 50;

    const service = useMemo(() => new ItemLogService(), []);

    // Load item names only once
    useEffect(() => {
        const loadItems = async () => {
            try {
                const res = await fetch("/items.json");
                const items = await res.json();
                const map: Record<number, string> = {};
                Object.entries(items).forEach(([id, item]: [string, any]) => {
                    map[parseInt(id)] = item.name;
                });
                setItemMap(map);
            } catch (error) {
                console.error("Failed to load items:", error);
            }
        };
        void loadItems();
    }, []);

    const loadPageData = useCallback(async () => {
        setIsLoading(true);
        try {
            const offset = (currentPage - 1) * logsPerPage;
            const startTs = startDate ? new Date(startDate).getTime() : null;
            const endTs = endDate ? new Date(endDate).getTime() : null;
            
            // Run count and fetch in parallel
            const [count, fetchedLogs] = await Promise.all([
                service.countLogs(categoryFilter, searchQuery, itemMap, startTs, endTs),
                service.getPaginatedLogs(offset, logsPerPage, categoryFilter, searchQuery, itemMap, startTs, endTs)
            ]);
            
            setTotalFilteredCount(count);
            setLogs(fetchedLogs);
        } catch (error) {
            console.error("Failed to load logs:", error);
        } finally {
            setIsLoading(false);
        }
    }, [service, currentPage, categoryFilter, searchQuery, itemMap, startDate, endDate]);

    useEffect(() => {
        // Only load if itemMap is ready (to ensure search works correctly)
        if (Object.keys(itemMap).length > 0) {
            void loadPageData();
        }
    }, [loadPageData, itemMap]);

    const totalPages = Math.ceil(totalFilteredCount / logsPerPage);

    // Reset to page 1 when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, categoryFilter, startDate, endDate]);

    const handleRefreshCostBasis = async () => {
        if (!refreshDate) {
            alert("Please select a date first.");
            return;
        }
        const timestamp = new Date(refreshDate).getTime();
        setIsRefreshing(true);
        try {
            await service.updateCostBasis(timestamp);
            alert("Cost basis recalculation triggered successfully.");
            await loadPageData();
        } catch (error) {
            console.error("Refresh failed:", error);
            alert("Recalculation failed. See console for details.");
        } finally {
            setIsRefreshing(false);
        }
    };

    const categories: { id: string; label: string }[] = [
        { id: "all", label: "ALL_CATEGORIES" },
        { id: "normal", label: "NORMAL" },
        { id: "abroad", label: "ABROAD" },
        { id: "museum", label: "MUSEUM" },
        { id: "city-finds", label: "CITY FINDS" },
        { id: "city-shop", label: "CITY SHOP" },
        { id: "crimes", label: "CRIMES" },
        { id: "dump", label: "DUMP" },
        { id: "skipped", label: "SKIPPED" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-20">
            {/* HEADER */}
            <PageHeader 
                title="Activity Log" 
                icon={ReceiptTextIcon} 
            >
                <div className="flex flex-col items-end">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-muted">Filtered_Records</div>
                    <div className="text-xl font-black tabular-nums">{totalFilteredCount.toLocaleString()}</div>
                </div>
            </PageHeader>

            {/* CONTROLS & FILTERS */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* SEARCH & FILTERS */}
                <div className="lg:col-span-3 bg-panel/20 border-2 border-border-strong p-4 space-y-4 shadow-xl">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted mb-2">
                        <span className="w-2 h-2 bg-info animate-pulse" />
                        Log_Filters
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-grow w-full">
                                <label className="text-[8px] font-black uppercase tracking-widest text-muted block mb-1">Search_Item</label>
                                <input 
                                    type="text"
                                    placeholder="TYPE_ITEM_NAME..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-background border-b-2 border-border-strong px-3 py-2 text-[10px] font-mono uppercase focus:border-foreground outline-none transition-all"
                                />
                            </div>
                            <div className="md:w-64 w-full">
                                <label className="text-[8px] font-black uppercase tracking-widest text-muted block mb-1">Category_Filter</label>
                                <select 
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="w-full bg-background border-b-2 border-border-strong px-3 py-2 text-[10px] font-mono uppercase focus:border-foreground outline-none transition-all cursor-pointer"
                                >
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-grow w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-muted block mb-1">Start_Date</label>
                                    <input 
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full bg-background border-b-2 border-border-strong px-3 py-2 text-[10px] font-mono uppercase focus:border-foreground outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-muted block mb-1">End_Date</label>
                                    <input 
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full bg-background border-b-2 border-border-strong px-3 py-2 text-[10px] font-mono uppercase focus:border-foreground outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="md:w-32 w-full bg-background border-b-2 border-border-strong px-3 py-2">
                                <label className="text-[8px] font-black uppercase tracking-widest text-muted block mb-1">Results</label>
                                <div className="text-[10px] font-mono font-black">{totalFilteredCount.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* COST BASIS CONTROL */}
                <div className="bg-panel/20 border-2 border-border-strong p-4 space-y-4 shadow-xl">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted mb-2">
                        <span className="w-2 h-2 bg-warning animate-pulse" />
                        Engine_Control
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label className="text-[8px] font-black uppercase tracking-widest text-muted block mb-1">Refresh_From_Origin</label>
                            <input 
                                type="datetime-local"
                                value={refreshDate}
                                onChange={(e) => setRefreshDate(e.target.value)}
                                className="w-full bg-background border-b-2 border-border-strong px-3 py-2 text-[10px] font-mono uppercase focus:border-foreground outline-none transition-all"
                            />
                        </div>
                        <button 
                            onClick={handleRefreshCostBasis}
                            disabled={isRefreshing || !refreshDate}
                            className="w-full py-2 bg-foreground text-background text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 disabled:grayscale"
                        >
                            {isRefreshing ? "Recalculating..." : "Recalculate_Basis"}
                        </button>
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <div className="space-y-4">
                <ActivityLogTable 
                    logs={logs} 
                    itemMap={itemMap} 
                    isLoading={isLoading} 
                />

                {!isLoading && totalFilteredCount > logsPerPage && (
                    <div className="flex items-center justify-between pt-4 border-t border-border-strong">
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted">
                            Showing {(currentPage - 1) * logsPerPage + 1} to {Math.min(currentPage * logsPerPage, totalFilteredCount)} of {totalFilteredCount}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className="px-3 py-2 border-2 border-foreground text-[10px] font-black uppercase tracking-widest hover:bg-foreground hover:text-background transition-all disabled:opacity-20 disabled:grayscale"
                            >
                                First
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-2 border-2 border-foreground text-[10px] font-black uppercase tracking-widest hover:bg-foreground hover:text-background transition-all disabled:opacity-20 disabled:grayscale"
                            >
                                Prev
                            </button>
                            <div className="px-4 py-2 bg-panel/30 border border-border-strong text-[10px] font-mono flex items-center">
                                PAGE {currentPage} / {totalPages}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-2 border-2 border-foreground text-[10px] font-black uppercase tracking-widest hover:bg-foreground hover:text-background transition-all disabled:opacity-20 disabled:grayscale"
                            >
                                Next
                            </button>
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-2 border-2 border-foreground text-[10px] font-black uppercase tracking-widest hover:bg-foreground hover:text-background transition-all disabled:opacity-20 disabled:grayscale"
                            >
                                Last
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
