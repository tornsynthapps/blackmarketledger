"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    RefreshIcon,
    Delete02Icon,
    ArrowRight01Icon,
    ArrowDown01Icon,
    Database01Icon,
    Database02Icon,
    Key01Icon,
    ArrowUp01Icon,
} from "@hugeicons/core-free-icons";

interface StorageItem {
    key: string;
    value: string;
}

interface IDBStore {
    name: string;
    items: StorageItem[];
}

interface IDBDatabase {
    name: string;
    stores: IDBStore[];
}

function JSONValue({ value, forceExpanded = false }: { value: any; forceExpanded?: boolean }) {
    const [expanded, setExpanded] = useState(forceExpanded);
    const isComplex = typeof value === "object" && value !== null;
    const jsonStr = JSON.stringify(value, null, 2);

    useEffect(() => {
        setExpanded(forceExpanded);
    }, [forceExpanded]);

    if (!isComplex) {
        return <span className="text-green-400">{JSON.stringify(value)}</span>;
    }

    const isEmpty = Object.keys(value).length === 0;
    const preview = isEmpty ? "{}" : jsonStr.slice(0, 100) + (jsonStr.length > 100 ? "..." : "");

    return (
        <div className="ml-2">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-foreground/60 hover:text-primary transition-colors"
            >
                {expanded ? (
                    <HugeiconsIcon icon={ArrowDown01Icon} size={12} />
                ) : (
                    <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
                )}
                <span className="text-amber-400">{expanded ? "Object" : "Object"}</span>
                <span className="text-foreground/40 text-xs">
                    ({Object.keys(value).length} keys)
                </span>
            </button>
            {expanded && (
                <pre className="mt-1 ml-4 text-xs text-foreground/70 whitespace-pre-wrap break-all bg-foreground/5 rounded p-2 font-mono">
                    {jsonStr}
                </pre>
            )}
        </div>
    );
}

