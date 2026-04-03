import { LocalStorageInterface, StorageType } from "./localstorage";
import * as idb from "@/lib/idb";
import { TornTrade, Weav3rReceipt } from "../game/trade";
import { TornItemLog, TornItemSource } from "../game/itemLog";
import {
    AnyTrackedTransaction,
    BaseTransaction as NewBaseTransaction,
    Transaction as NewItemLogTransaction,
    TransactionBuilder as NewTransactionBuilder,
    TransactionSource,
    TransactionStockType as NewStockType,
    TRANSACTION_PAGE_SIZE,
} from "./transactions";

interface LogStats {
    totalCost: number;
    totalQuantity: number;
}

type LogSource = "item-market" | "bazaar" | "points-market" | "museum" | "attack";

type LogType = "buy" | "sell" | "mug" | "convert" | "set-convert";

export interface StandardLog {
    id: string;
    timestamp: number;
    itemID: number;
    amount: number;
    groupID: string;
    type: LogType;
    price?: number;
    source?: LogSource;
    title?: string;
    tornLogId?: string;
    stats?: LogStats;
}

export type TransactionType = "transaction" | "wrapper" | "trade" | "receipt";
export type TransactionData = TornTrade | Weav3rReceipt | TornItemLog | AnyTrackedTransaction | any;

export class DBInterface {
    /**
     * Returns the raw logs from the database.
     */
    private async getRawLogs(): Promise<any[]> {
        let cursor = 0;
        let allLogs: any[] = [];

        while (true) {
            const page = await this.getRawLogsPage(cursor);
            allLogs = [...allLogs, ...page.logs];

            if (page.nextCursor === null) {
                return allLogs;
            }

            cursor = page.nextCursor;
        }
    }

    /**
     * Returns a cursor-paginated page of raw logs from the database.
     */
    async getRawLogsPage(
        cursor: number = 0,
        limit: number = TRANSACTION_PAGE_SIZE
    ): Promise<{ logs: any[]; nextCursor: number | null }> {
        // Get database type, ie "GoogleCacheLogsDB" or "LogsDB"
        const storageType: StorageType = LocalStorageInterface.getStorageType();

        // Get database name, ie "GoogleCacheLogsDB" or "LogsDB"
        const dbName = storageType === "browser" ? "LogsDB" : "GoogleCacheLogsDB";
        return idb.getTransactionPage<any>(dbName, cursor, limit);
    }

    /**
     * Returns the logs from the database.
     */
    async getLogs(): Promise<StandardLog[]> {
        const rawLogs = await this.getRawLogs();

        // Convert raw logs to standard logs
        const logs = await Promise.all(rawLogs.map(async (log) => await this.convertLog(log)));

        return logs;
    }

    /**
     * Converts a raw log object into a standard log object.
     */
    async convertLog(log: any): Promise<StandardLog> {
        throw new Error("Not implemented");
    }

    async getTrades(): Promise<TornTrade[]> {
        const logs = await this.getRawLogs();
        return logs
            .filter((log) => log.type === "trade")
            .map(
                (log) =>
                    new TornTrade(
                        log.id,
                        log.tornLogId,
                        log.timestamp,
                        log.title,
                        log.data.user_id,
                        log.data.trader_id,
                        log.data.items
                    )
            );
    }

    /**
     * Migrates the old logs to the new format.
     * @returns Promise<TornTrade[]>: A promise that resolves when the migration is complete.
     */
    static migrationGetTrades(): TornTrade[] {
        const rawTrades = LocalStorageInterface.getItem("migration_trades");

        if (!rawTrades) {
            return [];
        }

        const trades = JSON.parse(rawTrades);
        return trades.map((tradeData: any) => TornTrade.fromInterface(tradeData));
    }

    static migrationSetTrades(trades: TornTrade[]) {
        LocalStorageInterface.setItem(
            "migration_trades",
            JSON.stringify(trades.map((trade) => trade.toInterface()))
        );
    }

    static migrationAddTrades(newTrades: TornTrade[]) {
        const currentTrades = this.migrationGetTrades();
        const tradeMap = new Map<string, TornTrade>();
        [...currentTrades, ...newTrades].forEach((trade) => {
            tradeMap.set(trade.id, trade);
        });
        const allTrades = Array.from(tradeMap.values());
        this.migrationSetTrades(allTrades);
    }

    /**
     * Updates an existing trade in storage.
     * @param trade TornTrade: The trade to update.
     */
    static migrationUpdateTrade(trade: TornTrade): void {
        const currentTrades = this.migrationGetTrades();
        const updatedTrades = currentTrades.map((t) => (t.id === trade.id ? trade : t));
        this.migrationSetTrades(updatedTrades);
    }

    static migrationGetReceipts(): Weav3rReceipt[] {
        const rawReceipts = LocalStorageInterface.getItem("migration_receipts");

        if (!rawReceipts) {
            return [];
        }
        const receipts = JSON.parse(rawReceipts);
        return receipts.map((receiptData: any) => Weav3rReceipt.fromInterface(receiptData));
    }

    static migrationSetReceipts(receipts: Weav3rReceipt[]) {
        LocalStorageInterface.setItem(
            "migration_receipts",
            JSON.stringify(receipts.map((receipt) => receipt.toInterface()))
        );
    }

    static migrationAddReceipts(newReceipts: Weav3rReceipt[]) {
        const currentReceipts = this.migrationGetReceipts();
        const receiptMap = new Map<string, Weav3rReceipt>();
        [...currentReceipts, ...newReceipts].forEach((receipt) => {
            receiptMap.set(receipt.id, receipt);
        });
        const allReceipts = Array.from(receiptMap.values());
        this.migrationSetReceipts(allReceipts);
    }

    /**
     * Updates an existing receipt in storage.
     * @param receipt Weav3rReceipt: The receipt to update.
     */
    static migrationUpdateReceipt(receipt: Weav3rReceipt): void {
        const currentReceipts = this.migrationGetReceipts();
        const updatedReceipts = currentReceipts.map((r) => (r.id === receipt.id ? receipt : r));
        this.migrationSetReceipts(updatedReceipts);
    }
}
