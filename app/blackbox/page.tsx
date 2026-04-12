"use client";

import { useMemo, useState, useEffect, Suspense, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Search01Icon,
    Delete02Icon,
    ArrowLeft01Icon,
    RefreshIcon,
    ArrowDown01Icon,
    ArrowRight01Icon,
    CloudDownloadIcon,
    PackageProcessIcon,
} from "@hugeicons/core-free-icons";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Storage } from "@/lib/storage";
import { Blackbox } from "@/lib/blackbox";

import { BlackboxLog, BlackboxData, formatTimestamp } from "./types";
import { EventItem } from "./EventItem";
import { BlackboxDetailView } from "./BlackboxDetailView";

function parseBlackboxData(rawData: Record<string, any>): BlackboxData[] {
    const blackboxes: BlackboxData[] = [];
    for (const [id, logsValue] of Object.entries(rawData)) {
        try {
            const logsMap = typeof logsValue === "string" ? JSON.parse(logsValue) : logsValue;
            const logs: BlackboxLog[] = [];
            for (const [, value] of Object.entries(logsMap)) {
                try {
                    if (typeof value === "object" && value !== null) {
                        logs.push(value as BlackboxLog);
                    } else if (typeof value === "string") {
                        logs.push(JSON.parse(value));
                    } else {
                        logs.push({
                            event: "parse_error",
                            data: { raw: value },
                            timestamp: "",
                        });
                    }
                } catch {
                    logs.push({
                        event: "parse_error",
                        data: { raw: value },
                        timestamp: "",
                    });
                }
            }
            const validLogs = logs.filter((l) => l.timestamp);
            validLogs.sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            const firstLog = validLogs.find((l) => l.event === "sync_start");
            const createdAt = firstLog?.timestamp || new Date(parseInt(id)).toISOString();
            blackboxes.push({
                id,
                createdAt,
                logs: validLogs.length > 0 ? validLogs : logs,
            });
        } catch {
            blackboxes.push({
                id,
                createdAt: new Date(parseInt(id)).toISOString(),
                logs: [],
            });
        }
    }
    const validBlackboxes = blackboxes.filter((b) => {
        const date = new Date(b.createdAt);
        return !isNaN(date.getTime());
    });
    validBlackboxes.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return validBlackboxes;
}

function BlackboxCard({
    blackbox,
    isSelected,
    onSelect,
}: {
    blackbox: BlackboxData;
    isSelected: boolean;
    onSelect: () => void;
}) {
    return (
        <div
            onClick={onSelect}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
                isSelected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-mono text-sm font-medium">#{blackbox.id}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(blackbox.createdAt)}
                    </p>
                </div>
                <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {blackbox.logs.length} events
                </span>
            </div>
        </div>
    );
}

function BlackboxPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedId = searchParams.get("id");

    const [searchQuery, setSearchQuery] = useState("");
    const [rawData, setRawData] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(true);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await Storage.getAllKeysAndValues(Blackbox.STORAGE_KEY);
            setRawData(data);
        } catch (error) {
            console.error("Failed to load blackbox data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const blackboxes = useMemo(() => parseBlackboxData(rawData), [rawData]);

    const selectedBlackbox = useMemo(
        () => blackboxes.find((b) => b.id === selectedId),
        [blackboxes, selectedId]
    );

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this blackbox?")) return;
        try {
            await Storage.delete(Blackbox.STORAGE_KEY, id);
            await loadData();
            if (selectedId === id) {
                router.push("/blackbox");
            }
        } catch (error) {
            console.error("Failed to delete blackbox:", error);
            alert("Failed to delete blackbox");
        }
    };

    const handleExportSelected = () => {
        if (!selectedId || !rawData[selectedId]) return;
        const dataStr = JSON.stringify({ [selectedId]: rawData[selectedId] }, null, 2);
        const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
        const exportFileDefaultName = `blackbox-${selectedId}-${new Date().toISOString()}.json`;

        const linkElement = document.createElement("a");
        linkElement.setAttribute("href", dataUri);
        linkElement.setAttribute("download", exportFileDefaultName);
        linkElement.click();
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 p-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Blackbox</h1>
                <div className="flex gap-2">
                    <Link
                        href="/blackbox/import"
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <HugeiconsIcon icon={CloudDownloadIcon} className="w-4 h-4" />
                        View from file
                    </Link>
                </div>
            </div>

            {selectedId && selectedBlackbox ? (
                <BlackboxDetailView
                    blackbox={selectedBlackbox}
                    onBack={() => router.push("/blackbox")}
                    onRefresh={() => router.refresh()}
                    extraActions={
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportSelected}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                <HugeiconsIcon icon={PackageProcessIcon} className="w-3.5 h-3.5" />
                                Export
                            </button>
                            <button
                                onClick={() => handleDelete(selectedId)}
                                className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                                <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4" />
                            </button>
                        </div>
                    }
                />
            ) : (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <HugeiconsIcon
                                icon={Search01Icon}
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                            />
                            <input
                                type="text"
                                placeholder="Search blackboxes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                            />
                        </div>
                    </div>

                    {blackboxes.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <HugeiconsIcon
                                icon={ArrowDown01Icon}
                                className="w-12 h-12 mx-auto mb-4 opacity-50"
                            />
                            <p>No blackboxes yet. Run a sync in Auto-Pilot to create one.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {blackboxes
                                .filter((b) => {
                                    if (!searchQuery.trim()) return true;
                                    const query = searchQuery.toLowerCase();
                                    return (
                                        b.id.toLowerCase().includes(query) ||
                                        b.logs.some(
                                            (l) =>
                                                l.event.toLowerCase().includes(query) ||
                                                JSON.stringify(l.data).toLowerCase().includes(query)
                                        )
                                    );
                                })
                                .map((blackbox) => (
                                    <div key={blackbox.id} className="relative">
                                        <BlackboxCard
                                            blackbox={blackbox}
                                            isSelected={blackbox.id === selectedId}
                                            onSelect={() =>
                                                router.push(`/blackbox?id=${blackbox.id}`)
                                            }
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(blackbox.id);
                                            }}
                                            className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                        >
                                            <HugeiconsIcon
                                                icon={Delete02Icon}
                                                className="w-4 h-4"
                                            />
                                        </button>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export { parseBlackboxData };
export default function BlackboxPage() {
    return (
        <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
            <BlackboxPageContent />
        </Suspense>
    );
}
