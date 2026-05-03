"use client";

import { useMemo, useState, useEffect } from "react";
import { ItemLogService } from "@/lib/domain/ItemLogService";
import { ItemLog } from "@/lib/objects/ItemLog";
import { PageHeader } from "@/components/PageHeader";
import { ReceiptTextIcon } from "@hugeicons/core-free-icons";
import { format } from "date-fns";

/**
 * Page to display item logs using the new domain service.
 * Provides a clean table view of all activity tracked in the new system.
 */
export default function NewLogsPage() {
    const [logs, setLogs] = useState<ItemLog[]>([]);
    const [itemMap, setItemMap] = useState<Record<number, string>>({});
    const [isLoading, setIsLoading] = useState(true);

    const service = useMemo(() => new ItemLogService(), []);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // Fetch logs and items in parallel for efficiency
                const [fetchedLogs, res] = await Promise.all([
                    service.getAllLogs(),
                    fetch("/items.json")
                ]);
                
                // Sort logs by timestamp descending (newest first)
                setLogs(fetchedLogs.sort((a, b) => b.timestamp - a.timestamp));

                // Process item data into a quick-lookup map
                const items = await res.json();
                const map: Record<number, string> = {};
                Object.entries(items).forEach(([id, item]: [string, any]) => {
                    map[parseInt(id)] = item.name;
                });
                setItemMap(map);
            } catch (error) {
                console.error("Failed to load data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        void loadData();
    }, [service]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
            <PageHeader 
                title="Activity Log" 
                icon={ReceiptTextIcon} 
            />

            <div className="bg-panel border-2 border-primary overflow-hidden shadow-lg shadow-primary/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-muted/10 border-b-2 border-primary">
                                <th className="p-4 text-[10px] font-normal uppercase tracking-widest text-muted-foreground">Time</th>
                                <th className="p-4 text-[10px] font-normal uppercase tracking-widest text-muted-foreground">Item</th>
                                <th className="p-4 text-[10px] font-normal uppercase tracking-widest text-muted-foreground">Category</th>
                                <th className="p-4 text-[10px] font-normal uppercase tracking-widest text-muted-foreground text-right">Amount</th>
                                <th className="p-4 text-[10px] font-normal uppercase tracking-widest text-muted-foreground text-right">Unit Price</th>
                                <th className="p-4 text-[10px] font-normal uppercase tracking-widest text-muted-foreground text-right">Running Stock</th>
                                <th className="p-4 text-[10px] font-normal uppercase tracking-widest text-muted-foreground text-right">Realized P/L</th>
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
                                            <ReceiptTextIcon className="w-12 h-12 mb-2" />
                                            <p className="font-mono text-xs uppercase tracking-widest">No transaction records found in database.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-primary/[0.02] transition-colors group">
                                        <td className="p-4 font-mono text-[10px] whitespace-nowrap text-muted-foreground">
                                            {format(log.timestamp, "yyyy.MM.dd HH:mm:ss")}
                                        </td>
                                        <td className="p-4">
                                            <span className="text-xs font-black uppercase tracking-tight group-hover:text-primary transition-colors">
                                                {itemMap[log.item_id] || `ITEM_${log.item_id}`} <span className="text-muted font-mono font-normal">#{log.item_id}</span>
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-muted-foreground">
                                                {log.category}
                                            </span>
                                        </td>
                                        <td className={`p-4 text-right font-mono text-xs font-bold ${log.quantity > 0 ? 'text-success' : 'text-danger'}`}>
                                            {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                                        </td>
                                        <td className="p-4 text-right font-mono text-xs">
                                            <span className="text-muted mr-1">$</span>
                                            {Math.round(log.unit_price).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-right font-mono text-xs font-bold text-info">
                                            {Math.round(log.total_stock).toLocaleString()}
                                        </td>
                                        <td className={`p-4 text-right font-mono text-xs ${log.realized_profit > 0 ? 'text-success font-bold' : log.realized_profit < 0 ? 'text-danger font-bold' : 'text-muted-foreground'}`}>
                                            {log.realized_profit > 0 ? `+$${Math.round(log.realized_profit).toLocaleString()}` : log.realized_profit < 0 ? `-$${Math.round(Math.abs(log.realized_profit)).toLocaleString()}` : '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
