import Dexie, { type Table } from "dexie";

export interface BaseObjectDatabaseFields {
    id: number;
    logged_at: number;
    updated_at: number;
}

export interface BaseObjectDatabaseRecord extends BaseObjectDatabaseFields {
    timestamp: number;
    version: number;
}

export type BaseObjectWriteRecord<TRecord extends BaseObjectDatabaseRecord> = Omit<TRecord, "id"> & {
    id?: number;
};

export type BaseObjectSerializer<TObject extends BaseObject, TRecord extends BaseObjectDatabaseRecord> = (
    object: TObject
) => BaseObjectWriteRecord<TRecord>;

export type BaseObjectHydrator<TObject extends BaseObject, TRecord extends BaseObjectDatabaseRecord> = (
    record: TRecord
) => TObject;

interface BaseObjectResolvedDatabaseFields {
    id?: number;
    logged_at: number;
    updated_at: number;
}

export abstract class BaseObject {
    public id?: number;
    public readonly timestamp: number;
    public readonly logged_at: number;
    public updated_at: number;
    public readonly version: number;

    /**
     * Creates a base object with persisted metadata.
     * @param timestamp (number): Domain timestamp associated with the object
     * @param version (number): Schema version stored with the object
     * @param databaseFields (BaseObjectDatabaseFields | undefined): Persisted fields when hydrating from storage
     * @returns (BaseObject): A base object instance with stable persistence metadata
     * @sideEffects None
     */
    protected constructor(timestamp: number, version: number, databaseFields?: BaseObjectDatabaseFields) {
        const resolvedDatabaseFields = BaseObject.resolveDatabaseFields(databaseFields);

        this.id = resolvedDatabaseFields.id;
        this.timestamp = timestamp;
        this.logged_at = resolvedDatabaseFields.logged_at;
        this.updated_at = resolvedDatabaseFields.updated_at;
        this.version = version;
    }

    /**
     * Converts the shared persisted fields into a Dexie-ready record fragment.
     * @returns (BaseObjectWriteRecord<BaseObjectDatabaseRecord>): Shared database fields for the current object
     * @sideEffects None
     */
    protected toBaseDatabaseRecord(): BaseObjectWriteRecord<BaseObjectDatabaseRecord> {
        const baseRecord: BaseObjectWriteRecord<BaseObjectDatabaseRecord> = {
            timestamp: this.timestamp,
            logged_at: this.logged_at,
            updated_at: this.updated_at,
            version: this.version,
        };

        if (this.id !== undefined) {
            baseRecord.id = this.id;
        }

        return baseRecord;
    }

    /**
     * Stores the persisted Dexie identifier on the current object after insertion.
     * @param id (number): Identifier generated or returned by Dexie
     * @returns (void)
     * @sideEffects Mutates the current object
     */
    public applyPersistedId(id: number): void {
        this.id = id;
    }

    /**
     * Updates the updated_at timestamp to the current time.
     * @returns (void)
     * @sideEffects Mutates the current object
     */
    public refreshUpdatedAt(): void {
        this.updated_at = Date.now();
    }

    /**
     * Resolves the database fields for either a new object or a hydrated object.
     * @param databaseFields (BaseObjectDatabaseFields | undefined): Persisted metadata when hydrating from storage
     * @returns (BaseObjectResolvedDatabaseFields): Metadata to assign to the object
     * @sideEffects Reads the current time for newly created objects
     */
    private static resolveDatabaseFields(
        databaseFields?: BaseObjectDatabaseFields
    ): BaseObjectResolvedDatabaseFields {
        if (!databaseFields) {
            return BaseObject.createDatabaseFieldsForNewObject();
        }

        return databaseFields;
    }

    /**
     * Creates generated database fields for a newly created object.
     * @returns (BaseObjectResolvedDatabaseFields): Generated metadata for a new object
     * @sideEffects Reads the current time
     */
    private static createDatabaseFieldsForNewObject(): BaseObjectResolvedDatabaseFields {
        const now = Date.now();
        return {
            logged_at: now,
            updated_at: now,
        };
    }
}

/**
 * Ensures persisted base fields are present when hydrating an object from Dexie.
 * @param record (Partial<BaseObjectDatabaseFields>): Raw persisted metadata to validate
 * @returns (BaseObjectDatabaseFields): Validated database fields
 * @throws Error if `id`, `logged_at` or `updated_at` is missing
 * @sideEffects None
 */
export function requireBaseObjectDatabaseFields(
    record: Partial<BaseObjectDatabaseFields>
): BaseObjectDatabaseFields {
    if (record.id === undefined) {
        throw new Error("Base object database record is missing id.");
    }

    if (record.logged_at === undefined) {
        throw new Error("Base object database record is missing logged_at.");
    }

    if (record.updated_at === undefined) {
        throw new Error("Base object database record is missing updated_at.");
    }

    return {
        id: record.id,
        logged_at: record.logged_at,
        updated_at: record.updated_at,
    };
}

// Global registry of all Dexie schemas to prevent dynamic overwrites and data wipes.
// Dexie requires all tables to be defined in a single .stores() call before opening.
export const SCHEMA_REGISTRY: Record<string, Record<string, string>> = {
    "BlackMarketLedgerObjectsDB": {
        "item_logs": "++id,item_id,uid,timestamp,category,wrapper_id,logged_at,updated_at,realized_profit,torn_log_id,[item_id+uid],[item_id+uid+category+timestamp]",
        "item_log_wrappers": "++id,type,timestamp,logged_at,updated_at",
        "system_logs": "++id,timestamp,level,context",
        "trades": "++id,timestamp,type,wrapper_id,receipt_id,torn_id,user_id,sync_status",
        "trade_items": "++id,trade_db_id,item_id,type",
        "receipts": "++id,receipt_id_string,source,created_at,seller_id,sync_status",
        "receipt_items": "++id,receipt_db_id,item_id",
        "system_configs": "key"
    }
};

