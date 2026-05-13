import { getDatabase } from "./BaseObject";
import { Table } from "dexie";

export interface SystemConfigRecord {
    key: string;
    value: any;
}

export class SystemConfigRegistry {
    private readonly db = getDatabase("BlackMarketLedgerObjectsDB");
    private readonly tableRef: Table<SystemConfigRecord, string>;

    constructor() {
        this.tableRef = this.db.table("system_configs");
    }

    public async get(key: string): Promise<any | undefined> {
        const record = await this.tableRef.get(key);
        return record?.value;
    }

    public async set(key: string, value: any): Promise<void> {
        await this.tableRef.put({ key, value });
    }

    public async delete(key: string): Promise<void> {
        await this.tableRef.delete(key);
    }
}
