import {
    BaseObject,
    BaseObjectRegistry,
    type BaseObjectDatabaseFields,
    type BaseObjectDatabaseRecord,
    type BaseObjectWriteRecord,
    requireBaseObjectDatabaseFields,
} from "./BaseObject";

export interface ReceiptItemCreateFields {
    receipt_db_id: number;
    item_id: number;
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
}

export interface ReceiptItemDatabaseRecord extends BaseObjectDatabaseRecord {
    receipt_db_id: number;
    item_id: number;
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
}

export class ReceiptItem extends BaseObject {
    private static readonly CURRENT_VERSION = 1;

    public readonly receipt_db_id: number;
    public readonly item_id: number;
    public readonly name: string;
    public readonly quantity: number;
    public readonly price: number;
    public readonly subtotal: number;

    /**
     * Creates a receipt item with optional persisted metadata.
     * @param fields (ReceiptItemCreateFields): Receipt item data to store on the object
     * @param databaseFields (BaseObjectDatabaseFields | undefined): Persisted metadata required only during hydration
     * @returns (ReceiptItem): Receipt item instance
     * @sideEffects None
     */
    protected constructor(fields: ReceiptItemCreateFields, databaseFields?: BaseObjectDatabaseFields) {
        // Linked to Receipt, timestamp 0 is fine
        super(0, ReceiptItem.CURRENT_VERSION, databaseFields);

        this.receipt_db_id = fields.receipt_db_id;
        this.item_id = fields.item_id;
        this.name = fields.name;
        this.quantity = fields.quantity;
        this.price = fields.price;
        this.subtotal = fields.subtotal;
    }

    /**
     * Creates a new receipt item for application use.
     * @param fields (ReceiptItemCreateFields): Receipt item fields supplied by the caller
     * @returns (ReceiptItem): New receipt item
     */
    public static create(fields: ReceiptItemCreateFields): ReceiptItem {
        return new ReceiptItem(fields);
    }

    /**
     * Hydrates a receipt item from a Dexie database record.
     * @param record (ReceiptItemDatabaseRecord): Persisted receipt item record
     * @returns (ReceiptItem): Hydrated receipt item
     */
    public static fromDatabase(record: ReceiptItemDatabaseRecord): ReceiptItem {
        const databaseFields = requireBaseObjectDatabaseFields(record);

        return new ReceiptItem(
            {
                receipt_db_id: record.receipt_db_id,
                item_id: record.item_id,
                name: record.name,
                quantity: record.quantity,
                price: record.price,
                subtotal: record.subtotal,
            },
            databaseFields
        );
    }

    /**
     * Converts the receipt item into a Dexie-ready database record.
     * @returns (BaseObjectWriteRecord<ReceiptItemDatabaseRecord>): Persistable receipt item record
     */
    public toDatabaseRecord(): BaseObjectWriteRecord<ReceiptItemDatabaseRecord> {
        return {
            ...this.toBaseDatabaseRecord(),
            receipt_db_id: this.receipt_db_id,
            item_id: this.item_id,
            name: this.name,
            quantity: this.quantity,
            price: this.price,
            subtotal: this.subtotal,
        };
    }
}

export class ReceiptItemRegistry extends BaseObjectRegistry<ReceiptItem, ReceiptItemDatabaseRecord> {
    /**
     * Creates a Dexie registry for receipt item persistence.
     * @returns (ReceiptItemRegistry): Configured receipt item registry
     */
    constructor() {
        super(
            "BlackMarketLedgerObjectsDB",
            "receipt_items",
            "++id,receipt_db_id,item_id",
            (item) => item.toDatabaseRecord(),
            (record) => ReceiptItem.fromDatabase(record)
        );
    }

    /**
     * Fetches all items for a specific receipt.
     * @param receiptDbId (number): Unique identifier of the receipt in the database
     * @returns (Promise<ReceiptItem[]>): Array of items linked to the receipt
     */
    public async getItemsByReceiptId(receiptDbId: number): Promise<ReceiptItem[]> {
        const records = await this.tableRef.where("receipt_db_id").equals(receiptDbId).toArray();

        return records.map((record) => ReceiptItem.fromDatabase(record));
    }
}