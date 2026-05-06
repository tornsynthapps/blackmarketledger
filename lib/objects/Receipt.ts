import {
    BaseObject,
    BaseObjectRegistry,
    type BaseObjectDatabaseFields,
    type BaseObjectDatabaseRecord,
    type BaseObjectWriteRecord,
    requireBaseObjectDatabaseFields,
} from "./BaseObject";

export type ReceiptSource = "weav3r" | "tornexchange";

export interface ReceiptCreateFields {
    receipt_id_string: string;
    source: ReceiptSource;
    total_value: number;
    seller_id: number;
    created_at: number;
}

export interface ReceiptDatabaseRecord extends BaseObjectDatabaseRecord {
    receipt_id_string: string;
    source: ReceiptSource;
    total_value: number;
    seller_id: number;
    created_at: number;
}

export class Receipt extends BaseObject {
    private static readonly CURRENT_VERSION = 1;

    public readonly receipt_id_string: string;
    public readonly source: ReceiptSource;
    public readonly total_value: number;
    public readonly seller_id: number;
    public readonly created_at: number;

    /**
     * Creates a receipt with optional persisted metadata.
     * @param fields (ReceiptCreateFields): Receipt data to store on the object
     * @param databaseFields (BaseObjectDatabaseFields | undefined): Persisted metadata required only during hydration
     * @returns (Receipt): Receipt instance
     * @sideEffects None
     */
    protected constructor(fields: ReceiptCreateFields, databaseFields?: BaseObjectDatabaseFields) {
        // Use created_at as the base object timestamp
        super(fields.created_at, Receipt.CURRENT_VERSION, databaseFields);

        this.receipt_id_string = fields.receipt_id_string;
        this.source = fields.source;
        this.total_value = fields.total_value;
        this.seller_id = fields.seller_id;
        this.created_at = fields.created_at;
    }

    /**
     * Creates a new receipt for application use.
     * @param fields (ReceiptCreateFields): Receipt fields supplied by the caller
     * @returns (Receipt): New receipt
     */
    public static create(fields: ReceiptCreateFields): Receipt {
        return new Receipt(fields);
    }

    /**
     * Hydrates a receipt from a Dexie database record.
     * @param record (ReceiptDatabaseRecord): Persisted receipt record
     * @returns (Receipt): Hydrated receipt
     */
    public static fromDatabase(record: ReceiptDatabaseRecord): Receipt {
        const databaseFields = requireBaseObjectDatabaseFields(record);

        return new Receipt(
            {
                receipt_id_string: record.receipt_id_string,
                source: record.source,
                total_value: record.total_value,
                seller_id: record.seller_id,
                created_at: record.created_at,
            },
            databaseFields
        );
    }

    /**
     * Converts the receipt into a Dexie-ready database record.
     * @returns (BaseObjectWriteRecord<ReceiptDatabaseRecord>): Persistable receipt record
     */
    public toDatabaseRecord(): BaseObjectWriteRecord<ReceiptDatabaseRecord> {
        return {
            ...this.toBaseDatabaseRecord(),
            receipt_id_string: this.receipt_id_string,
            source: this.source,
            total_value: this.total_value,
            seller_id: this.seller_id,
            created_at: this.created_at,
        };
    }
}

export class ReceiptRegistry extends BaseObjectRegistry<Receipt, ReceiptDatabaseRecord> {
    /**
     * Creates a Dexie registry for receipt persistence.
     * @returns (ReceiptRegistry): Configured receipt registry
     */
    constructor() {
        super(
            "BlackMarketLedgerObjectsDB",
            "receipts",
            "++id,receipt_id_string,source,created_at,seller_id",
            (receipt) => receipt.toDatabaseRecord(),
            (record) => Receipt.fromDatabase(record)
        );
    }

    /**
     * Fetches a receipt by its source-specific ID string.
     * @param receiptIdString (string): The identifier from the external source
     * @param source (ReceiptSource): The source of the receipt
     * @returns (Promise<Receipt | undefined>): The receipt if found
     */
    public async getBySourceId(receiptIdString: string, source: ReceiptSource): Promise<Receipt | undefined> {
        const record = await this.tableRef
            .where("receipt_id_string")
            .equals(receiptIdString)
            .and(r => r.source === source)
            .first();
        return record ? Receipt.fromDatabase(record) : undefined;
    }
}