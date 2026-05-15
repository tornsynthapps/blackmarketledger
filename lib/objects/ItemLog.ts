import Dexie from "dexie";
import {
    BaseObject,
    BaseObjectRegistry,
    type BaseObjectDatabaseFields,
    type BaseObjectDatabaseRecord,
    type BaseObjectWriteRecord,
    requireBaseObjectDatabaseFields,
} from "./BaseObject";

export interface ItemLogCreateFields {
    timestamp: number;
    item_id: number;
    quantity: number;
    unit_price: number;
    category: string;
    wrapper_id?: number | null;
    total_stock?: number;
    total_cost?: number;
    realized_profit?: number;
    torn_log_id?: string | null;
}

export type ItemLogCategories = "normal" | "abroad" | "museum" | "city-finds" | "city-shop" | "crimes" | "skipped";

export interface ItemLogDatabaseRecord extends BaseObjectDatabaseRecord {
    item_id: number;
    quantity: number;
    unit_price: number;
    category: string;
    wrapper_id: number | null;
    total_stock: number;
    total_cost: number;
    realized_profit: number;
    torn_log_id: string | null;
}

export class ItemLog extends BaseObject {
    private static readonly CURRENT_VERSION = 6;

    public readonly item_id: number;
    public readonly quantity: number;
    public readonly unit_price: number;
    public readonly category: string;
    public readonly wrapper_id: number | null;
    public readonly total_stock: number;
    public readonly total_cost: number;
    public readonly realized_profit: number;
    public readonly torn_log_id: string | null;

    /**
     * Creates an item log with optional persisted metadata.
     * @param fields (ItemLogCreateFields): Item log data to store on the object
     * @param databaseFields (BaseObjectDatabaseFields | undefined): Persisted metadata required only during hydration
     * @returns (ItemLog): Item log instance
     * @sideEffects None
     */
    protected constructor(fields: ItemLogCreateFields, databaseFields?: BaseObjectDatabaseFields) {
        super(fields.timestamp, ItemLog.CURRENT_VERSION, databaseFields);

        this.item_id = fields.item_id;
        this.quantity = fields.quantity;
        this.unit_price = fields.unit_price;
        this.category = fields.category;
        this.wrapper_id = fields.wrapper_id ?? null;
        this.total_stock = fields.total_stock ?? 0;
        this.total_cost = fields.total_cost ?? 0;
        this.realized_profit = fields.realized_profit ?? 0;
        this.torn_log_id = fields.torn_log_id ?? null;
    }

    /**
     * Creates a new item log for application use and auto-generates non-id persistence metadata.
     * @param fields (ItemLogCreateFields): Item log fields supplied by the caller
     * @returns (ItemLog): New item log with auto-generated `logged_at`
     * @sideEffects Reads the current time through the base constructor
     */
    public static create(fields: ItemLogCreateFields): ItemLog {
        return new ItemLog(fields);
    }

    /**
     * Hydrates an item log from a Dexie database record.
     * @param record (ItemLogDatabaseRecord): Persisted item log record
     * @returns (ItemLog): Hydrated item log with persisted metadata preserved
     * @throws Error if required persisted metadata is missing
     * @sideEffects None
     */
    public static fromDatabase(record: ItemLogDatabaseRecord): ItemLog {
        const databaseFields = requireBaseObjectDatabaseFields(record);

        return new ItemLog(
            {
                timestamp: record.timestamp,
                item_id: record.item_id,
                quantity: record.quantity,
                unit_price: record.unit_price,
                category: record.category,
                wrapper_id: record.wrapper_id,
                total_stock: record.total_stock,
                total_cost: record.total_cost,
                realized_profit: record.realized_profit,
                torn_log_id: record.torn_log_id,
            },
            databaseFields
        );
    }

    /**
     * Converts the item log into a Dexie-ready database record.
     * @returns (BaseObjectWriteRecord<ItemLogDatabaseRecord>): Persistable item log record
     * @sideEffects None
     */
    public toDatabaseRecord(): BaseObjectWriteRecord<ItemLogDatabaseRecord> {
        return {
            ...this.toBaseDatabaseRecord(),
            item_id: this.item_id,
            quantity: this.quantity,
            unit_price: this.unit_price,
            category: this.category,
            wrapper_id: this.wrapper_id,
            total_stock: this.total_stock,
            total_cost: this.total_cost,
            realized_profit: this.realized_profit,
            torn_log_id: this.torn_log_id,
        };
    }