const DB_INSTANCES = new Map<string, Dexie>();

/**
 * Requests that the browser treat the IndexedDB storage as persistent.
 * @returns (Promise<boolean>): True if storage is persistent, false otherwise
 */
async function requestPersistence(): Promise<boolean> {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persisted();
        if (!isPersisted) {
            return await navigator.storage.persist();
        }
        return true;
    }
    return false;
}

/**
 * Singleton database fetcher to ensure a unified schema and connection pool.
 * @param databaseName (string): The name of the browser IndexedDB
 * @returns (Dexie): The initialized Dexie instance for this database
 */
export function getDatabase(databaseName: string): Dexie {
    let db = DB_INSTANCES.get(databaseName);
    if (!db) {
        db = new Dexie(databaseName);
        const schemas = SCHEMA_REGISTRY[databaseName] || {};
        db.version(6).stores(schemas);
        DB_INSTANCES.set(databaseName, db);
        
        // Request persistence in the background
        requestPersistence().then(persisted => {
            if (persisted) {
                console.info(`Storage for ${databaseName} is now persistent.`);
            } else {
                console.warn(`Storage for ${databaseName} could not be made persistent.`);
            }
        }).catch(err => {
            console.error(`Error requesting storage persistence for ${databaseName}:`, err);
        });
    }
    return db;
}

export class BaseObjectRegistry<
    TObject extends BaseObject,
    TRecord extends BaseObjectDatabaseRecord,
> {
    private readonly database: Dexie;
    protected readonly tableRef: Table<TRecord, number, BaseObjectWriteRecord<TRecord>>;
    private readonly serializeObject: BaseObjectSerializer<TObject, TRecord>;
    private readonly hydrateRecord: BaseObjectHydrator<TObject, TRecord>;

    /**
     * Creates a Dexie registry for a single object table.
     * @param databaseName (string): Browser IndexedDB database name
     * @param tableName (string): Dexie table name
     * @param schema (string): Dexie schema definition for the table (kept for interface compatibility)
     * @param serializeObject (BaseObjectSerializer<TObject, TRecord>): Converts an object into a persisted record
     * @param hydrateRecord (BaseObjectHydrator<TObject, TRecord>): Converts a persisted record into a domain object
     * @returns (BaseObjectRegistry<TObject, TRecord>): Configured Dexie registry
     * @sideEffects Fetches or creates the shared IndexedDB database instance
     */
    constructor(
        databaseName: string,
        tableName: string,
        schema: string,
        serializeObject: BaseObjectSerializer<TObject, TRecord>,
        hydrateRecord: BaseObjectHydrator<TObject, TRecord>
    ) {
        this.database = getDatabase(databaseName);
        this.tableRef = this.database.table(tableName);
        this.serializeObject = serializeObject;
        this.hydrateRecord = hydrateRecord;
    }

    /**
     * Persists one object into Dexie using its current identifier.
     * @param object (TObject): Object to insert or replace
     * @returns (Promise<number>): The persisted object identifier
     * @sideEffects Writes to IndexedDB through Dexie and stores the persisted id on the object
     */
    public async put(object: TObject): Promise<number> {
        object.refreshUpdatedAt();
        const persistedId = await this.tableRef.put(this.serializeObject(object));
        object.applyPersistedId(persistedId);

        return persistedId;
    }

    /**
     * Persists multiple objects into Dexie in one batch.
     * @param objects (TObject[]): Objects to insert or replace
     * @returns (Promise<number[]>): Identifiers returned by Dexie for the batch
     * @sideEffects Writes to IndexedDB through Dexie and stores persisted ids on the objects
     */
    public async bulkPut(objects: TObject[]): Promise<number[]> {
        objects.forEach(obj => obj.refreshUpdatedAt());
        const persistedIds = (await this.tableRef.bulkPut(
            objects.map((object) => this.serializeObject(object)),
            { allKeys: true }
        )) as number[];

        objects.forEach((object, index) => {
            object.applyPersistedId(persistedIds[index]);
        });

        return persistedIds;
    }

    /**
     * Fetches one object by its persisted identifier.
     * @param id (number): Object identifier
     * @returns (Promise<TObject | undefined>): Hydrated object when found
     * @sideEffects Reads from IndexedDB through Dexie
     */
    public async getById(id: number): Promise<TObject | undefined> {
        const record = await this.tableRef.get(id);
        return record ? this.hydrateRecord(record) : undefined;
    }

    /**
     * Fetches Every record in the table and hydrates them into domain objects.
     * @returns (Promise<TObject[]>): All stored objects for the registry table
     * @sideEffects Reads from IndexedDB through Dexie
     */
    public async getAll(): Promise<TObject[]> {
        const records = await this.tableRef.toArray();
        return records.map((record) => this.hydrateRecord(record));
    }

    /**
     * Fetches a slice of records from the table, ordered by timestamp descending.
     * @param offset (number): The number of records to skip
     * @param limit (number): The maximum number of records to return
     * @returns (Promise<TObject[]>): A page of hydrated domain objects
     */
    public async getPaginated(offset: number, limit: number): Promise<TObject[]> {
        const records = await this.tableRef
            .orderBy("timestamp")
            .reverse()
            .offset(offset)
            .limit(limit)
            .toArray();
        return records.map((record) => this.hydrateRecord(record));
    }

    /**
     * Deletes a record by its identifier.
     * @param id (number): Object identifier
     * @returns (Promise<void>)
     * @sideEffects Writes to IndexedDB through Dexie
     */
    public async delete(id: number): Promise<void> {
        await this.tableRef.delete(id);
    }
}
