import {
    BaseObject,
    BaseObjectRegistry,
    type BaseObjectDatabaseFields,
    type BaseObjectDatabaseRecord,
    type BaseObjectWriteRecord,
    requireBaseObjectDatabaseFields,
} from "./BaseObject";

export type SystemLogLevel = "info" | "warn" | "error" | "debug";

export interface SystemLogCreateFields {
    timestamp: number;
    level: SystemLogLevel;
    context: string;
    message: string;
    data?: any;
}

export interface SystemLogDatabaseRecord extends BaseObjectDatabaseRecord {
    level: SystemLogLevel;
    context: string;
    message: string;
    data?: any;
}

export class SystemLog extends BaseObject {
    private static readonly CURRENT_VERSION = 2;

    public readonly level: SystemLogLevel;
    public readonly context: string;
    public readonly message: string;
    public readonly data: any;

    /**
     * Creates a system log with optional persisted metadata.
     * @param fields (SystemLogCreateFields): System log data to store on the object
     * @param databaseFields (BaseObjectDatabaseFields | undefined): Persisted metadata required only during hydration
     * @returns (SystemLog): System log instance
     * @sideEffects None
     */
    protected constructor(fields: SystemLogCreateFields, databaseFields?: BaseObjectDatabaseFields) {
        super(fields.timestamp, SystemLog.CURRENT_VERSION, databaseFields);

        this.level = fields.level;
        this.context = fields.context;
        this.message = fields.message;
        this.data = fields.data ?? null;
    }

    /**
     * Creates a new system log for application use.
     * @param fields (SystemLogCreateFields): System log fields supplied by the caller
     * @returns (SystemLog): New system log
     */
    public static create(fields: SystemLogCreateFields): SystemLog {
        return new SystemLog(fields);
    }

    /**
     * Hydrates a system log from a Dexie database record.
     * @param record (SystemLogDatabaseRecord): Persisted system log record
     * @returns (SystemLog): Hydrated system log
     */
    public static fromDatabase(record: SystemLogDatabaseRecord): SystemLog {
        const databaseFields = requireBaseObjectDatabaseFields(record);

        return new SystemLog(
            {
                timestamp: record.timestamp,
                level: record.level,
                context: record.context,
                message: record.message,
                data: record.data,
            },
            databaseFields
        );
    }

    /**
     * Converts the system log into a Dexie-ready database record.
     * @returns (BaseObjectWriteRecord<SystemLogDatabaseRecord>): Persistable system log record
     */
    public toDatabaseRecord(): BaseObjectWriteRecord<SystemLogDatabaseRecord> {
        return {
            ...this.toBaseDatabaseRecord(),
            level: this.level,
            context: this.context,
            message: this.message,
            data: this.data,
        };
    }
}

export class SystemLogRegistry extends BaseObjectRegistry<SystemLog, SystemLogDatabaseRecord> {
    /**
     * Creates a Dexie registry for system log persistence.
     * @returns (SystemLogRegistry): Configured system log registry
     */
    constructor() {
        super(
            "BlackMarketLedgerObjectsDB",
            "system_logs",
            "++id,timestamp,level,context",
            (systemLog) => systemLog.toDatabaseRecord(),
            (record) => SystemLog.fromDatabase(record)
        );
    }

    /**
     * Fetches a page of system logs, ordered by timestamp descending.
     * @param offset (number): Number of records to skip
     * @param limit (number): Maximum number of records to return
     * @returns (Promise<SystemLog[]>): Page of system logs
     */
    public async getPaged(offset: number, limit: number): Promise<SystemLog[]> {
        const records = await this.tableRef
            .orderBy("timestamp")
            .reverse()
            .offset(offset)
            .limit(limit)
            .toArray();

        return records.map((record) => SystemLog.fromDatabase(record));
    }

    /**
     * Counts the total number of system logs.
     * @returns (Promise<number>): Total count
     */
    public async count(): Promise<number> {
        return await this.tableRef.count();
    }

    /**
     * Fetches a filtered page of system logs.
     * @param offset (number): Number of records to skip
     * @param limit (number): Maximum number of records to return
     * @param filters (object): Filtering criteria
     */
    public async getFilteredPaged(
        offset: number,
        limit: number,
        filters: {
            level?: SystemLogLevel | "all";
            context?: string;
            startDate?: number;
            endDate?: number;
        }
    ): Promise<{ logs: SystemLog[]; total: number }> {
        let collection = this.tableRef.orderBy("timestamp").reverse();

        if (filters.level && filters.level !== "all") {
            collection = collection.filter((log) => log.level === filters.level);
        }

        if (filters.context) {
            const search = filters.context.toLowerCase();
            collection = collection.filter((log) => log.context.toLowerCase().includes(search));
        }

        if (filters.startDate) {
            collection = collection.filter((log) => log.timestamp >= filters.startDate!);
        }

        if (filters.endDate) {
            const eod = filters.endDate! + 24 * 60 * 60 * 1000 - 1;
            collection = collection.filter((log) => log.timestamp <= eod);
        }

        const total = await collection.count();
        const records = await collection.offset(offset).limit(limit).toArray();

        return {
            logs: records.map((record) => SystemLog.fromDatabase(record)),
            total,
        };
    }
}
