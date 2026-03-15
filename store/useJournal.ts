"use client";

import { useState, useEffect, useCallback } from 'react';
import { Transaction, ParsedLog, FLOWER_SET, PLUSHIE_SET } from '@/lib/parser';
import { sendToExtension } from '@/lib/bmlconnect';
import * as idb from '@/lib/idb';

// A simple hook to manage transactions in localStorage and IndexedDB.
const STORAGE_KEY = 'torn_invest_tracker_logs';
const CONFIG_KEY = 'torn_invest_tracker_config';

const EXTENSION_ID = 'kmepclikpphdhmefmppjlmkigndpndel'; // Or use window.postMessage if simpler, but let's use postMessage for general web-to-ext

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

export function useJournal() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [needsMigration, setNeedsMigration] = useState(false);
    const [weav3rApiKey, setWeav3rApiKey] = useState("");
    const [weav3rUserId, setWeav3rUserId] = useState("");


    useEffect(() => {
        const init = async () => {
            let loadedTransactions: Transaction[] = [];
            let parsedConfig = null;

            // Load Config
            const idbConfig = await idb.get<string>(CONFIG_KEY);
            if (idbConfig) {
                try {
                    parsedConfig = JSON.parse(idbConfig);
                } catch (e) {
                    console.error("Failed to parse config from IDB", e);
                }
            } else {
                const lsConfig = localStorage.getItem(CONFIG_KEY);
                if (lsConfig) {
                    try {
                        parsedConfig = JSON.parse(lsConfig);
                        // Migrate config to IDB secretly
                        idb.set(CONFIG_KEY, lsConfig).catch(console.error);
                    } catch (e) {
                        console.error("Failed to parse config from LS", e);
                    }
                }
            }

            // Check storage preference
            const storagePref = localStorage.getItem("bml_storage_pref");
            let loadedFromExtension = false;

            if (storagePref === 'extension' || storagePref === 'drive') {
                try {
                    const res = await sendToExtension({ 
                        type: storagePref === 'drive' ? "DRIVE_LOAD_DATA" : "EXTENSION_DB_LOAD",
                    });
                    if (res && res.success && Array.isArray(res.data)) {
                        loadedTransactions = res.data;
                        loadedFromExtension = true;
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
                    loadedTransactions = await idb.getAllTransactions<Transaction>();
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
                    await idb.saveTransactions(loadedTransactions);
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
            }


            setIsLoaded(true);
        };

        init();
    }, []);



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
            idb.saveTransactions(newLogs).catch(console.error);
        } else if (storagePref === 'drive') {
            sendToExtension({ 
                type: 'DRIVE_WRITE_DATA', 
                payload: { data: newLogs },
            }).catch(err => {
                 console.error("Failed to sync to Google Drive", err);
            });
            idb.saveTransactions(newLogs).catch(console.error);
        } else {
            idb.saveTransactions(newLogs).catch(err => {
                console.error("Failed to save transactions to IDB", err);
                // Fallback for extreme failure situations if IDB crashes
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newLogs));
            });
        }
    }, []);

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

    const saveWeaverConfig = useCallback((apiKey: string, userId: string) => {
        setWeav3rApiKey(apiKey);
        setWeav3rUserId(userId);
        const str = JSON.stringify({ apiKey, userId });
        
        if (localStorage.getItem("bml_db_selection") === "indexeddb") {
            idb.set(CONFIG_KEY, str).catch(console.error);
        } else {
            localStorage.setItem(CONFIG_KEY, str);
        }
    }, []);

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

    const addLogs = useCallback((parsedLogs: ParsedLog[]) => {
        let currentTxns = [...transactions];
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

        saveTransactions(currentTxns);
    }, [saveTransactions, transactions]);

    const clearLogs = useCallback(() => {
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
        saveWeaverConfig,
        needsMigration,
        performMigration,
        mergeTransactions
    };
}
