"use client";

import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Search01Icon,
    ArrowRight01Icon,
    RefreshIcon,
} from "@hugeicons/core-free-icons";
import { BlackboxLog, BlackboxData, formatTimestamp } from "./types";
import { EventItem } from "./EventItem";

interface BlackboxDetailViewProps {
    blackbox: BlackboxData;
    onBack: () => void;
    onRefresh?: () => void;
    extraActions?: React.ReactNode;
}

export function BlackboxDetailView({
    blackbox,
    onBack,
    onRefresh,
    extraActions,
}: BlackboxDetailViewProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [eventFilter, setEventFilter] = useState<string>("all");
    const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

    const eventTypes = useMemo(() => {
        const types = new Set<string>();
        blackbox.logs.forEach((l: BlackboxLog) => types.add(l.event));
        return Array.from(types).sort();
    }, [blackbox]);

    const filteredLogs = useMemo(() => {
        let logs = blackbox.logs;
        if (eventFilter !== "all") {
            logs = logs.filter((l: BlackboxLog) => l.event === eventFilter);
        }
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            logs = logs.filter(
                (l: BlackboxLog) =>
                    l.event.toLowerCase().includes(query) ||
                    JSON.stringify(l.data).toLowerCase().includes(query)
            );
        }
        return logs;
    }, [blackbox, eventFilter, searchQuery]);

    const toggleEvent = (index: number) => {
        setExpandedEvents((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                        <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 rotate-180" />
                        Back
                    </button>
                    {extraActions}
                </div>
                <div className="flex items-center gap-2">
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <HugeiconsIcon icon={RefreshIcon} className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <HugeiconsIcon
                        icon={Search01Icon}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                    />
                    <input
                        type="text"
                        placeholder="Search events..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                    />
                </div>
                <select
                    value={eventFilter}
                    onChange={(e) => setEventFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                >
                    <option value="all">All events</option>
                    {eventTypes.map((type) => (
                        <option key={type} value={type}>
                            {type}
                        </option>
                    ))}
                </select>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <span className="font-medium">#{blackbox.id}</span>
                        <span className="text-gray-500 ml-2">
                            {formatTimestamp(blackbox.createdAt)}
                        </span>
                    </div>
                    <span className="text-xs text-gray-500">
                        {filteredLogs.length} events
                    </span>
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                    {filteredLogs.length === 0 ? (
                        <p className="p-4 text-gray-500 text-center">No events found</p>
                    ) : (
                        filteredLogs.map((event: BlackboxLog, idx: number) => (
                            <EventItem
                                key={idx}
                                event={event}
                                isExpanded={expandedEvents.has(idx)}
                                onToggle={() => toggleEvent(idx)}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
