"use client";

import { useMemo, useState, Suspense, useEffect } from "react";
import { useJournal } from "@/store/useJournal";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    ArrowLeft01Icon,
    CheckmarkCircle01Icon,
    PauseCircleIcon,
    Alert01Icon,
    Search01Icon,
    FilterIcon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { format } from "date-fns";
import { useSearchParams, useRouter } from "next/navigation";
import { TransactionSourceType } from "@/lib/parser";
import { buildImportRecord, AutoPilotImportRecord } from "@/lib/torn-api";
import { TornTrade } from "@/lib/game/trade";
import { DBInterface } from "@/lib/interfaces/db";

function ActivityPageContent() {
    const { isLoaded } = useJournal();
    const searchParams = useSearchParams();
    const router = useRouter();
    const filterType = searchParams.get("type") as TransactionSourceType | null;
    const [search, setSearch] = useState("");
    const [trades, setTrades] = useState<TornTrade[]>([]);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        setTrades(DBInterface.migrationGetTrades());
    }, []);

    const activityRecords = useMemo((): AutoPilotImportRecord[] => {
        if (!isClient || trades.length === 0) return [];

        const records: AutoPilotImportRecord[] = [];

        for (const trade of trades) {
            if (trade.isLinked()) {
                records.push(
                    buildImportRecord({
                        id: `trade:${trade.id}`,
                        timestamp: trade.timestamp,
                        title: `Trade ${trade.id}`,
                        status: "imported",
                        sourceType: "trade",
                        tornLogId: trade.tornLogId,
                        weav3rReceiptId: trade.linkedReceiptId,
                    })
                );
            } else if (trade.manuallyLiked) {
                records.push(
                    buildImportRecord({
                        id: `trade:${trade.id}`,
                        timestamp: trade.timestamp,
                        title: `Trade ${trade.id}`,
                        status: "imported",
                        sourceType: "trade",
                        tornLogId: trade.tornLogId,
                        note: "Manually linked",
                    })
                );
            } else {
                records.push(
                    buildImportRecord({
                        id: `trade:${trade.id}`,
                        timestamp: trade.timestamp,
                        title: `Trade ${trade.id}`,
                        status: "manual_required",
                        sourceType: "trade",
                        tornLogId: trade.tornLogId,
                    })
                );
            }
        }

        return records.sort((a, b) => b.timestamp - a.timestamp);
    }, [trades]);

    const filteredActivities = useMemo(() => {
        return activityRecords.filter((record) => {
            const matchesType = !filterType || record.sourceType === filterType;
            const matchesSearch =
                !search ||
                record.title.toLowerCase().includes(search.toLowerCase()) ||
                record.tornLogId?.toLowerCase().includes(search.toLowerCase()) ||
                record.weav3rReceiptId?.toLowerCase().includes(search.toLowerCase());
            return matchesType && matchesSearch;
        });
    }, [activityRecords, filterType, search]);

    if (!isLoaded)
        return (
            <div className="text-center py-20 animate-pulse text-foreground/50">
                Loading Activity...
            </div>
        );

    const sourceTypes: { label: string; value: TransactionSourceType | "all" }[] = [
        { label: "All", value: "all" },
        { label: "Trade", value: "trade" },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex items-center justify-between">
                <Link
                    href="/auto"
                    className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground transition-colors"
                >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={16} /> Back to Auto-Pilot
                </Link>
            </div>

            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Auto-Pilot Activity</h1>
                <p className="text-foreground/60">
                    Complete history of all automatic import attempts and results.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-panel p-4 rounded-2xl border border-border shadow-sm">
                <div className="relative flex-1 w-full">
                    <HugeiconsIcon icon={Search01Icon} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                    <input
                        type="text"
                        placeholder="Search activity, log IDs..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    <HugeiconsIcon icon={FilterIcon} size={16} className="text-foreground/40 hidden sm:block" />
                    {sourceTypes.map((type) => (
                        <button
                            key={type.value}
                            onClick={() => {
                                const params = new URLSearchParams(searchParams.toString());
                                if (type.value === "all") {
                                    params.delete("type");
                                } else {
                                    params.set("type", type.value);
                                }
                                router.push(`?${params.toString()}`);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                filterType === type.value || (!filterType && type.value === "all")
                                    ? "bg-orange-500 text-white"
                                    : "bg-background border border-border text-foreground/60 hover:text-foreground"
                            }`}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                {filteredActivities.length === 0 ? (
                    <div className="text-center py-20 bg-panel rounded-2xl border border-dashed border-border text-foreground/50">
                        {search || filterType
                            ? "No activity matches your filters."
                            : "No Auto-Pilot activity recorded yet."}
                    </div>
                ) : (
                    filteredActivities.map((record) => (
                        <div
                            key={`${record.id}-${record.status}-${record.note || ""}`}
                            className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-panel px-5 py-4 shadow-sm hover:border-orange-500/30 transition-colors"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    {record.status === "imported" ? (
                                        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} className="text-green-500" />
                                    ) : record.status === "manual_required" ? (
                                        <HugeiconsIcon icon={PauseCircleIcon} size={16} className="text-amber-500" />
                                    ) : (
                                        <HugeiconsIcon icon={Alert01Icon} size={16} className="text-foreground/50" />
                                    )}
                                    <p className="font-bold">{record.title}</p>
                                    <span className="text-[10px] bg-foreground/5 border border-border px-2 py-0.5 rounded uppercase tracking-wider font-bold text-foreground/50">
                                        {record.sourceType?.replace("-", " ")}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-foreground/55">
                                    {format(new Date(record.timestamp * 1000), "MMM d, yyyy HH:mm")}
                                    {record.tornLogId ? ` · ${record.tornLogId}` : ""}
                                    {record.weav3rReceiptId
                                        ? ` · receipt ${record.weav3rReceiptId}`
                                        : ""}
                                </p>
                                {record.note && (
                                    <p className="mt-1 text-sm text-amber-600/80 dark:text-amber-400/80 font-medium">
                                        {record.note}
                                    </p>
                                )}
                            </div>
                            <div
                                className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider shadow-sm ${
                                    record.status === "imported"
                                        ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300"
                                        : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
                                }`}
                            >
                                {record.status.replace("_", " ")}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default function ActivityPage() {
    return (
        <Suspense fallback={<div className="animate-pulse">Loading Activity...</div>}>
            <ActivityPageContent />
        </Suspense>
    );
}
