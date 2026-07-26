"use client";

import React, { useMemo } from "react";
import { ItemLog } from "@/lib/objects/ItemLog";
import { ItemLogWrapper } from "@/lib/objects/ItemLogWrapper";
import { ReceiptTextIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format } from "date-fns";
import { useSettings } from "@/lib/old/useSettings";

interface ActivityLogTableProps {
    logs: ItemLog[];
    itemMap: Record<number, string>;
    wrapperMap?: Record<number, ItemLogWrapper>;
    isLoading: boolean;
}

/**
 * Safely formats a timestamp into a string.
 * Handles invalid numbers, NaN, and conversion from seconds to milliseconds if needed.
 * 
 * @param timestamp (number): The timestamp to format
 * @returns (string): Formatted date or "INVALID_DATE"
 */
const safeFormatDate = (timestamp: number): string => {
    if (!timestamp || isNaN(timestamp)) return "N/A";
    
    try {
        // If timestamp is too small (e.g. seconds instead of ms), multiply by 1000
        // Unix timestamps in seconds are typically < 10,000,000,000
        const dateValue = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
        return format(dateValue, "yyyy.MM.dd HH:mm:ss");
    } catch (err) {
        console.error(`Failed to format timestamp: ${timestamp}`, err);
        return "ERR_DATE";
    }
};

/**
 * Reusable table component for displaying item logs.
 * Supports a compact mode, vertical lines, alternating colors, and wrapper group visual indicators.
 * 
 * @param logs (ItemLog[]): Array of log entries to display
 * @param itemMap (Record<number, string>): Map of item IDs to names
 * @param wrapperMap (Record<number, ItemLogWrapper>): Map of wrapper IDs to wrapper metadata
 * @param isLoading (boolean): Loading state to show spinner
 */
