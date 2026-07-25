"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
    Clock01Icon,
    DashboardSquare01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";

const LOG_LEVEL_CONFIG: Record<SystemLogLevel, { icon: any; color: string; bgColor: string }> = {
    info: { icon: InformationCircleIcon, color: "text-info", bgColor: "bg-info/10" },
    warn: { icon: Alert01Icon, color: "text-warning", bgColor: "bg-warning/10" },
    error: { icon: AlertCircleIcon, color: "text-danger", bgColor: "bg-danger/10" },
    debug: { icon: Settings01Icon, color: "text-muted", bgColor: "bg-muted/10" },
};

function LogDetailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const logId = searchParams.get("ID");
    
    const [log, setLog] = useState<SystemLog | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const registry = useMemo(() => new SystemLogRegistry(), []);

    useEffect(() => {
        if (!logId) return;
        
        const fetchLog = async () => {
            setIsLoading(true);
            try {
                const fetched = await registry.getById(parseInt(logId));
                setLog(fetched || null);
            } catch (error) {
                console.error("Failed to fetch log detail:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLog();
    }, [logId, registry]);

    if (isLoading) {
        return (
            <div className="p-20 text-center text-muted font-mono text-xs italic animate-pulse">
                RETRIEVING_DATA_PACKET...
            </div>
        );
    }

    if (!log) {
        return (
            <div className="p-20 text-center space-y-4">
                <div className="text-muted font-mono text-xs italic tracking-widest uppercase">
                    Error: Log Entry Not Found
                </div>
                <Link 
                    href="/blackbox"
                    className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-bold uppercase tracking-tighter"
                >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                    Back to Terminal
                </Link>
            </div>
        );
    }

    const config = LOG_LEVEL_CONFIG[log.level];

    return (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between">
                <Link 
                    href="/blackbox"
                    className="group inline-flex items-center gap-2 text-muted hover:text-primary transition-colors text-xs font-bold uppercase tracking-widest"
                >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={14} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Registry
                </Link>
                <div className="text-[10px] font-mono text-muted uppercase tracking-[0.2em]">
                    Packet_Hash: #{log.id}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Meta Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-panel border-2 border-primary p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted mb-6">Metadata</h3>
                        
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="text-[9px] font-bold text-muted uppercase tracking-wider">Level</div>
                                <div className={`inline-flex items-center gap-2 px-3 py-1 border-2 border-current ${config.color} ${config.bgColor} text-xs font-black uppercase`}>
                                    <HugeiconsIcon icon={config.icon} size={14} />
                                    {log.level}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="text-[9px] font-bold text-muted uppercase tracking-wider">Timestamp</div>
                                <div className="flex items-center gap-2 text-foreground font-mono text-xs">
                                    <HugeiconsIcon icon={Clock01Icon} size={14} className="text-muted" />
                                    {new Date(log.timestamp).toLocaleString()}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="text-[9px] font-bold text-muted uppercase tracking-wider">Context</div>
                                <div className="flex items-center gap-2 text-info font-mono text-xs font-bold uppercase">
                                    <HugeiconsIcon icon={DashboardSquare01Icon} size={14} className="text-muted" />
                                    {log.context}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Panel */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-panel border-2 border-primary p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] h-full">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted mb-6">Execution Message</h3>
                        <div className="font-mono text-sm leading-relaxed p-4 bg-background border-l-4 border-primary">
                            {log.message}
                        </div>

                        {log.data && (
                            <div className="mt-8">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted mb-4">Payload Data</h3>
                                <pre className="p-4 bg-background/50 border border-primary/20 rounded-lg overflow-x-auto custom-scrollbar text-[11px] leading-relaxed text-info/90 font-mono">
                                    {JSON.stringify(log.data, null, 4)}
                                </pre>
                            </div>
                        )}
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

export default function LogDetailPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Log Entry Details"
                description="In-depth inspection of a specific system execution record."
                icon={Activity01Icon}
            />
            
            <Suspense fallback={<div className="p-20 text-center text-muted font-mono text-xs italic">MOUNTING_VIEWER...</div>}>
                <LogDetailContent />
            </Suspense>
        </div>
    );
}
