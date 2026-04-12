import { Storage } from "./storage";

export class Blackbox {
    static readonly STORAGE_KEY = "ledger-blackbox";

    private identifier: string;
    private logs: Map<string, any> = new Map();

    constructor(identifier: string) {
        this.identifier = identifier;
    }

    /**
     * Factory method to create a new Blackbox instance with a unique ID.
     */
    static async create() {
        const id = await Blackbox.getUniqueId();
        return new Blackbox(id);
    }

    /**
     * Generates a unique identifier for this blackbox instance.
     * @param none
     * @returns (Promise<string>): A unique identifier based on timestamp
     * @sideEffects Reads from IndexedDB
     */
    static async getUniqueId() {
        const allKeys = await Storage.getAllKeys(Blackbox.STORAGE_KEY);

        let newId = Date.now();
        while (allKeys.includes(newId.toString())) {
            newId = Date.now();
        }
        return newId.toString();
    }

    /**
     * Adds a log entry to the logs map.
     * @param logEntry (object): Object containing event, data, and timestamp
     * @returns (Promise<void>)
     * @sideEffects Mutates internal logs Map, triggers save()
     */
    async addLog(logEntry: { event: string; data: any; timestamp: string }) {
        this.logs.set(logEntry.timestamp, logEntry);
        await this.save();
    }

    /**
     * Persists the current logs to IndexedDB.
     * @param none
     * @returns (Promise<void>)
     * @sideEffects Writes to IndexedDB
     */
    async save() {
        // Convert Map to plain object for JSON serialization
        const logsObject = Object.fromEntries(this.logs);
        await Storage.set(Blackbox.STORAGE_KEY, this.identifier, JSON.stringify(logsObject));
    }
}