export function ActivityLogTable({ logs, itemMap, wrapperMap = {}, isLoading }: ActivityLogTableProps) {
    const { settings } = useSettings();
    const isCompact = settings.compactTable;
    
    // Styling constants based on settings
    const cellPadding = isCompact ? "px-2 py-0" : "p-4";
    const headerPadding = isCompact ? "px-2 py-1" : "p-4";
    const fontSize = "text-xs";
    const headerFontSize = "text-[10px]";
    
    const verticalLineClass = settings.showVerticalLines ? "border-r border-primary/10 last:border-r-0" : "";

    // Count how many visible logs belong to each wrapper in the current view
    const wrapperCounts = useMemo(() => {
        const counts: Record<number, number> = {};
        logs.forEach((log) => {
            if (log.wrapper_id !== null && log.wrapper_id !== undefined) {
                counts[log.wrapper_id] = (counts[log.wrapper_id] || 0) + 1;
            }
        });
        return counts;
    }, [logs]);

    return (
        <div className="bg-panel border-2 border-primary overflow-hidden shadow-lg shadow-primary/5">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[920px]">
                    <thead>
                        <tr className="bg-muted/10 border-b-2 border-primary">
                            <th className={`${headerPadding} ${headerFontSize} ${verticalLineClass} font-normal uppercase tracking-widest text-muted-foreground whitespace-nowrap`}>Time</th>
                            <th className={`${headerPadding} ${headerFontSize} ${verticalLineClass} font-normal uppercase tracking-widest text-muted-foreground`}>Item</th>
                            <th className={`${headerPadding} ${headerFontSize} ${verticalLineClass} font-normal uppercase tracking-widest text-muted-foreground`}>UID</th>
                            <th className={`${headerPadding} ${headerFontSize} ${verticalLineClass} font-normal uppercase tracking-widest text-muted-foreground`}>Category</th>
                            <th className={`${headerPadding} ${headerFontSize} ${verticalLineClass} font-normal uppercase tracking-widest text-muted-foreground text-right`}>Amount</th>
                            <th className={`${headerPadding} ${headerFontSize} ${verticalLineClass} font-normal uppercase tracking-widest text-muted-foreground text-right`}>Unit Price</th>
                            <th className={`${headerPadding} ${headerFontSize} ${verticalLineClass} font-normal uppercase tracking-widest text-muted-foreground text-right`}>Running Stock</th>
                            <th className={`${headerPadding} ${headerFontSize} ${verticalLineClass} font-normal uppercase tracking-widest text-muted-foreground text-right border-r-0`}>Realized P/L</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {isLoading ? (
                            <tr>
                                <td colSpan={8} className="p-12 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        <span className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-primary">Initializing_Data_Stream...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-20 text-center">
                                    <div className="flex flex-col items-center gap-2 opacity-40">
                                        <HugeiconsIcon icon={ReceiptTextIcon} className="w-12 h-12 mb-2" />
                                        <p className="font-mono text-xs uppercase tracking-widest">No transaction records found in database.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            logs.map((log, index) => {
                                const isWrapped = log.wrapper_id !== null && log.wrapper_id !== undefined;
                                const wrapperId = log.wrapper_id;
                                const prevLog = index > 0 ? logs[index - 1] : null;
                                const isFirstInGroup = isWrapped && (prevLog?.wrapper_id !== wrapperId);
                                const wrapperInfo = isWrapped && wrapperId ? wrapperMap[wrapperId] : undefined;
                                const count = isWrapped && wrapperId ? wrapperCounts[wrapperId] : 0;

                                const wrapperBorderClass = isWrapped
                                    ? "border-l-4 border-amber-500/80 bg-amber-500/[0.03]"
                                    : settings.alternatingRowColors ? "even:bg-primary/[0.03]" : "";

                                return (
                                    <React.Fragment key={log.id ?? `log-${index}`}>
                                        {/* Thin Wrapper Header Row */}
                                        {isFirstInGroup && wrapperId && (
                                            <tr className="bg-amber-500/10 border-t-2 border-b border-amber-500/40 text-[10px] font-mono select-none">
                                                <td colSpan={8} className="px-3 py-1 text-amber-500 font-bold">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                            <span className="uppercase tracking-widest font-black">
                                                                WRAPPER #{wrapperId}
                                                            </span>
                                                            {wrapperInfo && (
                                                                <span className="text-[9px] opacity-80 uppercase font-normal tracking-wide">
                                                                    • {String(wrapperInfo.type || (wrapperInfo as any).wrapper_type || "group").toUpperCase()} {wrapperInfo.description ? `(${wrapperInfo.description})` : ''}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[9px] uppercase tracking-wider opacity-80 font-mono font-bold">
                                                            {count} {count === 1 ? 'CONNECTED ITEM' : 'CONNECTED ITEMS'}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}

                                        {/* Log Item Row */}
                                        <tr className={`${wrapperBorderClass} hover:bg-primary/[0.05] transition-colors group leading-tight`}>
                                            <td className={`${cellPadding} ${verticalLineClass} font-mono ${fontSize} whitespace-nowrap text-muted-foreground`}>
                                                {safeFormatDate(log.timestamp)}
                                            </td>
                                            <td className={`${cellPadding} ${verticalLineClass}`}>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`${fontSize} font-black uppercase tracking-tight group-hover:text-primary transition-colors`}>
                                                        {itemMap[log.item_id] || `ITEM_${log.item_id}`} <span className="text-muted font-mono font-normal opacity-50">#{log.item_id}</span>
                                                    </span>
                                                    {isWrapped && (
                                                        <span className="text-[9px] px-1 py-0.2 bg-amber-500/20 text-amber-500 font-mono font-bold rounded" title={`Wrapper #${wrapperId}`}>
                                                            W#{wrapperId}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={`${cellPadding} ${verticalLineClass} font-mono ${fontSize} text-info/80`}>
                                                {log.uid ?? "STANDARD"}
                                            </td>
                                            <td className={`${cellPadding} ${verticalLineClass}`}>
                                                <span className={`${fontSize} font-mono font-black uppercase tracking-widest text-muted-foreground`}>
                                                    {log.category}
                                                </span>
                                            </td>
                                            <td className={`${cellPadding} ${verticalLineClass} text-right font-mono ${fontSize} font-bold ${log.quantity > 0 ? 'text-success' : 'text-danger'}`}>
                                                {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                                            </td>
                                            <td className={`${cellPadding} ${verticalLineClass} text-right font-mono ${fontSize}`}>
                                                <span className="text-muted mr-1">$</span>
                                                {Math.round(log.unit_price).toLocaleString()}
                                            </td>
                                            <td className={`${cellPadding} ${verticalLineClass} text-right font-mono ${fontSize} font-bold text-info`}>
                                                {Math.round(log.total_stock).toLocaleString()}
                                            </td>
                                            <td className={`${cellPadding} text-right font-mono ${fontSize} ${log.realized_profit > 0 ? 'text-success font-bold' : log.realized_profit < 0 ? 'text-danger font-bold' : 'text-muted-foreground'}`}>
                                                {log.realized_profit > 0 ? `+$${Math.round(log.realized_profit).toLocaleString()}` : log.realized_profit < 0 ? `-$${Math.round(Math.abs(log.realized_profit)).toLocaleString()}` : '—'}
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
