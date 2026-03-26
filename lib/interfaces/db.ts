import { LocalStorageInterface, StorageType } from "./localstorage";
import * as idb from "@/lib/idb";
import { TornTrade, Weav3rReceipt } from "../game/trade";
import { TornItemLog } from "../game/itemLog";

interface LogStats {
    totalCost: number;
    totalQuantity: number;
}

type LogSource =
    | "item-market"
    | "bazaar"
    | "points-market"
    | "museum"
    | "attack";

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

const CURR_TRANSACTION_VERSION = 2;

export type TransactionType = "log" | "trade" | "receipt" | "general-wrapper";
export type TransactionData = TornTrade | Weav3rReceipt | TornItemLog | any;

export class BaseTransaction {
    id: string;
    version: number;
    timestamp: number;
    data: TransactionData;
    groupID?: string;

    constructor(
        id: string,
        version: number = CURR_TRANSACTION_VERSION,
        timestamp: number,
        data: TransactionData,
        groupID?: string,
    ) {
        this.id = id;
        this.version = version;
        this.timestamp = timestamp;
        this.data = data;
        this.groupID = groupID;
    }

    isTrade(): boolean {
        return this.data instanceof TornTrade;
    }
    isReceipt(): boolean {
        return this.data instanceof Weav3rReceipt;
    }
    isItemLog(): boolean {
        return this.data instanceof TornItemLog;
    }
}

export class BaseTransactionList {
    transactions: BaseTransaction[];
    lastTransactionPerItem: Record<number, TornItemLog>;

    constructor(
        transactions: BaseTransaction[],
        lastLogsPerItem?: Record<number, TornItemLog>,
    ) {
        this.transactions = transactions;
        this.lastTransactionPerItem = lastLogsPerItem || {};
    }

    push(transaction: BaseTransaction) {
        // Simply push the transaction if it's a trade or receipt.
        if (transaction.isTrade() || transaction.isReceipt()) {
            this.transactions.push(transaction);
            return;
        }

        // Item Push.
        const previousItemLog =
            this.lastTransactionPerItem[transaction.data.itemID] ?? null;

        transaction.data.updateStats(
            previousItemLog,
            transaction.data.normalAmt, // TODO: Normal stock is different, we need to save initial normal stock too.
            transaction.data.abroadAmt, // TODO: Same as above.
        );

        this.transactions.push(transaction);
        this.lastTransactionPerItem[transaction.data.itemID] = transaction.data;
    }
}

export class DBInterface {
    /**
     * Returns the raw logs from the database.
     */
    private async getRawLogs(): Promise<any[]> {
        // Get database type, ie "GoogleCacheLogsDB" or "LogsDB"
        const storageType: StorageType = LocalStorageInterface.getStorageType();

        // Get database name, ie "GoogleCacheLogsDB" or "LogsDB"
        const dbName =
            storageType === "browser" ? "LogsDB" : "GoogleCacheLogsDB";
        return idb.getAllTransactions<any>(dbName);
    }

    /**
     * Returns the logs from the database.
     */
    async getLogs(): Promise<StandardLog[]> {
        const rawLogs = await this.getRawLogs();

        // Convert raw logs to standard logs
        const logs = await Promise.all(
            rawLogs.map(async (log) => await this.convertLog(log)),
        );

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
                        log.data.items,
                    ),
            );
    }

    static async modifyLogs(logs: any[]): Promise<BaseTransactionList> {
        const transactions: BaseTransactionList = new BaseTransactionList(
            [],
        );
        for (const log of logs) {
            if (log.version && log.version === CURR_TRANSACTION_VERSION) {
                transactions.push(BaseTransaction.fromInterface(log));
                continue;
            }

            // TODO: Migrate old logs.
        }
        return transactions;
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
        return trades.map((tradeData: any) =>
            TornTrade.fromInterface(tradeData),
        );
    }

    static migrationSetTrades(trades: TornTrade[]) {
        LocalStorageInterface.setItem(
            "migration_trades",
            JSON.stringify(trades.map((trade) => trade.toInterface())),
        );
    }

    static migrationAddTrades(newTrades: TornTrade[]) {
        const currentTrades = this.migrationGetTrades();
        const allTrades = [...currentTrades, ...newTrades];
        this.migrationSetTrades(allTrades);
    }

    /**
     * Updates an existing trade in storage.
     * @param trade TornTrade: The trade to update.
     */
    static migrationUpdateTrade(trade: TornTrade): void {
        const currentTrades = this.migrationGetTrades();
        const updatedTrades = currentTrades.map((t) =>
            t.id === trade.id ? trade : t,
        );
        this.migrationSetTrades(updatedTrades);
    }

    static migrationGetReceipts(): Weav3rReceipt[] {
        const rawReceipts = LocalStorageInterface.getItem("migration_receipts");

        if (!rawReceipts) {
            return [];
        }
        const receipts = JSON.parse(rawReceipts);
        return receipts.map((receiptData: any) =>
            Weav3rReceipt.fromInterface(receiptData),
        );
    }

    static migrationSetReceipts(receipts: Weav3rReceipt[]) {
        LocalStorageInterface.setItem(
            "migration_receipts",
            JSON.stringify(receipts.map((receipt) => receipt.toInterface())),
        );
    }

    static migrationAddReceipts(newReceipts: Weav3rReceipt[]) {
        const currentReceipts = this.migrationGetReceipts();
        const allReceipts = [...currentReceipts, ...newReceipts];
        this.migrationSetReceipts(allReceipts);
    }

    /**
     * Updates an existing receipt in storage.
     * @param receipt Weav3rReceipt: The receipt to update.
     */
    static migrationUpdateReceipt(receipt: Weav3rReceipt): void {
        const currentReceipts = this.migrationGetReceipts();
        const updatedReceipts = currentReceipts.map((r) =>
            r.id === receipt.id ? receipt : r,
        );
        this.migrationSetReceipts(updatedReceipts);
    }
}