    /**
     * Creates a copy of the current item log with updated cumulative totals and optional field overrides.
     * @param totalStock (number): New cumulative stock value
     * @param totalCost (number): New cumulative cost value
     * @param overrides (Partial<ItemLogCreateFields>): Optional fields to override in the new instance
     * @returns (ItemLog): New item log instance with updated totals and preserved metadata
     * @sideEffects None
     */
    public withTotals(
        totalStock: number,
        totalCost: number,
        overrides?: Partial<ItemLogCreateFields>
    ): ItemLog {
        return new ItemLog(
            {
                timestamp: this.timestamp,
                item_id: this.item_id,
                quantity: this.quantity,
                unit_price: this.unit_price,
                category: this.category,
                wrapper_id: this.wrapper_id,
                realized_profit: this.realized_profit,
                torn_log_id: this.torn_log_id,
                ...overrides,
                total_stock: totalStock,
                total_cost: totalCost,
            },
            {
                id: this.id!,
                logged_at: this.logged_at,
                updated_at: this.updated_at,
            }
        );
    }
}

export class ItemLogRegistry extends BaseObjectRegistry<ItemLog, ItemLogDatabaseRecord> {
    /**
     * Creates a Dexie registry for item log persistence.
     * @returns (ItemLogRegistry): Configured item log registry
     * @sideEffects Creates or upgrades an IndexedDB schema definition in Dexie
     */
    constructor() {
        super(
            "BlackMarketLedgerObjectsDB",
            "item_logs",
            "++id,item_id,timestamp,category,wrapper_id,logged_at,updated_at,realized_profit,torn_log_id,[item_id+category+timestamp]",
            (itemLog) => itemLog.toDatabaseRecord(),
            (record) => ItemLog.fromDatabase(record)
        );
    }

    /**
     * Fetches Every record in the table and hydrates them into domain objects.
     * @returns (Promise<ItemLog[]>): All stored objects for the registry table
     * @sideEffects Reads from IndexedDB through Dexie
     */
    public override async getAll(): Promise<ItemLog[]> {
        const records = await this.tableRef.orderBy("timestamp").reverse().toArray();
        return records.map((record) => ItemLog.fromDatabase(record));
    }

    /**
     * Retrieves a paginated slice of logs, optionally filtered by category, item name, and date range.
     * @param offset (number): Records to skip
     * @param limit (number): Max records to return
     * @param category (string | null): Optional category filter
     * @param searchQuery (string | null): Optional item name search (partial)
     * @param itemMap (Record<number, string>): Map of item ID to name for searching
     * @param startDate (number | null): Optional starting timestamp (ms)
     * @param endDate (number | null): Optional ending timestamp (ms)
     * @returns (Promise<ItemLog[]>): Hydrated logs
     */
    public async getPaginatedLogs(
        offset: number,
        limit: number,
        category: string | null = null,
        searchQuery: string | null = null,
        itemMap: Record<number, string> = {},
        startDate: number | null = null,
        endDate: number | null = null
    ): Promise<ItemLog[]> {
        let collection = this.tableRef.orderBy("timestamp").reverse();

        if (category && category !== "all") {
            collection = this.tableRef.where("category").equals(category).reverse();
        }

        // Apply date range filters if present
        if (startDate || endDate) {
            const start = startDate ?? 0;
            const end = endDate ? (endDate + 24 * 60 * 60 * 1000 - 1) : Date.now();
            
            // If we are already filtering by category, we must continue filtering the collection
            // because IndexedDB doesn't support multiple where clauses easily without compound indexes
            collection = collection.filter(r => r.timestamp >= start && r.timestamp <= end);
        }
        
        const filteredRecords: ItemLogDatabaseRecord[] = [];
        let skipped = 0;

        await collection.until(() => filteredRecords.length === limit).each(record => {
            const matchesCategory = !category || category === "all" || record.category === category;
            const matchesSearch = !searchQuery || (itemMap[record.item_id]?.toLowerCase() || "").includes(searchQuery.toLowerCase());

            if (matchesCategory && matchesSearch) {
                if (skipped >= offset) {
                    filteredRecords.push(record);
                } else {
                    skipped++;
                }
            }
        });

        return filteredRecords.map(r => ItemLog.fromDatabase(r));
    }

