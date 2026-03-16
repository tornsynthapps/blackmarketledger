"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Transaction, ParsedLog, FLOWER_SET, PLUSHIE_SET } from '@/lib/parser';
import { sendToExtension } from '@/lib/bmlconnect';
import * as idb from '@/lib/idb';
import { setGlobalSyncStatus } from '@/lib/syncStatus';
import { loadGoogleDriveData, writeGoogleDriveData } from '@/lib/drive-api';

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
    totalCost: number;
    realizedProfit: number;
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

    const getActiveDB = useCallback((): idb.DBName => {
        const pref = localStorage.getItem("bml_storage_pref");
        return pref === "drive" ? "GoogleCacheLogsDB" : "LogsDB";
    }, []);

    const getOtherDB = useCallback((): idb.DBName => {
        const pref = localStorage.getItem("bml_storage_pref");
        return pref === "drive" ? "LogsDB" : "GoogleCacheLogsDB";
    }, []);

    const readCachedTransactions = useCallback(async (dbName: idb.DBName) => {
        try {
            return await idb.getAllTransactions<Transaction>(dbName);
        } catch (error) {
            console.error(`IndexedDB read failed for ${dbName}`, error);
            return [];
        }
    }, []);

    const persistTransactionsCache = useCallback(async (dbName: idb.DBName, newLogs: Transaction[]) => {
        try {
            await idb.saveTransactions(dbName, newLogs);
        } catch (error) {
            console.error(`IndexedDB write failed for ${dbName}`, error);
        }
    }, []);

    const readConfigCache = useCallback(async () => {
        try {
            return (await idb.get<string>("LogsDB", CONFIG_KEY)) || localStorage.getItem(CONFIG_KEY);
        } catch (error) {
            return localStorage.getItem(CONFIG_KEY);
        }
    }, []);

    const persistConfigCache = useCallback(async (value: string) => {
        try {
            await idb.set("LogsDB", CONFIG_KEY, value);
        } catch (error) {
            console.error("Failed to save config to LogsDB", error);
        }
        localStorage.setItem(CONFIG_KEY, value);
    }, []);

    const markDriveSyncComplete = useCallback(() => {
        localStorage.setItem(DRIVE_CACHE_SYNCED_AT_KEY, new Date().toISOString());
        sessionStorage.setItem(DRIVE_BOOTSTRAP_DONE_KEY, "true");
    }, []);

    const isDriveCacheFresh = useCallback((cachedTransactions: Transaction[]) => {
        const bootstrapDone = sessionStorage.getItem(DRIVE_BOOTSTRAP_DONE_KEY) === "true";
        const lastSyncedAt = localStorage.getItem(DRIVE_CACHE_SYNCED_AT_KEY);

        if (!bootstrapDone || !lastSyncedAt) {
            return false;
        }

        const syncedAtMs = new Date(lastSyncedAt).getTime();
        if (!Number.isFinite(syncedAtMs)) {
            return false;
        }

        if (Date.now() - syncedAtMs > DRIVE_SYNC_MAX_AGE_MS) {
            return false;
        }

        return cachedTransactions.length > 0;
    }, []);

    const fetchDriveTransactions = useCallback(async () => {
        if (!driveApiKey) {
            throw new Error("Google Drive sync key is not configured.");
        }

        const response = await loadGoogleDriveData(driveApiKey);
        if (!response.success) {
            throw new Error("Failed to download Drive data");
        }

        const driveTransactions = Array.isArray(response.data) ? response.data : [];
        await persistTransactionsCache("GoogleCacheLogsDB", driveTransactions);
        markDriveSyncComplete();
        return driveTransactions;
    }, [driveApiKey, markDriveSyncComplete, persistTransactionsCache]);

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
                const cachedConfig = await readConfigCache();
                if (cachedConfig) {
                    try {
                        parsedConfig = JSON.parse(cachedConfig);
                    } catch (e) {
                        console.error("Failed to parse config", e);
                    }
                }

                const storagePref = localStorage.getItem("bml_storage_pref");

                if (storagePref === 'extension') {
                    try {
                        const res = await sendToExtension<Transaction[]>({ type: "EXTENSION_DB_LOAD" });
                        if (res && res.success && Array.isArray(res.data)) {
                            loadedTransactions = res.data;
                        }
                    } catch (e) {
                        console.error("Failed to load from extension", e);
                    }
                } else if (storagePref === 'drive') {
                    const cachedTransactions = await readCachedTransactions("GoogleCacheLogsDB");
                    if (isDriveCacheFresh(cachedTransactions)) {
                        loadedTransactions = cachedTransactions;
                    } else {
                        loadedTransactions = cachedTransactions;
                        backgroundDriveRefresh = runSyncTask(
                            "Sync in progress: downloading latest data from Google Drive...",
                            fetchDriveTransactions
                        )
                            .then((fresh) => setTransactions(fresh))
                            .catch(e => console.error("Background Drive refresh failed", e));
                    }
                } else {
                    loadedTransactions = await readCachedTransactions("LogsDB");

                    if (loadedTransactions.length === 0 && localStorage.getItem("bml_db_version") !== "2") {
                        const legacyData = localStorage.getItem(STORAGE_KEY);
                        if (legacyData) {
                            try {
                                loadedTransactions = JSON.parse(legacyData);
                                await persistTransactionsCache("LogsDB", loadedTransactions);
                                localStorage.setItem("bml_db_version", "2");
                            } catch (e) {
                                console.error("Legacy migration failed", e);
                            }
                        }
                    }
                }

                setTransactions(loadedTransactions);

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
    }, [fetchDriveTransactions, getActiveDB, isDriveCacheFresh, persistTransactionsCache, readCachedTransactions, readConfigCache, runSyncTask]);

    const saveTransactions = useCallback((newLogs: Transaction[]) => {
        setTransactions(newLogs);
        const storagePref = localStorage.getItem("bml_storage_pref");

        if (storagePref === 'extension') {
            sendToExtension({ type: 'EXTENSION_DB_SAVE', payload: { logs: newLogs } }).catch(err => {
                console.error("Failed to save to extension DB", err);
            });
            persistTransactionsCache("LogsDB", newLogs).catch(console.error);
        } else if (storagePref === 'drive') {
            persistTransactionsCache("GoogleCacheLogsDB", newLogs).catch(console.error);

            if (!driveApiKey) return;

            runSyncTask(
                "Sync in progress: uploading latest data to Google Drive...",
                async () => {
                    const response = await writeGoogleDriveData(driveApiKey, newLogs);
                    if (!response.success) {
                        throw new Error("Failed to sync to Google Drive");
                    }
                    markDriveSyncComplete();
                }
            ).catch(err => console.error("Failed to sync to Google Drive", err));
        } else {
            persistTransactionsCache("LogsDB", newLogs).catch(console.error);
        }
    }, [driveApiKey, markDriveSyncComplete, persistTransactionsCache, runSyncTask]);

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

            merged.sort((a, b) => a.date - b.date);
            saveTransactions(merged);
            return merged;
        });
    }, [saveTransactions]);

    const saveWeaverConfig = useCallback(async (apiKey: string) => {
        const trimmedApiKey = apiKey.trim();
        const cfg = { apiKey: trimmedApiKey, userId: "", driveApiKey };

        if (trimmedApiKey) {
            const userId = await resolveTornUserId(trimmedApiKey);
            cfg.userId = userId;
            setWeav3rApiKey(trimmedApiKey);
            setWeav3rUserId(userId);
        } else {
            setWeav3rApiKey("");
            setWeav3rUserId("");
        }

        await persistConfigCache(JSON.stringify(cfg));
        return cfg.userId;
    }, [driveApiKey, persistConfigCache]);

    const saveDriveApiKey = useCallback(async (apiKey: string) => {
        setDriveApiKey(apiKey);
        const cfg = JSON.stringify({ apiKey: weav3rApiKey, userId: weav3rUserId, driveApiKey: apiKey });
        await persistConfigCache(cfg);
    }, [persistConfigCache, weav3rApiKey, weav3rUserId]);

    const calculateInventory = (txns: Transaction[]) => {
        const inv = new Map<string, InventoryItemStats>();
        // Add/Subtract 0.1 to date of each transaction based on BUY or SELL
        txns.forEach(t => {
            if (t.type === 'BUY') {
                t.date -= 0.1;
            } else {
                t.date += 0.1
            }
        })

        // Sort transactions by date.
        txns.sort((a, b) => a.date - b.date);
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
        parsedLogs.forEach((p, idx) => {
            const date = initialDate + idx;
            if (p.type === 'SELL' && !p.tag) {
                const currentInv = calculateInventory(currentTxns);
                const itemStats = currentInv.get(p.item);
                let remainingAmountToSell = p.amount;
                const normalAvail = itemStats?.stock || 0;
                const abroadAvail = itemStats?.abroadStock || 0;
                const toSave: Transaction[] = [];
                if (normalAvail >= remainingAmountToSell || (normalAvail <= 0 && abroadAvail <= 0)) {
                    toSave.push({ ...p, id: crypto.randomUUID(), date, tag: 'Normal' } as Transaction);
                } else if (normalAvail > 0 && remainingAmountToSell > normalAvail) {
                    toSave.push({ ...p, amount: normalAvail, id: crypto.randomUUID(), date, tag: 'Normal' } as Transaction);
                    remainingAmountToSell -= normalAvail;
                    if (abroadAvail > 0) {
                        const amountFromAbroad = Math.min(abroadAvail, remainingAmountToSell);
                        toSave.push({ ...p, amount: amountFromAbroad, id: crypto.randomUUID(), date: date + 1, tag: 'Abroad' } as Transaction);
                        remainingAmountToSell -= amountFromAbroad;
                    }
                    if (remainingAmountToSell > 0) {
                        toSave.push({ ...p, amount: remainingAmountToSell, id: crypto.randomUUID(), date: date + 2, tag: 'Normal' } as Transaction);
                    }
                } else if (normalAvail <= 0 && abroadAvail > 0) {
                    const amountFromAbroad = Math.min(abroadAvail, remainingAmountToSell);
                    toSave.push({ ...p, amount: amountFromAbroad, id: crypto.randomUUID(), date, tag: 'Abroad' } as Transaction);
                    remainingAmountToSell -= amountFromAbroad;
                    if (remainingAmountToSell > 0) {
                        toSave.push({ ...p, amount: remainingAmountToSell, id: crypto.randomUUID(), date: date + 1, tag: 'Normal' } as Transaction);
                    }
                }
                currentTxns = [...currentTxns, ...toSave];
            } else {
                currentTxns.push({
                    ...p,
                    id: crypto.randomUUID(),
                    date,
                    ...(p.type === 'BUY' && !p.tag ? { tag: 'Normal' } : {})
                } as Transaction);
            }
        });
        return currentTxns;
    }, [calculateInventory]);

    const addLogs = useCallback(async (parsedLogs: ParsedLog[]) => {
        const storagePref = localStorage.getItem("bml_storage_pref");
        const baseTransactions = storagePref === 'drive'
            ? await runSyncTask("Syncing...", fetchDriveTransactions)
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

    const switchStorageLocation = useCallback(async (newLocation: 'browser' | 'drive', migrationType: 'merge' | 'overwrite' | 'none') => {
        const sourceDB = newLocation === 'drive' ? 'LogsDB' : 'GoogleCacheLogsDB';
        const targetDB = newLocation === 'drive' ? 'GoogleCacheLogsDB' : 'LogsDB';

        let targetData: Transaction[] = [];

        if (migrationType !== 'none') {
            const sourceData = await readCachedTransactions(sourceDB);
            if (migrationType === 'overwrite') {
                targetData = sourceData;
            } else if (migrationType === 'merge') {
                const existingTarget = await readCachedTransactions(targetDB);
                const ids = new Set(existingTarget.map(t => t.id));
                targetData = [...existingTarget];
                sourceData.forEach(t => {
                    if (!ids.has(t.id)) {
                        targetData.push(t);
                        ids.add(t.id);
                    }
                });
                targetData.sort((a, b) => a.date - b.date);
            }

            await persistTransactionsCache(targetDB, targetData);
            if (newLocation === 'drive' && driveApiKey) {
                await runSyncTask("Uploading migrated data...", async () => {
                    await writeGoogleDriveData(driveApiKey, targetData);
                    markDriveSyncComplete();
                });
            }
        } else {
            targetData = await readCachedTransactions(targetDB);
        }

        localStorage.setItem("bml_storage_pref", newLocation);
        setTransactions(targetData);
    }, [driveApiKey, markDriveSyncComplete, persistTransactionsCache, readCachedTransactions, runSyncTask]);

    const inventory = calculateInventory(transactions);
    let totalMugLoss = 0;
    transactions.forEach(t => { if (t.type === 'MUG') totalMugLoss += t.amount; });
    let totalItemRealizedProfit = 0;
    let totalInventoryValue = 0;
    let totalAbroadRealizedProfit = 0;
    let totalAbroadInventoryValue = 0;
    inventory.forEach(stats => {
        totalItemRealizedProfit += stats.realizedProfit;
        totalInventoryValue += Math.max(0, stats.totalCost);
        totalAbroadRealizedProfit += stats.abroadRealizedProfit;
        totalAbroadInventoryValue += Math.max(0, stats.abroadTotalCost);
    });

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
        netTotalProfit: totalItemRealizedProfit - totalMugLoss,
        weav3rApiKey,
        weav3rUserId,
        driveApiKey,
        saveWeaverConfig,
        saveDriveApiKey,
        needsMigration,
        performMigration: () => window.location.reload(),
        mergeTransactions,
        refreshDriveCache,
        syncState,
        switchStorageLocation,
        readCachedTransactions,
        driveCacheSyncedAt: typeof window !== "undefined"
            ? localStorage.getItem(DRIVE_CACHE_SYNCED_AT_KEY)
            : null
    };
}
