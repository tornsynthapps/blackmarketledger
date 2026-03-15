"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Transaction, ParsedLog, FLOWER_SET, PLUSHIE_SET } from '@/lib/parser';
import { sendToExtension } from '@/lib/bmlconnect';
import * as idb from '@/lib/idb';
import { setGlobalSyncStatus } from '@/lib/syncStatus';

// A simple hook to manage transactions in localStorage and IndexedDB.
const STORAGE_KEY = 'torn_invest_tracker_logs';
const CONFIG_KEY = 'torn_invest_tracker_config';
const DRIVE_CACHE_READY_KEY = 'bml_drive_cache_ready';
const DRIVE_CACHE_SYNCED_AT_KEY = 'bml_drive_cache_synced_at';
const DRIVE_BOOTSTRAP_DONE_KEY = 'bml_drive_bootstrap_done';
const DRIVE_SYNC_MAX_AGE_MS = 10 * 60 * 1000;
const TORN_BASIC_USER_URL = "https://api.torn.com/user/?selections=basic&key=";

declare global {
    interface Window {
        chrome: any;
    }
}

export interface InventoryItemStats {
    stock: number;
    totalCost: number; // for calculating average cost basis
    realizedProfit: number; // profit from selling

    // Abroad specific tracking
    abroadStock: number;
    abroadTotalCost: number;
    abroadRealizedProfit: number;
}

export interface SyncState {
    isSyncing: boolean;
    message: string;
}

async function resolveTornUserId(apiKey: string) {
    const response = await fetch(`${TORN_BASIC_USER_URL}${encodeURIComponent(apiKey)}`);
    const data = await response.json();

    if (!response.ok || data?.error) {
        const message = data?.error?.error || data?.error || "Failed to validate Torn API key";
        throw new Error(message);
    }

    const rawUserId = data?.player_id ?? data?.playerID ?? data?.user_id ?? data?.userId;
    const userId = typeof rawUserId === "number" || typeof rawUserId === "string"
        ? String(rawUserId)
        : "";

    if (!userId) {
        throw new Error("Could not determine Torn user ID from the provided API key.");
    }

    return userId;
}