    /**
     * Returns the total count of logs matching the filters.
     */
    public async countLogs(
        category: string | null = null,
        searchQuery: string | null = null,
        itemMap: Record<number, string> = {},
        startDate: number | null = null,
        endDate: number | null = null
    ): Promise<number> {
        let collection = category && category !== "all" 
            ? this.tableRef.where("category").equals(category)
            : this.tableRef.toCollection();

        if (startDate || endDate) {
            const start = startDate ?? 0;
            const end = endDate ? (endDate + 24 * 60 * 60 * 1000 - 1) : Date.now();
            collection = collection.filter(r => r.timestamp >= start && r.timestamp <= end);
        }

        if (searchQuery) {
            let count = 0;
            const query = searchQuery.toLowerCase();
            await collection.each(record => {
                if ((itemMap[record.item_id]?.toLowerCase() || "").includes(query)) {
                    count++;
                }
            });
            return count;
        }

        return await collection.count();
    }

    /**
     * Fetches a log by its Torn API log ID.
     * @param tornLogId (string): The Torn log ID
     * @returns (Promise<ItemLog | undefined>): The found log or undefined
     */
    public async getByTornLogId(tornLogId: string): Promise<ItemLog | undefined> {
        const record = await this.tableRef.where("torn_log_id").equals(tornLogId).first();
        return record ? ItemLog.fromDatabase(record) : undefined;
    }

    /**
     * Fetches all item logs for a specific item, ordered by timestamp.
     * @param itemId (number): Unique identifier of the item
     * @returns (Promise<ItemLog[]>): Sorted array of item logs
     * @sideEffects Reads from IndexedDB through Dexie
     */
    public async getLogsByItemId(itemId: number): Promise<ItemLog[]> {
        const records = await this.tableRef.where("item_id").equals(itemId).sortBy("timestamp");

        return records.map((record) => ItemLog.fromDatabase(record));
    }

    /**
     * Fetches all item logs associated with a specific wrapper.
     * @param wrapperId (number): Unique identifier of the wrapper
     * @returns (Promise<ItemLog[]>): Array of item logs linked to the wrapper
     * @sideEffects Reads from IndexedDB through Dexie
     */
    public async getLogsByWrapperId(wrapperId: number): Promise<ItemLog[]> {
        const records = await this.tableRef.where("wrapper_id").equals(wrapperId).toArray();

        return records.map((record) => ItemLog.fromDatabase(record));
    }

    /**
     * Retrieves the latest running totals for each category before a given timestamp.
     * @param itemId (number): Unique identifier of the item
     * @param timestamp (number): The threshold timestamp
     * @returns (Promise<Map<string, { stock: number; cost: number }>>): Mapping of category to its latest totals
     * @sideEffects Reads from IndexedDB through Dexie
     */
    public async getLatestTotalsPerCategoryBefore(
        itemId: number,
        timestamp: number
    ): Promise<Map<string, { stock: number; cost: number }>> {
        const categories = ["normal", "abroad", "museum", "city-finds", "city-shop", "crimes", "skipped"];
        const result = new Map<string, { stock: number; cost: number }>();

        // Initialize with zeros
        categories.forEach((cat) => result.set(cat, { stock: 0, cost: 0 }));

        // Safety: Ensure keys are valid for IndexedDB to prevent DataError
        if (!Number.isFinite(itemId) || !Number.isFinite(timestamp)) {
            console.error(`Invalid keys provided to getLatestTotalsPerCategoryBefore: itemId=${itemId}, timestamp=${timestamp}`);
            return result;
        }

        for (const category of categories) {
            const latestRecord = await this.tableRef
                .where("[item_id+category+timestamp]")
                .between([itemId, category, Dexie.minKey], [itemId, category, timestamp], true, false)
                .reverse()
                .first();

            if (latestRecord) {
                result.set(category, { stock: latestRecord.total_stock, cost: latestRecord.total_cost });
            }
        }

        return result;
    }
}
