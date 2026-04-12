"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
    ArrowDown01Icon,
    ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { BlackboxLog, formatTimestamp } from "./types";

interface EventItemProps {
    event: BlackboxLog;
    isExpanded: boolean;
    onToggle: () => void;
}

export function EventItem({
    event,
    isExpanded,
    onToggle,
}: EventItemProps) {
    const eventColors: Record<string, string> = {
        sync_start: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
        sync_initialized: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
        item_sync_start: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
        item_fetch_result:
            "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
        item_import_result:
            "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
        item_sync_complete:
            "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
        trade_fetch_request:
            "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
        trade_fetch_result:
            "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
        receipt_fetch_request:
            "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
        receipt_fetch_result:
            "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
        linking_start: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300",
        linking_result: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300",
        unlinked_summary: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
        trade_import_result: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300",
        sync_complete: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
        sync_error: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    };

    const colorClass =
        eventColors[event.event] || "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300";

    const bodyData = event.data?.body ?? event.data;

    return (
        <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
                <HugeiconsIcon
                    icon={isExpanded ? ArrowDown01Icon : ArrowRight01Icon}
                    className="w-4 h-4 text-gray-400 flex-shrink-0"
                />
                <span className={`text-xs px-2 py-0.5 rounded ${colorClass}`}>{event.event}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                    {formatTimestamp(event.timestamp)}
                </span>
            </button>
            {isExpanded && (
                <div className="px-3 pb-3 pl-[52px]">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all text-gray-600 dark:text-gray-300 font-mono">
                        {JSON.stringify(bodyData, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
