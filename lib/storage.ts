"use client";

export class Storage {
    static readonly STORE_NAME = "keyval";

    /**
     * Opens or creates an IndexedDB database and ensures the object store exists.
     * @param dbName (string): The name of the database to open
     * @returns (Promise<IDBDatabase>): A promise that resolves to the opened database instance
     * @sideEffects Opens/creates IndexedDB database, creates object store if missing
     */
    private static async getDB(dbName: string): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            if (typeof indexedDB === "undefined") {
                return reject(new Error("IndexedDB not available"));
            }
            const request = indexedDB.open(dbName, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = request.result;
                if (!db.objectStoreNames.contains(Storage.STORE_NAME)) {
                    db.createObjectStore(Storage.STORE_NAME);
                }
            };
        });
    }

    /**
     * Retrieves a value from the object store by its key.
     * @param dbName (string): The name of the database to read from
     * @param key (string): The key of the item to retrieve
     * @returns (Promise<any>): A promise that resolves to the retrieved value, or undefined if not found
     * @sideEffects Reads from IndexedDB
     */
    static async get(dbName: string, key: string): Promise<any> {
        const db = await this.getDB(dbName);
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(Storage.STORE_NAME, "readonly");
            const store = transaction.objectStore(Storage.STORE_NAME);
            const request = store.get(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    /**
     * Stores a value in the object store, overwriting if the key already exists.
     * @param dbName (string): The name of the database to write to
     * @param key (string): The key under which to store the value
     * @param value (any): The data to persist
     * @returns (Promise<void>): A promise that resolves when the operation is complete
     * @sideEffects Writes to IndexedDB
     */
    static async set(dbName: string, key: string, value: any): Promise<void> {
        const db = await this.getDB(dbName);
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(Storage.STORE_NAME, "readwrite");
            const store = transaction.objectStore(Storage.STORE_NAME);
            const request = store.put(value, key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    /**
     * Deletes an entry from the object store by its key.
     * @param dbName (string): The name of the database to modify
     * @param key (string): The key of the item to remove
     * @returns (Promise<void>): A promise that resolves when the operation is complete
     * @sideEffects Deletes from IndexedDB
     */
    static async delete(dbName: string, key: string): Promise<void> {
        const db = await this.getDB(dbName);
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(Storage.STORE_NAME, "readwrite");
            const store = transaction.objectStore(Storage.STORE_NAME);
            const request = store.delete(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    /**
     * Retrieves all keys currently present in the object store.
     * @param dbName (string): The name of the database to read from
     * @returns (Promise<string[]>): A promise that resolves to an array of all keys
     * @sideEffects Reads from IndexedDB
     */
    static async getAllKeys(dbName: string): Promise<string[]> {
        const db = await this.getDB(dbName);
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(Storage.STORE_NAME, "readonly");
            const store = transaction.objectStore(Storage.STORE_NAME);
            const request = store.getAllKeys();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result as string[]);
        });
    }

    /**
     * Retrieves all keys and their corresponding values as a dictionary.
     * @param dbName (string): The name of the database to read from
     * @returns (Promise<Record<string, any>>): A promise that resolves to an object mapping keys to values
     * @sideEffects Reads from IndexedDB
     */
    static async getAllKeysAndValues(dbName: string): Promise<Record<string, any>> {
        const db = await this.getDB(dbName);
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(Storage.STORE_NAME, "readonly");
            const store = transaction.objectStore(Storage.STORE_NAME);
            const request = store.getAll();
            const keysRequest = store.getAllKeys();
            
            let results: any[] = [];
            let keys: any[] = [];
            
            keysRequest.onsuccess = () => {
                keys = keysRequest.result;
                if (results.length > 0 || keys.length === 0) finalize();
            };
            
            request.onsuccess = () => {
                results = request.result;
                if (keys.length > 0 || results.length === 0) finalize();
            };

            const finalize = () => {
                const dict: Record<string, any> = {};
                keys.forEach((key, index) => {
                    dict[key] = results[index];
                });
                resolve(dict);
            };

            request.onerror = () => reject(request.error);
            keysRequest.onerror = () => reject(keysRequest.error);
        });
    }

    /**
     * Retrieves and optionally parses a value as a dictionary.
     * @param dbName (string): The name of the database to read from
     * @param key (string): The key to retrieve
     * @returns (Promise<Record<string, any>>): A promise that resolves to a parsed dictionary or empty object
     * @sideEffects Reads from IndexedDB
     */
    static async getDict(dbName: string, key: string): Promise<Record<string, any>> {
        const data = await this.get(dbName, key);
        if (typeof data === "string") {
            try {
                return JSON.parse(data);
            } catch {
                return {};
            }
        }
        return data || {};
    }

    /**
     * Appends or updates a key-value pair within a stored dictionary.
     * @param dbName (string): The name of the database to modify
     * @param key (string): The key of the dictionary to update
     * @param itemKey (string): The sub-key within the dictionary to set
     * @param itemValue (any): The value to store for the sub-key
     * @returns (Promise<void>): A promise that resolves when the operation is complete
     * @sideEffects Reads and writes to IndexedDB
     */
    static async appendToDict(dbName: string, key: string, itemKey: string, itemValue: any): Promise<void> {
        const data = await this.getDict(dbName, key);
        data[itemKey] = itemValue;
        await this.set(dbName, key, data);
    }

    /**
     * Deletes a specific key from a stored dictionary.
     * @param dbName (string): The name of the database to modify
     * @param key (string): The key of the dictionary to update
     * @param itemKey (string): The sub-key within the dictionary to remove
     * @returns (Promise<void>): A promise that resolves when the operation is complete
     * @sideEffects Reads and writes to IndexedDB
     */
    static async deleteFromDict(dbName: string, key: string, itemKey: string): Promise<void> {
        const data = await this.getDict(dbName, key);
        delete data[itemKey];
        await this.set(dbName, key, data);
    }

    /**
     * Retrieves and parses a dictionary from localStorage.
     * @param key (string): The localStorage key to retrieve
     * @returns (Object): The parsed dictionary, or empty object if not found
     * @sideEffects Reads from localStorage
     */
    static getDictFromLocalStorage(key: string) {
        if (typeof window === "undefined") return {};
        let rawData = localStorage.getItem(key);
        let data = rawData ? JSON.parse(rawData) : {};
        return data;
    }

    /**
     * Adds or updates a key-value pair in a localStorage dictionary.
     * @param key (string): The localStorage key for the dictionary
     * @param itemKey (string): The key within the dictionary to set
     * @param itemValue (string): The value to store
     * @returns (void)
     * @sideEffects Writes to localStorage
     */
    static appendInLocalStorage(key: string, itemKey: string, itemValue: string) {
        if (typeof window === "undefined") return;
        let rawData = localStorage.getItem(key);
        let data = rawData ? JSON.parse(rawData) : {};
        data[itemKey] = itemValue;
        localStorage.setItem(key, JSON.stringify(data));
    }

    /**
     * Stores an item in localStorage, stringified as JSON.
     * @param key (string): The localStorage key to set
     * @param item (any): The data to store
     * @returns (void)
     * @sideEffects Writes to localStorage
     */
    static setItemInLocalStorage(key: string, item: any) {
        if (typeof window === "undefined") return;
        localStorage.setItem(key, JSON.stringify(item));
    }

    /**
     * Retrieves and parses an item from localStorage.
     * @param key (string): The localStorage key to retrieve
     * @returns (any): The parsed data, or null if not found
     * @sideEffects Reads from localStorage
     */
    static getItemFromLocalStorage(key: string) {
        if (typeof window === "undefined") return null;
        let rawData = localStorage.getItem(key);
        return rawData ? JSON.parse(rawData) : null;
    }

    /**
     * Retrieves all keys currently stored in localStorage.
     * @param none
     * @returns (string[]): An array of all localStorage keys
     * @sideEffects Reads from localStorage
     */
    static getAllKeysFromLocalStorage() {
        if (typeof window === "undefined") return [];
        return Object.keys(localStorage);
    }
}
