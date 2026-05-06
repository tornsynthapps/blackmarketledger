"use client";

import React from "react";
import { ItemLog } from "@/lib/objects/ItemLog";
import { ReceiptTextIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format } from "date-fns";
import { useSettings } from "@/lib/old/useSettings";

interface ActivityLogTableProps {
    logs: ItemLog[];
    itemMap: Record<number, string>;
    isLoading: boolean;
}

/**
 * Reusable table component for displaying item logs.
 * Supports a compact mode, vertical lines, and alternating colors via settings.
 * 
 * @param logs (ItemLog[]): Array of log entries to display
 * @param itemMap (Record<number, string>): Map of item IDs to names
 * @param isLoading (boolean): Loading state to show spinner
 */
export function ActivityLogTable({ logs, itemMap, isLoading }: ActivityLogTableProps) {
    const { settings } = useSettings();
    const isCompact = settings.compactTable;
    
    // Styling constants based on settings
    const cellPadding = isCompact ? "px-2 py-0" : "p-4";
    const headerPadding = isCompact ? "px-2 py-1" : "p-4";
    const fontSize = "text-xs";
    const headerFontSize = "text-[10px]";
    
    const verticalLineClass = settings.showVerticalLines ? "border-r border-primary/10 last:border-r-0" : "";
    const rowClass = settings.alternatingRowColors ? "even:bg-primary/[0.03]" : "";

    return (
        <div className="bg-panel border-2 border-primary overflow-hidden shadow-lg shadow-primary/5">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-muted/10 border-b-2 border-primary">
                            <th className={`${headerPadding} ${headerFontSize} ${verticalLineClass} font-normal uppercase tracking-widest text-muted-foreground whitespace-nowrap`}>Time</th>
                            <th className={`${headerPadding} ${headerFontSize} ${verticalLineClass} font-normal uppercase tracking-widest text-muted-foreground`}>Item</th>
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
                                <td colSpan={7} className="p-12 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        <span className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-primary">Initializing_Data_Stream...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-20 text-center">
                                    <div className="flex flex-col items-center gap-2 opacity-40">
                                        <HugeiconsIcon icon={ReceiptTextIcon} className="w-12 h-12 mb-2" />
                                        <p className="font-mono text-xs uppercase tracking-widest">No transaction records found in database.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className={`${rowClass} hover:bg-primary/[0.05] transition-colors group leading-tight`}>
                                    <td className={`${cellPadding} ${verticalLineClass} font-mono ${fontSize} whitespace-nowrap text-muted-foreground`}>
                                        {format(log.timestamp, "yyyy.MM.dd HH:mm:ss")}
                                    </td>
                                    <td className={`${cellPadding} ${verticalLineClass}`}>
                                        <span className={`${fontSize} font-black uppercase tracking-tight group-hover:text-primary transition-colors`}>
                                            {itemMap[log.item_id] || `ITEM_${log.item_id}`} <span className="text-muted font-mono font-normal opacity-50">#{log.item_id}</span>
                                        </span>
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
                            ) )
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
