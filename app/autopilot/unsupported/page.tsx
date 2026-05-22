"use client";

import { useState, useMemo } from "react";
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
    InformationCircleIcon
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

interface UnsupportedLog {
    id: string;
    timestamp: number;
    category: string;
    typeId: number;
    title: string;
    data: Record<string, any>;
    params: Record<string, any>;
}

export default function UnsupportedLogsVisualizer() {
    const [logs, setLogs] = useState<UnsupportedLog[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTypeIds, setSelectedTypeIds] = useState<number[]>([]);
    const [showTypeFilter, setShowTypeFilter] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const availableTypeIds = useMemo(() => {
        const types = Array.from(new Set(logs.map(log => log.typeId)));
        return types.sort((a, b) => a - b);
    }, [logs]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (Array.isArray(json)) {
                    setLogs(json);
                    const types = Array.from(new Set(json.map((log: any) => Number(log.typeId)))) as number[];
                    setSelectedTypeIds(types);
                    setError(null);
                } else {
                    throw new Error("Invalid format: Expected an array of logs.");
                }
            } catch (err: any) {
                setError(err.message || "Failed to parse JSON file.");
                setLogs([]);
            }
        };
        reader.readAsText(file);
    };

    const toggleTypeId = (typeId: number) => {
        setSelectedTypeIds(prev => 
            prev.includes(typeId) 
                ? prev.filter(id => id !== typeId)
                : [...prev, typeId]
        );
    };

    const filteredLogs = useMemo(() => {
        let result = logs;

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
                log.category.toLowerCase().includes(query)
            );
        }

        return result;
    }, [logs, searchQuery, selectedTypeIds, availableTypeIds]);

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
                            Select the .json file downloaded from Auto-Pilot to visualize and filter its contents.
                        </p>
                    </div>
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="log-upload"
                    />
                    <label
                        htmlFor="log-upload"
                        className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl cursor-pointer hover:opacity-90 transition-all active:scale-95"
                    >
                        Select File
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
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <HugeiconsIcon
                                icon={Search01Icon}
                                size={18}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                            />
                            <input
                                type="text"
                                placeholder="Filter by Log ID, Type ID, or Title..."
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
                            onClick={() => { setLogs([]); setSearchQuery(""); setSelectedTypeIds([]); }}
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
                                        <th className="px-6 py-4">Category / Type</th>
                                        <th className="px-6 py-4">Title</th>
                                        <th className="px-6 py-4">Data Preview</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-border">
                                    {filteredLogs.length > 0 ? (
                                        filteredLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-foreground/[0.02] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="font-mono text-xs font-bold">{new Date(log.timestamp * 1000).toLocaleString()}</div>
                                                    <div className="text-[10px] text-muted font-mono mt-1 group-hover:text-primary transition-colors">ID: {log.id}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="inline-flex items-center px-2 py-0.5 rounded bg-foreground/5 text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                                                        {log.category}
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
                                        ))
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
