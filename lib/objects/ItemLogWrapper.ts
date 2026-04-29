import {
    BaseObject,
    BaseObjectRegistry,
    type BaseObjectDatabaseFields,
    type BaseObjectDatabaseRecord,
    type BaseObjectWriteRecord,
    requireBaseObjectDatabaseFields,
} from "./BaseObject";

export type ItemLogWrapperType =
    | "auto-convert"
    | "manual-convert"
    | "museum-exchange"
    | "trade-split";

export interface ItemLogWrapperCreateFields {
    timestamp: number;
    type: ItemLogWrapperType;
    description: string;
}

export interface ItemLogWrapperDatabaseRecord extends BaseObjectDatabaseRecord {
    type: ItemLogWrapperType;
    description: string;
}

export class ItemLogWrapper extends BaseObject {
    private static readonly CURRENT_VERSION = 1;

    public readonly type: ItemLogWrapperType;
    public readonly description: string;

    /**
     * Creates an item log wrapper with optional persisted metadata.
     * @param fields (ItemLogWrapperCreateFields): Wrapper data to store on the object
     * @param databaseFields (BaseObjectDatabaseFields | undefined): Persisted metadata required only during hydration
     * @returns (ItemLogWrapper): Item log wrapper instance
     * @sideEffects None
     */
    protected constructor(
        fields: ItemLogWrapperCreateFields,
        databaseFields?: BaseObjectDatabaseFields
    ) {
        super(fields.timestamp, ItemLogWrapper.CURRENT_VERSION, databaseFields);

        this.type = fields.type;
        this.description = fields.description;
    }

    /**
     * Creates a new item log wrapper for application use and auto-generates non-id persistence metadata.
     * @param fields (ItemLogWrapperCreateFields): Wrapper fields supplied by the caller
     * @returns (ItemLogWrapper): New item log wrapper with auto-generated `logged_at`
     * @sideEffects Reads the current time through the base constructor
     */
    public static create(fields: ItemLogWrapperCreateFields): ItemLogWrapper {
        return new ItemLogWrapper(fields);
    }

    /**
     * Hydrates an item log wrapper from a Dexie database record.
     * @param record (ItemLogWrapperDatabaseRecord): Persisted wrapper record
     * @returns (ItemLogWrapper): Hydrated wrapper with persisted metadata preserved
     * @throws Error if required persisted metadata is missing
     * @sideEffects None
     */
    public static fromDatabase(record: ItemLogWrapperDatabaseRecord): ItemLogWrapper {
        const databaseFields = requireBaseObjectDatabaseFields(record);

        return new ItemLogWrapper(
            {
                timestamp: record.timestamp,
                type: record.type,
                description: record.description,
            },
            databaseFields
        );
    }

    /**
     * Converts the wrapper into a Dexie-ready database record.
     * @returns (BaseObjectWriteRecord<ItemLogWrapperDatabaseRecord>): Persistable wrapper record
     * @sideEffects None
     */
    public toDatabaseRecord(): BaseObjectWriteRecord<ItemLogWrapperDatabaseRecord> {
        return {
            ...this.toBaseDatabaseRecord(),
            type: this.type,
            description: this.description,
        };
    }
}

export class ItemLogWrapperRegistry extends BaseObjectRegistry<
    ItemLogWrapper,
    ItemLogWrapperDatabaseRecord
> {
    /**
     * Creates a Dexie registry for item log wrapper persistence.
     * @returns (ItemLogWrapperRegistry): Configured item log wrapper registry
     * @sideEffects Creates or upgrades an IndexedDB schema definition in Dexie
     */
    constructor() {
        super(
            "BlackMarketLedgerObjectsDB",
            "item_log_wrappers",
            "++id,type,timestamp,logged_at,updated_at",
            (itemLogWrapper) => itemLogWrapper.toDatabaseRecord(),
            (record) => ItemLogWrapper.fromDatabase(record)
        );
    }
}
