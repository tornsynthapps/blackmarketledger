import {
    BaseObject,
    BaseObjectRegistry,
    type BaseObjectDatabaseFields,
    type BaseObjectDatabaseRecord,
    type BaseObjectWriteRecord,
    requireBaseObjectDatabaseFields,
} from "./BaseObject";

export type ItemLogWrapperType =
    // "auto-split": Splits the item log into multiple logs across categories
    // when selling more quantity than the amount available in the current
    // category.
    | "auto-split"
    // "manual-transfer": Transfers the item from one category to another.
    // Used to convert abroad and city-finds into normal.
    | "manual-transfer"
    // "museum-exchange": Exchanges one or more items for points in the museum.
    // Has sub-type to indicate set of items to exchange.
    | "museum-exchange";

export type ItemLogWrapperSubType =
    // Museum Exchange
    | "plushie-set"
    | "exotic-flower-set"
    | "meteorite-fragment"
    | "patagonian-fossil"
    | "arrowhead-set"
    | "medieval-coin-set"
    | "vairocana-buddha"
    | "ganesha-sculpture"
    | "shabti-sculpture"
    | "companion-scripts"
    | "senet-game-set"
    | "egyptian-amulet";

export interface ItemLogWrapperCreateFields {
    timestamp: number;
    type: ItemLogWrapperType;
    description: string;
    sub_type?: ItemLogWrapperSubType | null;
}

export interface ItemLogWrapperDatabaseRecord extends BaseObjectDatabaseRecord {
    type: ItemLogWrapperType;
    description: string;
    sub_type?: ItemLogWrapperSubType | null;
}

export class ItemLogWrapper extends BaseObject {
    private static readonly CURRENT_VERSION = 2;

    public readonly type: ItemLogWrapperType;
    public readonly description: string;
    public readonly sub_type: ItemLogWrapperSubType | null;

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
        this.sub_type = fields.sub_type ?? null;
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
                sub_type: (record.sub_type as ItemLogWrapperSubType) ?? null,
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
            sub_type: this.sub_type,
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