export function useJournal() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [needsMigration, setNeedsMigration] = useState(false);
    const [weav3rApiKey, setWeav3rApiKey] = useState("");
    const [weav3rUserId, setWeav3rUserId] = useState("");
    const [driveApiKey, setDriveApiKey] = useState("");
    const [syncState, setSyncState] = useState<SyncState>({ isSyncing: false, message: "" });
    const syncCounterRef = useRef(0);

    const beginSync = useCallback((message: string) => {
        syncCounterRef.current += 1;
        const nextState = { isSyncing: true, message };
        setSyncState(nextState);
        setGlobalSyncStatus(nextState);
    }, []);

    const endSync = useCallback(() => {
        syncCounterRef.current = Math.max(0, syncCounterRef.current - 1);
        if (syncCounterRef.current === 0) {
            const nextState = { isSyncing: false, message: "" };
            setSyncState(nextState);
            setGlobalSyncStatus(nextState);
        }
    }, []);

    const runSyncTask = useCallback(async <T,>(message: string, task: () => Promise<T>) => {
        beginSync(message);
        try {
            return await task();
        } finally {
            endSync();
        }
    }, [beginSync, endSync]);

    const readCachedTransactions = useCallback(async () => {
        try {
            const idbTransactions = await idb.getAllTransactions<Transaction>();
            if (idbTransactions.length > 0) {
                return idbTransactions;
            }
        } catch (error) {
            console.warn("IndexedDB read failed, falling back to localStorage cache", error);
        }

        const localTransactions = localStorage.getItem(STORAGE_KEY);
        if (!localTransactions) {
            return [];
        }

        try {
            const parsed = JSON.parse(localTransactions);
            return Array.isArray(parsed) ? parsed as Transaction[] : [];
        } catch (error) {
            console.error("Failed to parse localStorage transaction cache", error);
            return [];
        }
    }, []);

    const persistTransactionsCache = useCallback(async (newLogs: Transaction[]) => {
        try {
            await idb.saveTransactions(newLogs);
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.warn("IndexedDB write failed, falling back to localStorage cache", error);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newLogs));
        }
    }, []);

    const readConfigCache = useCallback(async () => {
        try {
            const idbConfig = await idb.get<string>(CONFIG_KEY);
            if (idbConfig) {
                return idbConfig;
            }
        } catch (error) {
            console.warn("IndexedDB config read failed, falling back to localStorage", error);
        }

        return localStorage.getItem(CONFIG_KEY) || null;
    }, []);

    const persistConfigCache = useCallback(async (value: string) => {
        try {
            await idb.set(CONFIG_KEY, value);
            localStorage.removeItem(CONFIG_KEY);
        } catch (error) {
            console.warn("IndexedDB config write failed, falling back to localStorage", error);
            localStorage.setItem(CONFIG_KEY, value);
        }
    }, []);

    const persistLocalCache = useCallback(async (newLogs: Transaction[]) => {
        await persistTransactionsCache(newLogs);
        localStorage.setItem(DRIVE_CACHE_READY_KEY, "true");
    }, [persistTransactionsCache]);

    const markDriveSyncComplete = useCallback(() => {
        localStorage.setItem(DRIVE_CACHE_SYNCED_AT_KEY, new Date().toISOString());
        sessionStorage.setItem(DRIVE_BOOTSTRAP_DONE_KEY, "true");
    }, []);

    const isDriveCacheFresh = useCallback((cachedTransactions: Transaction[]) => {
        const hasDriveCache = localStorage.getItem(DRIVE_CACHE_READY_KEY) === "true";
        const bootstrapDone = sessionStorage.getItem(DRIVE_BOOTSTRAP_DONE_KEY) === "true";
        const lastSyncedAt = localStorage.getItem(DRIVE_CACHE_SYNCED_AT_KEY);

        if (!hasDriveCache || !bootstrapDone || !lastSyncedAt) {
            return false;
        }

        const syncedAtMs = new Date(lastSyncedAt).getTime();
        if (!Number.isFinite(syncedAtMs)) {
            return false;
        }

        if (Date.now() - syncedAtMs > DRIVE_SYNC_MAX_AGE_MS) {
            return false;
        }

        return cachedTransactions.length > 0 || hasDriveCache;
    }, []);

    const fetchDriveTransactions = useCallback(async () => {
        const response = await sendToExtension<Transaction[]>({ type: "DRIVE_LOAD_DATA" });
        if (!response.success) {
            throw new Error(response.error || "Failed to download Drive data");
        }

        const driveTransactions = Array.isArray(response.data) ? response.data : [];
        await persistLocalCache(driveTransactions);
        markDriveSyncComplete();
        return driveTransactions;
    }, [markDriveSyncComplete, persistLocalCache]);

    const refreshDriveCache = useCallback(async () => {
        const driveTransactions = await runSyncTask(
            "Sync in progress: downloading latest data from Google Drive...",
            fetchDriveTransactions
        );
        setTransactions(driveTransactions);
        return driveTransactions;
    }, [fetchDriveTransactions, runSyncTask]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!syncCounterRef.current) return;
            event.preventDefault();
            event.returnValue = "Ledger sync is still running. Leaving now may interrupt the sync.";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, []);


    useEffect(() => {
        const init = async () => {
            let loadedTransactions: Transaction[] = [];
            let parsedConfig = null;
            let backgroundDriveRefresh: Promise<void> | null = null;
            try {
                // Load Config
                const cachedConfig = await readConfigCache();
                if (cachedConfig) {
                    try {
                        parsedConfig = JSON.parse(cachedConfig);
                    } catch (e) {
                        console.error("Failed to parse config from IDB", e);
                    }
                }

                // Check storage preference
                const storagePref = localStorage.getItem("bml_storage_pref");
                let loadedFromExtension = false;

                if (storagePref === 'extension' || storagePref === 'drive') {
                    try {
                        if (storagePref === 'drive') {
                            const cachedTransactions = await readCachedTransactions();
                            if (isDriveCacheFresh(cachedTransactions)) {
                                loadedTransactions = cachedTransactions;
                                loadedFromExtension = true;
                            } else {
                                loadedTransactions = cachedTransactions;
                                loadedFromExtension = true;
                                backgroundDriveRefresh = runSyncTask(
                                    "Sync in progress: downloading latest data from Google Drive...",
                                    fetchDriveTransactions
                                )
                                    .then((freshTransactions) => {
                                        setTransactions(freshTransactions);
                                    })
                                    .catch((error) => {
                                        console.error("Background Drive bootstrap failed", error);
                                    });
                            }
                        } else {
                            const res = await sendToExtension<Transaction[]>({ 
                                type: "EXTENSION_DB_LOAD",
                            });
                            if (res && res.success && Array.isArray(res.data)) {
                                loadedTransactions = res.data;
                                loadedFromExtension = true;
                            }
                        }
                    } catch (e) {
                        console.error(`Failed to load from ${storagePref}, falling back to local IDB`, e);
                    }
                }

                if (!loadedFromExtension) {
                    // Load Transactions (V2 -> V1 -> LS)
                    const dbVersion = localStorage.getItem("bml_db_version");
                    
                    if (dbVersion === "2") {
                        // V2: Already migrated, load from new transaction store
                        loadedTransactions = await readCachedTransactions();
                    } else {
                    // Try to load old data to migrate
                    const idbStored = await idb.get<string>(STORAGE_KEY);
                    const lsStored = localStorage.getItem(STORAGE_KEY);
                    
                    let oldLogsStr = idbStored || lsStored;
                    if (oldLogsStr) {
                        try {
                            loadedTransactions = JSON.parse(oldLogsStr);
                        } catch (e) {
                            console.error("Failed to parse old logs for migration", e);
                        }
                    }

                    // Perform Migration if we have logs or are fresh
                    try {
                        await persistTransactionsCache(loadedTransactions);
                        localStorage.setItem("bml_db_version", "2");
                        localStorage.setItem("bml_db_selection", "indexeddb"); // Ensure legacy flag is set just in case
                        
                        // Cleanup old structures to save space
                        if (idbStored) await idb.del(STORAGE_KEY);
                        if (lsStored) localStorage.removeItem(STORAGE_KEY);
                    } catch (err) {
                        console.error("Failed to migrate logs to IDB V2", err);
                    }
                }
                }

                if (loadedTransactions.length > 0) {
                    setTransactions(loadedTransactions);
                }

                if (parsedConfig) {
                    setWeav3rApiKey(parsedConfig.apiKey || "");
                    setWeav3rUserId(parsedConfig.userId || "");
                    setDriveApiKey(parsedConfig.driveApiKey || "");
                }
            } catch (error) {
                console.error("Journal bootstrap failed", error);
            } finally {
                setIsLoaded(true);
                void backgroundDriveRefresh;
            }
        };

        init();
    }, [fetchDriveTransactions, isDriveCacheFresh, persistTransactionsCache, readCachedTransactions, readConfigCache, runSyncTask]);



    const performMigration = useCallback(async () => {
        // Obsolete: Handled automatically in init() now.
        window.location.reload();
    }, []);

    const saveTransactions = useCallback((newLogs: Transaction[]) => {
        setTransactions(newLogs);
        
        const storagePref = localStorage.getItem("bml_storage_pref");
        
        if (storagePref === 'extension') {
            sendToExtension({ type: 'EXTENSION_DB_SAVE', payload: { logs: newLogs } }).catch(err => {
                 console.error("Failed to save to extension DB", err);
            });
            // Still save to local IDB as a fallback duplicate if desired, or skip. 
            // The user wants shared data when moving, so let's keep IDB in sync too for safety if they switch back.
            persistTransactionsCache(newLogs).catch(console.error);
        } else if (storagePref === 'drive') {
            persistLocalCache(newLogs).catch(console.error);
            runSyncTask(
                "Sync in progress: uploading latest data to Google Drive...",
                async () => {
                    const response = await sendToExtension({ 
                        type: 'DRIVE_WRITE_DATA', 
                        payload: { data: newLogs },
                    });
                    if (!response.success) {
                        throw new Error(response.error || "Failed to sync to Google Drive");
                    }
                    markDriveSyncComplete();
                }
            ).catch(err => {
                 console.error("Failed to sync to Google Drive", err);
            });
        } else {
            persistTransactionsCache(newLogs).catch(err => {
                console.error("Failed to save transactions to IDB", err);
                // Fallback for extreme failure situations if IDB crashes
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newLogs));
            });
        }
    }, [markDriveSyncComplete, persistLocalCache, persistTransactionsCache, runSyncTask]);

    const mergeTransactions = useCallback((incoming: Transaction[]) => {
        setTransactions(prev => {
            const merged = [...prev];
            const existingIds = new Set(prev.map(t => t.id));
            
            incoming.forEach(t => {
                if (!existingIds.has(t.id)) {
                    merged.push(t);
                    existingIds.add(t.id);
                }
            });
            
            // Sort by date to keep consistent
            merged.sort((a, b) => a.date - b.date);
            
            // Save the merged result
            saveTransactions(merged);
            return merged;
        });
    }, [saveTransactions]);

    const saveWeaverConfig = useCallback(async (apiKey: string) => {
        const trimmedApiKey = apiKey.trim();

        if (!trimmedApiKey) {
            setWeav3rApiKey("");
            setWeav3rUserId("");
            const clearedConfig = JSON.stringify({ apiKey: "", userId: "", driveApiKey });

            if (localStorage.getItem("bml_db_selection") === "indexeddb") {
                await persistConfigCache(clearedConfig);
            } else {
                localStorage.setItem(CONFIG_KEY, clearedConfig);
            }
            return "";
        }

        const userId = await resolveTornUserId(trimmedApiKey);
        setWeav3rApiKey(trimmedApiKey);
        setWeav3rUserId(userId);
        const str = JSON.stringify({ apiKey: trimmedApiKey, userId, driveApiKey });

        if (localStorage.getItem("bml_db_selection") === "indexeddb") {
            await persistConfigCache(str);
        } else {
            localStorage.setItem(CONFIG_KEY, str);
        }

        return userId;
    }, [driveApiKey, persistConfigCache]);

    const saveDriveApiKey = useCallback((apiKey: string) => {
        setDriveApiKey(apiKey);
        const str = JSON.stringify({ apiKey: weav3rApiKey, userId: weav3rUserId, driveApiKey: apiKey });

        if (localStorage.getItem("bml_db_selection") === "indexeddb") {
            persistConfigCache(str).catch(console.error);
        } else {
            localStorage.setItem(CONFIG_KEY, str);
        }
    }, [persistConfigCache, weav3rApiKey, weav3rUserId]);

    // Derived State helper calculation to get current inventory snapshot
    // Used by addLogs to know how to split sales
    const calculateInventory = (txns: Transaction[]) => {
        const inv = new Map<string, InventoryItemStats>();
        txns.forEach(t => {
            if (t.type === 'BUY') {
                const isAbroad = t.tag === 'Abroad';
                const current = inv.get(t.item) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };

                if (isAbroad) {
                    current.abroadStock += t.amount;
                    current.abroadTotalCost += (t.price * t.amount);
                } else {
                    current.stock += t.amount;
                    current.totalCost += (t.price * t.amount);
                }
                inv.set(t.item, current);
            } else if (t.type === 'SELL') {
                const isAbroad = t.tag === 'Abroad';
                const current = inv.get(t.item) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };

                if (isAbroad) {
                    const avgCostBasis = current.abroadStock > 0 ? (current.abroadTotalCost / current.abroadStock) : 0;
                    const costOfGoodsSold = avgCostBasis * t.amount;
                    const revenue = t.price * t.amount;

                    current.abroadStock -= t.amount;
                    current.abroadTotalCost -= costOfGoodsSold;
                    current.abroadRealizedProfit += (revenue - costOfGoodsSold);
                } else {
                    const avgCostBasis = current.stock > 0 ? (current.totalCost / current.stock) : 0;
                    const costOfGoodsSold = avgCostBasis * t.amount;
                    const revenue = t.price * t.amount;

                    current.stock -= t.amount;
                    current.totalCost -= costOfGoodsSold;
                    current.realizedProfit += (revenue - costOfGoodsSold);
                }

                inv.set(t.item, current);
            } else if (t.type === 'CONVERT') {
                // Assume flushies are always normal stock for museum conversions
                const fromCurr = inv.get(t.fromItem) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
                const fromAvgCost = fromCurr.stock > 0 ? (fromCurr.totalCost / fromCurr.stock) : 0;
                const fromCostOfGoods = fromAvgCost * t.fromAmount;
                fromCurr.stock -= t.fromAmount;
                fromCurr.totalCost -= fromCostOfGoods;
                inv.set(t.fromItem, fromCurr);

                const toCurr = inv.get(t.toItem) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
                toCurr.stock += t.toAmount;
                toCurr.totalCost += fromCostOfGoods;
                inv.set(t.toItem, toCurr);
            } else if (t.type === 'SET_CONVERT') {
                const setItems = t.setType === 'flower' ? FLOWER_SET : PLUSHIE_SET;
                let totalCostOfGoods = 0;

                setItems.forEach(item => {
                    // Assume museum set items use normal stock primarily
                    const curr = inv.get(item) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
                    const avgCost = curr.stock > 0 ? (curr.totalCost / curr.stock) : 0;
                    const costOfGoods = avgCost * t.times;
                    curr.stock -= t.times;
                    curr.totalCost -= costOfGoods;
                    inv.set(item, curr);
                    totalCostOfGoods += costOfGoods;
                });

                const pointsCurr = inv.get('points') || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
                pointsCurr.stock += t.pointsEarned;
                pointsCurr.totalCost += totalCostOfGoods;
                inv.set('points', pointsCurr);
            }
        });
        return inv;
    };

    const buildTransactionsWithLogs = useCallback((baseTransactions: Transaction[], parsedLogs: ParsedLog[]) => {
        let currentTxns = [...baseTransactions];
        const initialDate = Date.now();

        // Process sequentially so each generic SELL log correctly reads the dynamic inventory
        parsedLogs.forEach((p, idx) => {
            const date = initialDate + idx; // Ensure unique chronological time matching insertion

            if (p.type === 'SELL' && !p.tag) {
                // Determine if we need to split this standard sell
                const currentInv = calculateInventory(currentTxns);
                const itemStats = currentInv.get(p.item);

                let remainingAmountToSell = p.amount;

                // If they have NO normal stock but have abroad stock, default to using abroad.
                // Or if they sell more than their normal stock, deduct from normal, then abroad, then negative normal.
                const normalAvail = itemStats?.stock || 0;
                const abroadAvail = itemStats?.abroadStock || 0;

                const toSave: Transaction[] = [];

                if (normalAvail >= remainingAmountToSell || (normalAvail <= 0 && abroadAvail <= 0)) {
                    // Plenty of normal stock or neither exists: Just sell to Normal
                    toSave.push({ ...p, id: crypto.randomUUID(), date, tag: 'Normal' } as Transaction);
                } else if (normalAvail > 0 && remainingAmountToSell > normalAvail) {
                    // Split needed! First clear normal stock
                    toSave.push({ ...p, amount: normalAvail, id: crypto.randomUUID(), date, tag: 'Normal' } as Transaction);
                    remainingAmountToSell -= normalAvail;

                    if (abroadAvail > 0) {
                        const amountFromAbroad = Math.min(abroadAvail, remainingAmountToSell);
                        toSave.push({ ...p, amount: amountFromAbroad, id: crypto.randomUUID(), date: date + 1, tag: 'Abroad' } as Transaction);
                        remainingAmountToSell -= amountFromAbroad;
                    }

                    // If still remaining, dump negative to normal
                    if (remainingAmountToSell > 0) {
                        toSave.push({ ...p, amount: remainingAmountToSell, id: crypto.randomUUID(), date: date + 2, tag: 'Normal' } as Transaction);
                    }
                } else if (normalAvail <= 0 && abroadAvail > 0) {
                    // No normal stock, but we have abroad stock
                    const amountFromAbroad = Math.min(abroadAvail, remainingAmountToSell);
                    toSave.push({ ...p, amount: amountFromAbroad, id: crypto.randomUUID(), date, tag: 'Abroad' } as Transaction);
                    remainingAmountToSell -= amountFromAbroad;

                    if (remainingAmountToSell > 0) {
                        toSave.push({ ...p, amount: remainingAmountToSell, id: crypto.randomUUID(), date: date + 1, tag: 'Normal' } as Transaction);
                    }
                }

                currentTxns = [...currentTxns, ...toSave];
            } else {
                // Not a generic sell, or properly tagged manually. Save as is.
                currentTxns.push({
                    ...p,
                    id: crypto.randomUUID(),
                    date,
                    ...(p.type === 'BUY' && !p.tag ? { tag: 'Normal' } : {}) // Default untagged buys to Normal
                } as Transaction);
            }
        });

        return currentTxns;
    }, []);

    const addLogs = useCallback(async (parsedLogs: ParsedLog[]) => {
        const storagePref = localStorage.getItem("bml_storage_pref");
        const baseTransactions = storagePref === 'drive'
            ? await runSyncTask(
                "Sync in progress: downloading latest data before adding logs...",
                fetchDriveTransactions
            )
            : transactions;

        const nextTransactions = buildTransactionsWithLogs(baseTransactions, parsedLogs);
        saveTransactions(nextTransactions);
    }, [buildTransactionsWithLogs, fetchDriveTransactions, runSyncTask, saveTransactions, transactions]);

    const clearLogs = useCallback(() => {
        localStorage.removeItem(DRIVE_CACHE_READY_KEY);
        localStorage.removeItem(DRIVE_CACHE_SYNCED_AT_KEY);
        saveTransactions([]);
    }, [saveTransactions]);

    const deleteLog = useCallback((id: string) => {
        saveTransactions(transactions.filter(t => t.id !== id));
    }, [saveTransactions, transactions]);

    const restoreData = useCallback((data: Transaction[], merge: boolean = false) => {
        if (merge) {
            saveTransactions([...transactions, ...data]);
        } else {
            saveTransactions(data);
        }
    }, [saveTransactions, transactions]);

    const editLog = useCallback((id: string, updates: Partial<Transaction>) => {
        saveTransactions(transactions.map(t => t.id === id ? { ...t, ...updates } as Transaction : t));
    }, [saveTransactions, transactions]);

    const renameItem = useCallback((oldName: string, newName: string) => {
        if (!newName.trim()) return;
        const normalizedNewName = newName.trim();

        saveTransactions(transactions.map(t => {
            if (t.type === 'BUY' || t.type === 'SELL') {
                if (t.item === oldName) return { ...t, item: normalizedNewName } as Transaction;
            } else if (t.type === 'CONVERT') {
                if (t.fromItem === oldName || t.toItem === oldName) {
                    return {
                        ...t,
                        fromItem: t.fromItem === oldName ? normalizedNewName : t.fromItem,
                        toItem: t.toItem === oldName ? normalizedNewName : t.toItem
                    } as Transaction;
                }
            }
            return t;
        }));
    }, [saveTransactions, transactions]);

    // Derived global state for UI components
    const inventory = calculateInventory(transactions);

    let totalMugLoss = 0;
    transactions.forEach(t => {
        if (t.type === 'MUG') {
            totalMugLoss += t.amount;
        }
    });

    let totalItemRealizedProfit = 0;
    let totalInventoryValue = 0; // calculated at avg cost basis

    let totalAbroadRealizedProfit = 0;
    let totalAbroadInventoryValue = 0;

    inventory.forEach(stats => {
        totalItemRealizedProfit += stats.realizedProfit;
        totalInventoryValue += Math.max(0, stats.totalCost);

        totalAbroadRealizedProfit += stats.abroadRealizedProfit;
        totalAbroadInventoryValue += Math.max(0, stats.abroadTotalCost);
    });

    const netTotalProfit = totalItemRealizedProfit - totalMugLoss;

    return {
        isLoaded,
        transactions,
        addLogs,
        clearLogs,
        deleteLog,
        restoreData,
        editLog,
        renameItem,
        inventory,
        totalMugLoss,
        totalItemRealizedProfit,
        totalInventoryValue,
        netTotalProfit,
        weav3rApiKey,
        weav3rUserId,
        driveApiKey,
        saveWeaverConfig,
        saveDriveApiKey,
        needsMigration,
        performMigration,
        mergeTransactions,
        refreshDriveCache,
        syncState,
        driveCacheSyncedAt: typeof window !== "undefined"
            ? localStorage.getItem(DRIVE_CACHE_SYNCED_AT_KEY)
            : null
    };
}