function StorageSection({
    title,
    icon: Icon,
    items,
    onDelete,
    onRefresh,
}: {
    title: string;
    icon: any;
    items: StorageItem[];
    onDelete: (key: string) => void;
    onRefresh: () => void;
}) {
    return (
        <div className="bg-panel/50 border border-border/50 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-panel">
                <div className="flex items-center gap-3">
                    <HugeiconsIcon icon={Icon} size={20} className="text-primary" />
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <span className="text-sm text-foreground/50">({items.length} items)</span>
                </div>
                <button
                    onClick={onRefresh}
                    className="p-2 hover:bg-foreground/10 rounded-lg transition-colors"
                    title="Refresh"
                >
                    <HugeiconsIcon icon={RefreshIcon} size={16} />
                </button>
            </div>
            {items.length === 0 ? (
                <div className="p-8 text-center text-foreground/40">No items stored</div>
            ) : (
                <div className="divide-y divide-border/30">
                    {items.map((item) => (
                        <div
                            key={item.key}
                            className="p-4 hover:bg-foreground/[0.02] transition-colors"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="font-mono text-sm font-medium text-primary break-all">
                                        {item.key}
                                    </div>
                                    <div className="mt-2 font-mono text-xs text-foreground/60">
                                        <JSONValue value={item.value} />
                                    </div>
                                </div>
                                <button
                                    onClick={() => onDelete(item.key)}
                                    className="p-1.5 text-foreground/40 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors shrink-0"
                                    title="Delete"
                                >
                                    <HugeiconsIcon icon={Delete02Icon} size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function parseValue(val: string): any {
    try {
        return JSON.parse(val);
    } catch {
        return val;
    }
}

export default function DebugStoragePage() {
    const [localStorageItems, setLocalStorageItems] = useState<StorageItem[]>([]);
    const [sessionStorageItems, setSessionStorageItems] = useState<StorageItem[]>([]);
    const [idbDatabases, setIdbDatabases] = useState<IDBDatabase[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedDB, setExpandedDB] = useState<Set<string>>(new Set());
    const [expandAllIDB, setExpandAllIDB] = useState(false);

    const toggleAllDB = () => {
        if (expandAllIDB) {
            setExpandedDB(new Set());
        } else {
            setExpandedDB(new Set(idbDatabases.map((db) => db.name)));
        }
        setExpandAllIDB(!expandAllIDB);
    };

    const loadStorage = async () => {
        setLoading(true);

        const ls: StorageItem[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                const val = localStorage.getItem(key) || "";
                ls.push({ key, value: parseValue(val) });
            }
        }
        setLocalStorageItems(ls);

        const ss: StorageItem[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key) {
                const val = sessionStorage.getItem(key) || "";
                ss.push({ key, value: parseValue(val) });
            }
        }
        setSessionStorageItems(ss);

        const dbs: IDBDatabase[] = [];

        const databases: IDBDatabaseInfo[] = await new Promise((resolve) => {
            if ("databases" in indexedDB) {
                indexedDB
                    .databases()
                    .then(resolve)
                    .catch(() => resolve([]));
            } else {
                resolve([
                    { name: "LogsDB", version: 1 },
                    { name: "GoogleCacheLogsDB", version: 1 },
                ]);
            }
        });

        for (const dbInfo of databases) {
            if (!dbInfo.name) continue;
            const dbName = dbInfo.name;
            try {
                const db: IDBDatabase = { name: dbName, stores: [] };

                const database: globalThis.IDBDatabase = await new Promise((resolve, reject) => {
                    const request = indexedDB.open(dbName);
                    request.onerror = () => reject(request.error);
                    request.onsuccess = () => resolve(request.result);
                    request.onupgradeneeded = () => reject(new Error("Upgrade needed"));
                });

                for (const storeName of database.objectStoreNames) {
                    const items: StorageItem[] = await new Promise((resolve, reject) => {
                        const transaction = database.transaction(storeName, "readonly");
                        const store = transaction.objectStore(storeName);
                        const request = store.getAll();
                        request.onerror = () => reject(request.error);
                        request.onsuccess = () => {
                            const results: StorageItem[] = [];
                            const result = request.result;
                            if (Array.isArray(result)) {
                                for (const item of result) {
                                    if (typeof item === "object" && item !== null) {
                                        const itemKey =
                                            item.id ??
                                            item.key ??
                                            JSON.stringify(item).slice(0, 50);
                                        results.push({ key: String(itemKey), value: item });
                                    } else {
                                        results.push({
                                            key: String(item),
                                            value: parseValue(String(item)),
                                        });
                                    }
                                }
                            }
                            resolve(results);
                        };
                    });
                    db.stores.push({ name: storeName, items });
                }

                database.close();
                dbs.push(db);
            } catch (e) {
                console.warn(`Failed to load database ${dbInfo.name}`, e);
            }
        }

        setIdbDatabases(dbs);
        setLoading(false);
    };

    const deleteLocalStorage = (key: string) => {
        localStorage.removeItem(key);
        loadStorage();
    };

    const deleteSessionStorage = (key: string) => {
        sessionStorage.removeItem(key);
        loadStorage();
    };

    const toggleDB = (dbName: string) => {
        setExpandedDB((prev) => {
            const next = new Set(prev);
            if (next.has(dbName)) {
                next.delete(dbName);
            } else {
                next.add(dbName);
            }
            return next;
        });
    };

    useEffect(() => {
        loadStorage();
    }, []);

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Storage Debug</h1>
                <p className="text-foreground/60 mt-2">View and manage browser storage data.</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <HugeiconsIcon icon={RefreshIcon} size={24} className="animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-6">
                    <StorageSection
                        title="Local Storage"
                        icon={Database02Icon}
                        items={localStorageItems}
                        onDelete={deleteLocalStorage}
                        onRefresh={loadStorage}
                    />

                    <StorageSection
                        title="Session Storage"
                        icon={Key01Icon}
                        items={sessionStorageItems}
                        onDelete={deleteSessionStorage}
                        onRefresh={loadStorage}
                    />

                    <div className="bg-panel/50 border border-border/50 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-panel">
                            <div className="flex items-center gap-3">
                                <HugeiconsIcon icon={Database01Icon} size={20} className="text-primary" />
                                <h2 className="text-lg font-semibold">IndexedDB</h2>
                                <span className="text-sm text-foreground/50">
                                    ({idbDatabases.length} databases)
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={toggleAllDB}
                                    className="p-2 hover:bg-foreground/10 rounded-lg transition-colors"
                                    title={expandAllIDB ? "Collapse All" : "Expand All"}
                                >
                                    {expandAllIDB ? (
                                        <HugeiconsIcon icon={ArrowUp01Icon} size={16} />
                                    ) : (
                                        <HugeiconsIcon icon={ArrowDown01Icon} size={16} />
                                    )}
                                </button>
                                <button
                                    onClick={loadStorage}
                                    className="p-2 hover:bg-foreground/10 rounded-lg transition-colors"
                                    title="Refresh"
                                >
                                    <HugeiconsIcon icon={RefreshIcon} size={16} />
                                </button>
                            </div>
                        </div>

                        {idbDatabases.length === 0 ? (
                            <div className="p-8 text-center text-foreground/40">
                                No databases found
                            </div>
                        ) : (
                            <div className="divide-y divide-border/30">
                                {idbDatabases.map((db) => (
                                    <div key={db.name}>
                                        <button
                                            onClick={() => toggleDB(db.name)}
                                            className="w-full flex items-center gap-2 p-4 hover:bg-foreground/[0.02] transition-colors text-left"
                                        >
                                            {expandedDB.has(db.name) ? (
                                                <HugeiconsIcon icon={ArrowDown01Icon} size={16} className="text-foreground/40" />
                                            ) : (
                                                <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="text-foreground/40" />
                                            )}
                                            <span className="font-mono text-sm font-medium text-primary">
                                                {db.name}
                                            </span>
                                            <span className="text-xs text-foreground/40">
                                                ({db.stores.length} stores)
                                            </span>
                                        </button>

                                        {expandedDB.has(db.name) && (
                                            <div className="pb-4">
                                                {db.stores.map((store) => (
                                                    <div key={store.name} className="px-8">
                                                        <div className="py-2 text-xs font-medium text-foreground/50 uppercase tracking-wider border-b border-border/20 mb-2">
                                                            {store.name}
                                                        </div>
                                                        {store.items.length === 0 ? (
                                                            <div className="text-sm text-foreground/40 py-2">
                                                                Empty
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {store.items.map((item) => (
                                                                    <div
                                                                        key={item.key}
                                                                        className="p-2 bg-foreground/5 rounded text-xs"
                                                                    >
                                                                        <div className="font-mono font-medium text-primary break-all">
                                                                            {item.key}
                                                                        </div>
                                                                        <div className="mt-1 font-mono text-foreground/60">
                                                                            <JSONValue
                                                                                value={item.value}
                                                                                forceExpanded={
                                                                                    expandAllIDB
                                                                                }
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
