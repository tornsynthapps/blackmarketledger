import {
    BaseObject,
    BaseObjectRegistry,
    type BaseObjectDatabaseFields,
    type BaseObjectDatabaseRecord,
    type BaseObjectWriteRecord,
    requireBaseObjectDatabaseFields,
} from "./BaseObject";

export type TradeType = "buy" | "sell" | "others";
export type TradeSyncStatus = "pending_details" | "complete";

export interface TradeCreateFields {
    timestamp: number;
    type: TradeType;
    wrapper_id?: number | null;
    receipt_id?: number | null;
    torn_id: number;
    user_id: number;
    sync_status?: TradeSyncStatus;
}

export interface TradeDatabaseRecord extends BaseObjectDatabaseRecord {
    type: TradeType;
    wrapper_id: number | null;
    receipt_id: number | null;
    torn_id: number;
    user_id: number;
    sync_status: TradeSyncStatus;
}

export class Trade extends BaseObject {
    private static readonly CURRENT_VERSION = 3;

    public readonly type: TradeType;
    public readonly wrapper_id: number | null;
    public readonly receipt_id: number | null;
    public readonly torn_id: number;
    public readonly user_id: number;
    public readonly sync_status: TradeSyncStatus;

    /**
     * Creates a trade with optional persisted metadata.
     * @param fields (TradeCreateFields): Trade data to store on the object
     * @param databaseFields (BaseObjectDatabaseFields | undefined): Persisted metadata required only during hydration
     * @returns (Trade): Trade instance
     * @sideEffects None
     */
    protected constructor(fields: TradeCreateFields, databaseFields?: BaseObjectDatabaseFields) {
        super(fields.timestamp, Trade.CURRENT_VERSION, databaseFields);

        this.type = fields.type;
        this.wrapper_id = fields.wrapper_id ?? null;
        this.receipt_id = fields.receipt_id ?? null;
        this.torn_id = fields.torn_id;
        this.user_id = fields.user_id;
        this.sync_status = fields.sync_status ?? "complete";
    }

    /**
     * Creates a new trade for application use.
     * @param fields (TradeCreateFields): Trade fields supplied by the caller
     * @returns (Trade): New trade
     */
    public static create(fields: TradeCreateFields): Trade {
        return new Trade(fields);
    }

    /**
     * Hydrates a trade from a Dexie database record.
     * @param record (TradeDatabaseRecord): Persisted trade record
     * @returns (Trade): Hydrated trade
     */
    public static fromDatabase(record: TradeDatabaseRecord): Trade {
        const databaseFields = requireBaseObjectDatabaseFields(record);

        return new Trade(
            {
                timestamp: record.timestamp,
                type: record.type,
                wrapper_id: record.wrapper_id,
                receipt_id: record.receipt_id,
                torn_id: record.torn_id,
                user_id: record.user_id,
                sync_status: record.sync_status,
            },
            databaseFields
        );
    }

    /**
     * Converts the trade into a Dexie-ready database record.
     * @returns (BaseObjectWriteRecord<TradeDatabaseRecord>): Persistable trade record
     */
    public toDatabaseRecord(): BaseObjectWriteRecord<TradeDatabaseRecord> {
        return {
            ...this.toBaseDatabaseRecord(),
            type: this.type,
            wrapper_id: this.wrapper_id,
            receipt_id: this.receipt_id,
            torn_id: this.torn_id,
            user_id: this.user_id,
            sync_status: this.sync_status,
        };
    }
}

export class TradeRegistry extends BaseObjectRegistry<Trade, TradeDatabaseRecord> {
    /**
     * Creates a Dexie registry for trade persistence.
     * @returns (TradeRegistry): Configured trade registry
     */
    constructor() {
        super(
            "BlackMarketLedgerObjectsDB",
            "trades",
            "++id,timestamp,type,wrapper_id,receipt_id,torn_id,user_id,sync_status",
            (trade) => trade.toDatabaseRecord(),
            (record) => Trade.fromDatabase(record)
        );
    }

    /**
     * Fetches all trades for a specific user, ordered by timestamp.
     * @param userId (number): Unique identifier of the user
     * @returns (Promise<Trade[]>): Sorted array of trades
     */
    public async getTradesByUserId(userId: number): Promise<Trade[]> {
        const records = await this.tableRef.where("user_id").equals(userId).sortBy("timestamp");

        return records.map((record) => Trade.fromDatabase(record));
    }

    /**
     * Fetches all trades associated with a specific wrapper.
     * @param wrapperId (number): Unique identifier of the wrapper
     * @returns (Promise<Trade[]>): Array of trades linked to the wrapper
     */
    public async getTradesByWrapperId(wrapperId: number): Promise<Trade[]> {
        const records = await this.tableRef.where("wrapper_id").equals(wrapperId).toArray();

        return records.map((record) => Trade.fromDatabase(record));
    }

    /**
     * Fetches a trade by its Torn ID.
     * @param tornId (number): The Torn API identifier for the trade
     * @returns (Promise<Trade | undefined>): The trade if found
     */
    public async getByTornId(tornId: number): Promise<Trade | undefined> {
        const record = await this.tableRef.where("torn_id").equals(tornId).first();
        return record ? Trade.fromDatabase(record) : undefined;
    }
}
