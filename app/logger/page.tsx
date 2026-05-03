"use client";

import { useEffect, useState, useMemo } from "react";
import { SystemLog, SystemLogRegistry, type SystemLogLevel } from "@/lib/objects/SystemLog";
import { PageHeader } from "@/components/PageHeader";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Activity01Icon,
    Alert01Icon,
    AlertCircleIcon,
    InformationCircleIcon,
    Settings01Icon,
    ArrowLeft01Icon,
    ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

const LOG_LEVEL_CONFIG: Record<SystemLogLevel, { icon: any; color: string; bgColor: string }> = {
    info: { icon: InformationCircleIcon, color: "text-info", bgColor: "bg-info/5" },
    warn: { icon: Alert01Icon, color: "text-warning", bgColor: "bg-warning/5" },
    error: { icon: AlertCircleIcon, color: "text-danger", bgColor: "bg-danger/5" },
    debug: { icon: Settings01Icon, color: "text-muted", bgColor: "bg-muted/5" },
};

export default function LoggerPage() {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [totalCount, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const registry = useMemo(() => new SystemLogRegistry(), []);

    const limit = 100;
    const totalPages = Math.ceil(totalCount / limit);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const [fetchedLogs, count] = await Promise.all([
                registry.getPaged((page - 1) * limit, limit),
                registry.count(),
            ]);
            setLogs(fetchedLogs);
            setCount(count);
        } catch (error) {
            console.error("Failed to fetch system logs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="System Audit Logs"
                description="Low-level application and background service execution history."
                icon={Activity01Icon}
            />

            <div className="bg-panel border-2 border-primary overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-primary/10 border-b-2 border-primary text-left">
                                <th className="p-3 font-bold text-[10px] uppercase tracking-[0.2em] w-16">ID</th>
                                <th className="p-3 font-bold text-[10px] uppercase tracking-[0.2em] w-48">Timestamp</th>
                                <th className="p-3 font-bold text-[10px] uppercase tracking-[0.2em] w-24">Level</th>
                                <th className="p-3 font-bold text-[10px] uppercase tracking-[0.2em] w-48">Context</th>
                                <th className="p-3 font-bold text-[10px] uppercase tracking-[0.2em]">Message</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-primary/10">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-muted font-mono text-xs italic">
                                        ACCESSING_DATA_STREAM...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-muted font-mono text-xs italic">
                                        NO_LOGS_FOUND_IN_BUFFER
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => {
                                    const config = LOG_LEVEL_CONFIG[log.level];
                                    return (
                                        <tr key={log.id} className={`group ${config.bgColor} hover:bg-foreground/[0.03] transition-colors border-b border-primary/5 last:border-0`}>
                                            <td className="p-3 font-mono text-[10px] text-muted">#{log.id}</td>
                                            <td className="p-3 font-mono text-[10px] whitespace-nowrap">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td className="p-3 font-mono text-[10px]">
                                                <div className={`flex items-center gap-1.5 ${config.color} font-black uppercase`}>
                                                    <HugeiconsIcon icon={config.icon} size={12} />
                                                    {log.level}
                                                </div>
                                            </td>
                                            <td className="p-3 font-mono text-[10px] text-info font-bold">
                                                {log.context}
                                            </td>
                                            <td className="p-3 font-mono text-[10px] leading-relaxed break-words">
                                                {log.message}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t-2 border-primary bg-primary/5 flex items-center justify-between">
                    <div className="text-[10px] font-bold text-muted uppercase tracking-wider">
                        Displaying {logs.length} of {totalCount} logs
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page === 1 || isLoading}
                            onClick={() => setPage(p => p - 1)}
                            className="p-2 border-2 border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all active:translate-y-0.5"
                        >
                            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                        </button>
                        <span className="font-mono text-xs font-bold px-4">
                            PAGE {page} OF {Math.max(1, totalPages)}
                        </span>
                        <button
                            disabled={page === totalPages || totalPages === 0 || isLoading}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 border-2 border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all active:translate-y-0.5"
                        >
                            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                        </button>
                    </div>
                </div>
            </div>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    height: 8px;
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #141416;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #3a3a3f;
                    border: 2px solid #141416;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #f2f2f2;
                }
            `}</style>
        </div>
    );
}
