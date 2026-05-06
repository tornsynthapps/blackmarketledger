"use client";

import { useMemo, useState, useEffect } from "react";
import { ItemLogService } from "@/lib/domain/ItemLogService";
import { ItemLog } from "@/lib/objects/ItemLog";
import { PageHeader } from "@/components/PageHeader";
import { ReceiptTextIcon } from "@hugeicons/core-free-icons";
import { ActivityLogTable } from "@/components/ActivityLogTable";
import { useSettings } from "@/lib/old/useSettings";

/**
 * Page to display item logs using the new domain service.
 * Provides a clean table view of all activity tracked in the new system.
 * Respects the "Compact Table" setting.
 */
export default function NewLogsPage() {
    const { settings } = useSettings();
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

            <ActivityLogTable 
                logs={logs} 
                itemMap={itemMap} 
                isLoading={isLoading} 
            />
        </div>
    );
}
