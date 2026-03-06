"use client";

import { useState, useEffect, useCallback } from 'react';
import { Transaction, ParsedLog } from '@/lib/parser';

// A simple hook to manage transactions in localStorage.
const STORAGE_KEY = 'torn_invest_tracker_logs';
const CONFIG_KEY = 'torn_invest_tracker_config';

export interface InventoryItemStats {
    stock: number;
    totalCost: number; // for calculating average cost basis
    realizedProfit: number; // profit from selling
}

export function useJournal() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [weav3rApiKey, setWeav3rApiKey] = useState("");
    const [weav3rUserId, setWeav3rUserId] = useState("");

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                setTransactions(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse logs", e);
            }
        }

        const configStr = localStorage.getItem(CONFIG_KEY);
        if (configStr) {
            try {
                const config = JSON.parse(configStr);
                setWeav3rApiKey(config.apiKey || "");
                setWeav3rUserId(config.userId || "");
            } catch (e) {
                console.error("Failed to parse config", e);
            }
        }

        setIsLoaded(true);
    }, []);

    const saveTransactions = useCallback((newLogs: Transaction[]) => {
        setTransactions(newLogs);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newLogs));
    }, []);

    const saveWeaverConfig = useCallback((apiKey: string, userId: string) => {
        setWeav3rApiKey(apiKey);
        setWeav3rUserId(userId);
        localStorage.setItem(CONFIG_KEY, JSON.stringify({ apiKey, userId }));
    }, []);

    const addLogs = useCallback((parsedLogs: ParsedLog[]) => {
        const newTxns: Transaction[] = parsedLogs.map(p => ({
            ...p,
            id: crypto.randomUUID(),
            date: Date.now()
        } as Transaction));

        saveTransactions([...transactions, ...newTxns]);
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
        // Prevent renaming to empty string
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

    // Derived state: Inventory Map
    const inventory = new Map<string, InventoryItemStats>();
    let totalMugLoss = 0;

    transactions.forEach(t => {
        if (t.type === 'MUG') {
            totalMugLoss += t.amount;
        } else if (t.type === 'BUY') {
            const current = inventory.get(t.item) || { stock: 0, totalCost: 0, realizedProfit: 0 };
            current.stock += t.amount;
            current.totalCost += (t.price * t.amount);
            inventory.set(t.item, current);
        } else if (t.type === 'SELL') {
            const current = inventory.get(t.item) || { stock: 0, totalCost: 0, realizedProfit: 0 };

            const avgCostBasis = current.stock > 0 ? (current.totalCost / current.stock) : 0;
            const costOfGoodsSold = avgCostBasis * t.amount;
            const revenue = t.price * t.amount;

            current.stock -= t.amount;
            // Reduce the pool of total cost proportional to items sold
            current.totalCost -= costOfGoodsSold;
            current.realizedProfit += (revenue - costOfGoodsSold);

            inventory.set(t.item, current);
        } else if (t.type === 'CONVERT') {
            // Deduct fromItem (Flushie)
            const fromCurr = inventory.get(t.fromItem) || { stock: 0, totalCost: 0, realizedProfit: 0 };
            const fromAvgCost = fromCurr.stock > 0 ? (fromCurr.totalCost / fromCurr.stock) : 0;
            const fromCostOfGoods = fromAvgCost * t.fromAmount;
            fromCurr.stock -= t.fromAmount;
            fromCurr.totalCost -= fromCostOfGoods;
            inventory.set(t.fromItem, fromCurr);

            // Add toItem (Points) - Cost basis is the cost of the Flushies converted!
            const toCurr = inventory.get(t.toItem) || { stock: 0, totalCost: 0, realizedProfit: 0 };
            toCurr.stock += t.toAmount;
            toCurr.totalCost += fromCostOfGoods;
            inventory.set(t.toItem, toCurr);
        }
    });

    let totalItemRealizedProfit = 0;
    let totalInventoryValue = 0; // calculated at avg cost basis

    inventory.forEach(stats => {
        totalItemRealizedProfit += stats.realizedProfit;
        totalInventoryValue += Math.max(0, stats.totalCost);
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
    };
}
