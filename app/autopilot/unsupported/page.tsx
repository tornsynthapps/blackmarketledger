"use client";

import { useState, useMemo, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    FileSearchIcon,
    Upload01Icon,
    Search01Icon,
    Alert01Icon,
    ArrowLeft01Icon,
    Cancel01Icon,
    FilterIcon,
    Tick01Icon,
    InformationCircleIcon,
    Add01Icon
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { FUTURE_WORK } from "@/lib/domain/TornLogService";
import { defaultLogRegistry } from "@/lib/domain/LogParserRegistry";
import { initializeDefaultHandlers } from "@/lib/domain/LogHandlers";

interface UnsupportedLog {
    id: string;
    timestamp: number;
    category: string;
    typeId: number;
    title: string;
    data: Record<string, any>;
    params: Record<string, any>;
    logCategory?: "unsupported" | "future_work";
}

export default function UnsupportedLogsVisualizer() {
    const [logs, setLogs] = useState<UnsupportedLog[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTypeIds, setSelectedTypeIds] = useState<number[]>([]);
    const [showTypeFilter, setShowTypeFilter] = useState(false);
    const [hideHandled, setHideHandled] = useState(true);
    const [logCategoryFilter, setLogCategoryFilter] = useState<"all" | "unsupported" | "future_work">("all");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        initializeDefaultHandlers();
    }, []);

    const availableTypeIds = useMemo(() => {
        const types = Array.from(new Set(logs.map(log => log.typeId)));
        return types.sort((a, b) => a - b);
    }, [logs]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;

        initializeDefaultHandlers();
        const newParsedLogs: UnsupportedLog[] = [];
        const errors: string[] = [];

        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            try {
                const text = await file.text();
                const json = JSON.parse(text);
                const items = Array.isArray(json) ? json : [json];
                items.forEach((log: any) => {
                    if (log && (log.id !== undefined || log.typeId !== undefined)) {
                        newParsedLogs.push({
                            ...log,
                            id: String(log.id ?? Math.random().toString()),
                            typeId: Number(log.typeId),
                            logCategory: log.logCategory || (FUTURE_WORK.includes(Number(log.typeId)) ? "future_work" : "unsupported"),
                        });
                    }
                });
            } catch (err: any) {
                errors.push(`${file.name}: ${err.message || "Failed to parse JSON"}`);
            }
        }

        if (newParsedLogs.length > 0) {
            setLogs((prev) => {
                const existingIds = new Set(prev.map((l) => l.id));
                const uniqueNew = newParsedLogs.filter((l) => !existingIds.has(l.id));
                const merged = [...prev, ...uniqueNew];
                const types = Array.from(new Set(merged.map((l) => l.typeId))).sort((a, b) => a - b);
                setSelectedTypeIds(types);
                return merged;
            });
            setError(errors.length > 0 ? errors.join("; ") : null);
        } else if (errors.length > 0) {
            setError(errors.join("; "));
        }
        e.target.value = "";
    };

    const toggleTypeId = (typeId: number) => {
        setSelectedTypeIds(prev => 
            prev.includes(typeId) 
                ? prev.filter(id => id !== typeId)
                : [...prev, typeId]
        );
    };

    const categoryCounts = useMemo(() => {
        let unsupported = 0;
        let futureWork = 0;
        logs.forEach(l => {
            const cat = l.logCategory || (FUTURE_WORK.includes(l.typeId) ? "future_work" : "unsupported");
            if (cat === "future_work") futureWork++;
            else unsupported++;
        });
        return { total: logs.length, unsupported, futureWork };
    }, [logs]);

    const filteredLogs = useMemo(() => {
        let result = logs;

        // Filter by log category (all / unsupported / future_work)
        if (logCategoryFilter !== "all") {
            result = result.filter(log => {
                const cat = log.logCategory || (FUTURE_WORK.includes(log.typeId) ? "future_work" : "unsupported");
                return cat === logCategoryFilter;
            });
        }

        // Hide logs that have registered log handlers if enabled
        if (hideHandled) {
            result = result.filter(log => defaultLogRegistry.getHandler(log.typeId) === undefined);
        }

        // Type ID filtering
        if (selectedTypeIds.length < availableTypeIds.length) {
            result = result.filter(log => selectedTypeIds.includes(log.typeId));
        }

        // Search filtering
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(log => 
                log.id.toLowerCase().includes(query) ||
                log.typeId.toString().includes(query) ||
                log.title.toLowerCase().includes(query) ||
                log.category.toLowerCase().includes(query) ||
                JSON.stringify({ ...log.data, ...log.params }).toLowerCase().includes(query)
            );
        }

        return result;
    }, [logs, logCategoryFilter, searchQuery, selectedTypeIds, availableTypeIds, hideHandled]);

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <Link
                    href="/autopilot"
                    className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground transition-colors"
                >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={16} /> Back to Auto-Pilot
                </Link>
            </div>

            <PageHeader
                title="Log Visualizer"
                icon={FileSearchIcon}
                description="Upload and analyze unsupported logs to help with development."
            />

            {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-3xl bg-panel/20 space-y-4 text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <HugeiconsIcon icon={Upload01Icon} size={32} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold">Upload Unsupported Logs</h3>
                        <p className="text-muted text-sm max-w-sm">
                            Select one or more .json files downloaded from Auto-Pilot to visualize and filter contents.
                        </p>
                    </div>
                    <input
                        type="file"
                        accept=".json"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        id="log-upload"
                    />
                    <label
                        htmlFor="log-upload"
                        className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl cursor-pointer hover:opacity-90 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <HugeiconsIcon icon={Upload01Icon} size={18} />
                        Select File(s)
                    </label>
                    {error && (
                        <div className="flex items-center gap-2 text-danger text-sm font-bold bg-danger/10 px-4 py-2 rounded-lg">
                            <HugeiconsIcon icon={Alert01Icon} size={16} />
                            {error}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Log Category Filter Tabs & Add Files Button */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2 p-1.5 bg-panel border-2 border-border rounded-2xl w-fit">
                            <button
                                onClick={() => setLogCategoryFilter("all")}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
                                    logCategoryFilter === "all"
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted hover:text-foreground hover:bg-foreground/5"
                                }`}
                            >
                                All Logs ({categoryCounts.total})
                            </button>
                            <button
                                onClick={() => setLogCategoryFilter("unsupported")}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
                                    logCategoryFilter === "unsupported"
                                        ? "bg-orange-500 text-white shadow-sm"
                                        : "text-muted hover:text-foreground hover:bg-foreground/5"
                                }`}
                            >
                                Unsupported ({categoryCounts.unsupported})
                            </button>
                            <button
                                onClick={() => setLogCategoryFilter("future_work")}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
                                    logCategoryFilter === "future_work"
                                        ? "bg-purple-600 text-white shadow-sm"
                                        : "text-muted hover:text-foreground hover:bg-foreground/5"
                                }`}
                            >
                                Future Work ({categoryCounts.futureWork})
                            </button>
                        </div>

                        <div>
                            <input
                                type="file"
                                accept=".json"
                                multiple
                                onChange={handleFileUpload}
                                className="hidden"
                                id="log-upload-more"
                            />
                            <label
                                htmlFor="log-upload-more"
                                className="px-4 py-2 bg-panel border-2 border-border font-bold text-xs rounded-xl cursor-pointer hover:bg-foreground/5 transition-all flex items-center gap-2"
                            >
                                <HugeiconsIcon icon={Add01Icon} size={16} />
                                Add File(s)
                            </label>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <HugeiconsIcon
                                icon={Search01Icon}
                                size={18}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                            />
                            <input
                                type="text"
                                placeholder="Filter by ID, Type, Title, or Data..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-panel border-2 border-border rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-primary transition-all"
                            />
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setShowTypeFilter(!showTypeFilter)}
                                className={`h-full flex items-center gap-2 px-6 py-3 rounded-2xl border-2 transition-all text-sm font-bold ${
                                    selectedTypeIds.length < availableTypeIds.length 
                                        ? "bg-primary border-primary text-primary-foreground" 
                                        : "bg-panel border-border hover:bg-foreground/5"
                                }`}
                            >
                                <HugeiconsIcon icon={FilterIcon} size={16} />
                                Types ({selectedTypeIds.length})
                            </button>

                            {showTypeFilter && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-40" 
                                        onClick={() => setShowTypeFilter(false)} 
                                    />
                                    <div className="absolute top-full right-0 mt-2 w-64 max-h-96 bg-panel border-2 border-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                                        <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Filter Type IDs</span>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setSelectedTypeIds(availableTypeIds)}
                                                    className="text-[9px] font-bold text-primary hover:underline"
                                                >
                                                    All
                                                </button>
                                                <button 
                                                    onClick={() => setSelectedTypeIds([])}
                                                    className="text-[9px] font-bold text-danger hover:underline"
                                                >
                                                    None
                                                </button>
                                            </div>
                                        </div>
                                        <div className="overflow-y-auto p-1">
                                            {availableTypeIds.map(typeId => (
                                                <button
                                                    key={typeId}
                                                    onClick={() => toggleTypeId(typeId)}
                                                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono rounded-lg hover:bg-foreground/5 transition-colors"
                                                >
                                                    <span>Type {typeId}</span>
                                                    {selectedTypeIds.includes(typeId) && (
                                                        <HugeiconsIcon icon={Tick01Icon} size={14} className="text-primary" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => setHideHandled(!hideHandled)}
                            className={`h-full flex items-center gap-2 px-6 py-3 rounded-2xl border-2 transition-all text-sm font-bold ${
                                hideHandled 
                                    ? "bg-warning border-warning text-warning-foreground" 
                                    : "bg-panel border-border hover:bg-foreground/5"
                            }`}
                        >
                            <HugeiconsIcon icon={hideHandled ? Tick01Icon : Cancel01Icon} size={16} />
                            Hide Handled
                        </button>

                        <button
                            onClick={() => { setLogs([]); setSearchQuery(""); setSelectedTypeIds([]); setHideHandled(true); setLogCategoryFilter("all"); setError(null); }}
                            className="px-6 py-3 rounded-2xl border-2 border-border hover:bg-foreground/5 transition-all text-sm font-bold"
                        >
                            <HugeiconsIcon icon={Cancel01Icon} size={16} className="inline mr-2" />
                            Reset
                        </button>
                    </div>

                    <div className="bg-panel border-2 border-border rounded-3xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted/30 border-b-2 border-border text-[10px] font-black uppercase tracking-widest text-muted">
                                    <tr>
                                        <th className="px-6 py-4">Timestamp / ID</th>
                                        <th className="px-6 py-4">Classification / Type</th>
                                        <th className="px-6 py-4">Title</th>
                                        <th className="px-6 py-4">Data Preview</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-border">
                                    {filteredLogs.length > 0 ? (
                                        filteredLogs.map((log) => {
                                            const isFuture = (log.logCategory || (FUTURE_WORK.includes(log.typeId) ? "future_work" : "unsupported")) === "future_work";
                                            const hasHandler = defaultLogRegistry.getHandler(log.typeId) !== undefined;
                                            return (
                                                <tr key={log.id} className="hover:bg-foreground/[0.02] transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="font-mono text-xs font-bold">{new Date(log.timestamp * 1000).toLocaleString()}</div>
                                                        <div className="text-[10px] text-muted font-mono mt-1 group-hover:text-primary transition-colors">ID: {log.id}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-1 mb-1">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                                isFuture
                                                                    ? "bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400"
                                                                    : "bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400"
                                                            }`}>
                                                                {isFuture ? "Future Work" : "Unsupported"}
                                                            </span>
                                                            {hasHandler && (
                                                                <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                                                                    Handled
                                                                </span>
                                                            )}
                                                            {log.category && (
                                                                <span className="px-2 py-0.5 rounded bg-foreground/5 text-[10px] font-bold uppercase tracking-wider text-muted">
                                                                    {log.category}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="font-bold font-mono text-xs">Type: {log.typeId}</div>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-foreground/80 leading-snug">
                                                        {log.title}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="max-w-[300px]">
                                                            <pre className="text-[10px] font-mono bg-background/50 p-2 rounded border border-border overflow-hidden text-ellipsis whitespace-nowrap opacity-60 hover:opacity-100 hover:whitespace-normal hover:overflow-visible transition-all cursor-help">
                                                                {JSON.stringify({ ...log.data, ...log.params }, null, 2)}
                                                            </pre>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-muted italic">
                                                No logs match your current filter.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 p-4 rounded-2xl bg-info/5 border border-info/20 text-info text-xs">
                        <HugeiconsIcon icon={InformationCircleIcon} size={16} />
                        <p>
                            Showing {filteredLogs.length} of {logs.length} logs. Hover over the data preview to see the full payload.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
