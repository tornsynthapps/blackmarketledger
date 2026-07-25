import { BaseService } from "./BaseService";
import { getDatabase } from "../objects/BaseObject";

export class DataManagementService extends BaseService {
    protected get SERVICE_NAME(): string {
        return "DataManagementService";
    }

    /**
     * Clears all logs, trades, receipts, wrappers, system configs, autopilot cursors,
     * legacy IndexedDB stores, and local storage data in a single operation.
     */
    public async clearAllData(): Promise<void> {
        this.logger.info("Initiating complete data clear operation...");

        // 1. Clear Dexie BlackMarketLedgerObjectsDB tables
        try {
            const db = getDatabase("BlackMarketLedgerObjectsDB");
            await db.transaction("rw", db.tables, async () => {
                await Promise.all(db.tables.map((table) => table.clear()));
            });
            this.logger.info("Cleared all tables in BlackMarketLedgerObjectsDB.");
        } catch (err) {
            this.logger.error("Failed clearing BlackMarketLedgerObjectsDB:", err);
        }

        // 2. Delete legacy IndexedDB databases if window is defined
        if (typeof window !== "undefined" && window.indexedDB) {
            const legacyDBs = ["LogsDB", "GoogleCacheLogsDB", "torn_sync_db", "BML_LOGS_DB"];
            for (const dbName of legacyDBs) {
                try {
                    await new Promise<void>((resolve) => {
                        const req = indexedDB.deleteDatabase(dbName);
                        req.onsuccess = () => resolve();
                        req.onerror = () => resolve();
                        req.onblocked = () => resolve();
                    });
                    this.logger.info(`Deleted legacy database: ${dbName}`);
                } catch (err) {
                    this.logger.error(`Error deleting database ${dbName}:`, err);
                }
            }
        }

        // 3. Clear LocalStorage sync and data keys
        if (typeof window !== "undefined" && window.localStorage) {
            const keysToRemove = [
                "autopilot_cursor",
                "last_sync_timestamp",
                "torn_logs_last_cursor",
                "journal_transactions",
                "journal_inventory",
                "museum-drift-status",
                "bml-main-chart-prefs-v2",
                "bml-inventory-sort-pref-v2",
                "bml-dashboard-grouped-pref-v2",
                "bml-dashboard-favorite-groups-v2",
                "museum-range",
                "museum-view",
                "museum-mode",
                "museum-flower-num-items",
                "museum-plushie-num-items",
                "museum-pricelist-thresholds",
            ];
            keysToRemove.forEach((key) => localStorage.removeItem(key));
            this.logger.info("Cleared LocalStorage data keys.");
        }

        this.logger.info("Data clear operation completed successfully.");
    }
}
