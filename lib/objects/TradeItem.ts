import {
    BaseObject,
    BaseObjectRegistry,
    type BaseObjectDatabaseFields,
    type BaseObjectDatabaseRecord,
    type BaseObjectWriteRecord,
    requireBaseObjectDatabaseFields,
} from "./BaseObject";

export interface TradeItemCreateFields {
    trade_db_id: number;
    type: string;
    item_id: number | null;
    quantity: number;
    user_id: number;
}

export interface TradeItemDatabaseRecord extends BaseObjectDatabaseRecord {
    trade_db_id: number;
    type: string;
    item_id: number | null;
    quantity: number;
    user_id: number;
}

export class TradeItem extends BaseObject {
    private static readonly CURRENT_VERSION = 1;

    public readonly trade_db_id: number;
    public readonly type: string;
    public readonly item_id: number | null;
    public readonly quantity: number;
    public readonly user_id: number;

    /**
     * Creates a trade item with optional persisted metadata.
     * @param fields (TradeItemCreateFields): Trade item data to store on the object
     * @param databaseFields (BaseObjectDatabaseFields | undefined): Persisted metadata required only during hydration
     * @returns (TradeItem): Trade item instance
     * @sideEffects None
     */
    protected constructor(fields: TradeItemCreateFields, databaseFields?: BaseObjectDatabaseFields) {
        // Use a default timestamp of 0 as trade items are linked to a Trade which has the timestamp
        super(0, TradeItem.CURRENT_VERSION, databaseFields);

        this.trade_db_id = fields.trade_db_id;
        this.type = fields.type;
        this.item_id = fields.item_id;
        this.quantity = fields.quantity;
        this.user_id = fields.user_id;
    }

    /**
     * Creates a new trade item for application use.
     * @param fields (TradeItemCreateFields): Trade item fields supplied by the caller
     * @returns (TradeItem): New trade item
     */
    public static create(fields: TradeItemCreateFields): TradeItem {
        return new TradeItem(fields);
    }

    /**
     * Hydrates a trade item from a Dexie database record.
     * @param record (TradeItemDatabaseRecord): Persisted trade item record
     * @returns (TradeItem): Hydrated trade item
     */
    public static fromDatabase(record: TradeItemDatabaseRecord): TradeItem {
        const databaseFields = requireBaseObjectDatabaseFields(record);

        return new TradeItem(
            {
                trade_db_id: record.trade_db_id,
                type: record.type,
                item_id: record.item_id,
                quantity: record.quantity,
                user_id: record.user_id,
            },
            databaseFields
        );
    }

    /**
     * Converts the trade item into a Dexie-ready database record.
     * @returns (BaseObjectWriteRecord<TradeItemDatabaseRecord>): Persistable trade item record
     */
    public toDatabaseRecord(): BaseObjectWriteRecord<TradeItemDatabaseRecord> {
        return {
            ...this.toBaseDatabaseRecord(),
            trade_db_id: this.trade_db_id,
            type: this.type,
            item_id: this.item_id,
            quantity: this.quantity,
            user_id: this.user_id,
        };
    }
}

export class TradeItemRegistry extends BaseObjectRegistry<TradeItem, TradeItemDatabaseRecord> {
    /**
     * Creates a Dexie registry for trade item persistence.
     * @returns (TradeItemRegistry): Configured trade item registry
     */
    constructor() {
        super(
            "BlackMarketLedgerObjectsDB",
            "trade_items",
            "++id,trade_db_id,item_id,type",
            (item) => item.toDatabaseRecord(),
            (record) => TradeItem.fromDatabase(record)
        );
    }

    /**
     * Fetches all items for a specific trade.
     * @param tradeDbId (number): Unique identifier of the trade in the database
     * @returns (Promise<TradeItem[]>): Array of items linked to the trade
     */
    public async getItemsByTradeId(tradeDbId: number): Promise<TradeItem[]> {
        const records = await this.tableRef.where("trade_db_id").equals(tradeDbId).toArray();

        return records.map((record) => TradeItem.fromDatabase(record));
    }
}