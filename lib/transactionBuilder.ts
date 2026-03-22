import { Transaction, ParsedLog, TransactionTag, FLOWER_SET, PLUSHIE_SET } from './parser';

type ParsedBuyLog = ParsedLog & { type: 'BUY'; item: string; amount: number; price: number };
type ParsedSellLog = ParsedLog & { type: 'SELL'; item: string; amount: number; price: number };
type ParsedConvertOnlyLog = ParsedLog & { type: 'CONVERT'; fromItem: string; toItem: string; fromAmount: number; toAmount: number };
type ParsedSetConvertOnlyLog = ParsedLog & { type: 'SET_CONVERT'; setType: 'flower' | 'plushie'; times: number; pointsEarned: number };
type ParsedMugOnlyLog = ParsedLog & { type: 'MUG'; amount: number };

export interface LogBreakdown {
    completeCount: number;
    partialCount: number;
    skippedCount: number;
    filteredLogs: ParsedLog[];
}

export function calculateInventory(txns: Transaction[]): Map<string, any> {
    const inv = new Map<string, any>();
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
}

export function buildTransactionsWithLogs(baseTransactions: Transaction[], parsedLogs: ParsedLog[], skipNegativeStock: boolean = false): Transaction[] {
    const initialDate = Date.now();
    const resultTransactions: Transaction[] = [];
    const existingTornLogIds = new Set(
        baseTransactions
            .map((transaction) => transaction.tornLogId)
            .filter((value): value is string => Boolean(value))
    );

    // Create a deep copy of base transactions to compute initial inventory
    const baseCopy = JSON.parse(JSON.stringify(baseTransactions));
    const inventory = calculateInventory(baseCopy);

    const hasImportedTornLog = (log: ParsedLog) => Boolean(log.tornLogId && existingTornLogIds.has(log.tornLogId));
    const getTransactionDate = (log: ParsedLog, fallback: number) => log.loggedAt ?? fallback;
    const toTransaction = (log: ParsedLog, date: number, overrides: Partial<Transaction> = {}): Transaction => ({
        ...log,
        ...overrides,
        id: crypto.randomUUID(),
        date
    } as Transaction);

    // Separate parsed logs by type
    const buys: ParsedBuyLog[] = [];
    const converts: ParsedConvertOnlyLog[] = [];
    const setConverts: ParsedSetConvertOnlyLog[] = [];
    const sells: ParsedSellLog[] = [];
    const mugs: ParsedMugOnlyLog[] = [];

    parsedLogs.forEach((log) => {
        if (log.type === 'BUY') buys.push(log as ParsedBuyLog);
        else if (log.type === 'CONVERT') converts.push(log as ParsedConvertOnlyLog);
        else if (log.type === 'SET_CONVERT') setConverts.push(log as ParsedSetConvertOnlyLog);
        else if (log.type === 'SELL') sells.push(log as ParsedSellLog);
        else if (log.type === 'MUG') mugs.push(log as ParsedMugOnlyLog);
    });

    // Process buys first (increase inventory)
    buys.forEach((log, idx) => {
        if (hasImportedTornLog(log)) return;
        const date = getTransactionDate(log, initialDate + idx);
        const tag = log.tag || 'Normal';
        const itemStats = inventory.get(log.item) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
        if (tag === 'Abroad') {
            itemStats.abroadStock += log.amount;
            itemStats.abroadTotalCost += (log.price * log.amount);
        } else {
            itemStats.stock += log.amount;
            itemStats.totalCost += (log.price * log.amount);
        }
        inventory.set(log.item, itemStats);
        resultTransactions.push(toTransaction(log, date, { tag: tag as TransactionTag }));
    });

    // Process converts (transfer stock)
    converts.forEach((log, idx) => {
        if (hasImportedTornLog(log)) return;
        const date = getTransactionDate(log, initialDate + buys.length + idx);
        const fromStats = inventory.get(log.fromItem) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
        const availableStock = fromStats.stock;

        if (skipNegativeStock) {
            if (availableStock >= log.fromAmount) {
                // Full conversion
                const avgCost = fromStats.stock > 0 ? fromStats.totalCost / fromStats.stock : 0;
                const costAllocated = avgCost * log.fromAmount;
                fromStats.stock -= log.fromAmount;
                fromStats.totalCost -= costAllocated;
                inventory.set(log.fromItem, fromStats);
                const toStats = inventory.get(log.toItem) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
                toStats.stock += log.toAmount;
                toStats.totalCost += costAllocated;
                inventory.set(log.toItem, toStats);
                resultTransactions.push(toTransaction(log, date));
            } else if (availableStock > 0) {
                // Partial conversion
                const ratio = availableStock / log.fromAmount;
                const actualToAmount = Math.floor(log.toAmount * ratio);
                const avgCost = fromStats.stock > 0 ? fromStats.totalCost / fromStats.stock : 0;
                const costAllocated = avgCost * availableStock;
                fromStats.stock = 0;
                fromStats.totalCost = 0;
                inventory.set(log.fromItem, fromStats);
                const toStats = inventory.get(log.toItem) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
                toStats.stock += actualToAmount;
                toStats.totalCost += costAllocated;
                inventory.set(log.toItem, toStats);
                resultTransactions.push(toTransaction(log, date, { fromAmount: availableStock, toAmount: actualToAmount } as Partial<Transaction>));
            }
            // If skipNegativeStock is ON and availableStock <= 0, skip
        } else {
            // skipNegativeStock is OFF, apply as is
            const avgCost = fromStats.stock > 0 ? fromStats.totalCost / fromStats.stock : 0;
            const costAllocated = avgCost * log.fromAmount;
            fromStats.stock -= log.fromAmount;
            fromStats.totalCost -= costAllocated;
            inventory.set(log.fromItem, fromStats);
            const toStats = inventory.get(log.toItem) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
            toStats.stock += log.toAmount;
            toStats.totalCost += costAllocated;
            inventory.set(log.toItem, toStats);
            resultTransactions.push(toTransaction(log, date));
        }
    });

    // Process set converts
    setConverts.forEach((log, idx) => {
        if (hasImportedTornLog(log)) return;
        const date = getTransactionDate(log, initialDate + buys.length + converts.length + idx);
        const setItems = log.setType === 'flower' ? FLOWER_SET : PLUSHIE_SET;
        let minStock = Infinity;
        const itemStatsMap = new Map<string, any>();
        setItems.forEach(item => {
            const stats = inventory.get(item) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
            itemStatsMap.set(item, stats);
            minStock = Math.min(minStock, stats.stock);
        });

        if (skipNegativeStock) {
            if (minStock > 0) {
                const timesToApply = Math.min(minStock, log.times);
                const pointsEarned = timesToApply * 10;
                let totalCostOfGoods = 0;
                setItems.forEach(item => {
                    const stats = itemStatsMap.get(item)!;
                    const avgCost = stats.stock > 0 ? stats.totalCost / stats.stock : 0;
                    const costOfGoods = avgCost * timesToApply;
                    stats.stock -= timesToApply;
                    stats.totalCost -= costOfGoods;
                    inventory.set(item, stats);
                    totalCostOfGoods += costOfGoods;
                });
                const pointsStats = inventory.get('points') || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
                pointsStats.stock += pointsEarned;
                pointsStats.totalCost += totalCostOfGoods;
                inventory.set('points', pointsStats);
                resultTransactions.push(toTransaction(log, date, { times: timesToApply, pointsEarned } as Partial<Transaction>));
            }
            // skip if minStock <= 0
        } else {
            // skipNegativeStock is OFF, apply as is
            let totalCostOfGoods = 0;
            setItems.forEach(item => {
                const stats = itemStatsMap.get(item)!;
                const avgCost = stats.stock > 0 ? stats.totalCost / stats.stock : 0;
                const costOfGoods = avgCost * log.times;
                stats.stock -= log.times;
                stats.totalCost -= costOfGoods;
                inventory.set(item, stats);
                totalCostOfGoods += costOfGoods;
            });
            const pointsStats = inventory.get('points') || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
            pointsStats.stock += log.pointsEarned;
            pointsStats.totalCost += totalCostOfGoods;
            inventory.set('points', pointsStats);
            resultTransactions.push(toTransaction(log, date));
        }
    });

    // Process sells (consume inventory)
    sells.forEach((log, idx) => {
        if (hasImportedTornLog(log)) return;
        const date = getTransactionDate(log, initialDate + buys.length + converts.length + setConverts.length + idx);
        const itemStats = inventory.get(log.item) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };

        if (skipNegativeStock) {
            let normalAvail = itemStats.stock;
            let abroadAvail = itemStats.abroadStock;
            let remainingAmount = log.amount;
            const transactionsToAdd: Transaction[] = [];

            if (log.tag === 'Abroad') {
                const amountFromAbroad = Math.min(abroadAvail, remainingAmount);
                if (amountFromAbroad > 0) {
                    const avgCostBasis = abroadAvail > 0 ? itemStats.abroadTotalCost / abroadAvail : 0;
                    const costOfGoodsSold = avgCostBasis * amountFromAbroad;
                    const revenue = log.price * amountFromAbroad;
                    itemStats.abroadStock -= amountFromAbroad;
                    itemStats.abroadTotalCost -= costOfGoodsSold;
                    itemStats.abroadRealizedProfit += (revenue - costOfGoodsSold);
                    transactionsToAdd.push(toTransaction(log, date, { amount: amountFromAbroad, tag: 'Abroad' }));
                }
            } else if (log.tag === 'Normal') {
                const amountFromNormal = Math.min(normalAvail, remainingAmount);
                if (amountFromNormal > 0) {
                    const avgCostBasis = normalAvail > 0 ? itemStats.totalCost / normalAvail : 0;
                    const costOfGoodsSold = avgCostBasis * amountFromNormal;
                    const revenue = log.price * amountFromNormal;
                    itemStats.stock -= amountFromNormal;
                    itemStats.totalCost -= costOfGoodsSold;
                    itemStats.realizedProfit += (revenue - costOfGoodsSold);
                    transactionsToAdd.push(toTransaction(log, date, { amount: amountFromNormal, tag: 'Normal' }));
                }
            } else {
                if (normalAvail >= remainingAmount) {
                    // Enough normal stock
                    const avgCostBasis = normalAvail > 0 ? itemStats.totalCost / normalAvail : 0;
                    const costOfGoodsSold = avgCostBasis * remainingAmount;
                    const revenue = log.price * remainingAmount;
                    itemStats.stock -= remainingAmount;
                    itemStats.totalCost -= costOfGoodsSold;
                    itemStats.realizedProfit += (revenue - costOfGoodsSold);
                    transactionsToAdd.push(toTransaction(log, date, { tag: 'Normal' }));
                    remainingAmount = 0;
                } else {
                    // Use all normal, then some abroad
                    if (normalAvail > 0) {
                        const amountFromNormal = normalAvail;
                        const avgCostBasis = normalAvail > 0 ? itemStats.totalCost / normalAvail : 0;
                        const costOfGoodsSold = avgCostBasis * amountFromNormal;
                        const revenue = log.price * amountFromNormal;
                        itemStats.stock -= amountFromNormal;
                        itemStats.totalCost -= costOfGoodsSold;
                        itemStats.realizedProfit += (revenue - costOfGoodsSold);
                        transactionsToAdd.push(toTransaction(log, date, { amount: amountFromNormal, tag: 'Normal' }));
                        remainingAmount -= amountFromNormal;
                    }
                    if (remainingAmount > 0 && abroadAvail > 0) {
                        const amountFromAbroad = Math.min(abroadAvail, remainingAmount);
                        const avgCostBasis = abroadAvail > 0 ? itemStats.abroadTotalCost / abroadAvail : 0;
                        const costOfGoodsSold = avgCostBasis * amountFromAbroad;
                        const revenue = log.price * amountFromAbroad;
                        itemStats.abroadStock -= amountFromAbroad;
                        itemStats.abroadTotalCost -= costOfGoodsSold;
                        itemStats.abroadRealizedProfit += (revenue - costOfGoodsSold);
                        transactionsToAdd.push(toTransaction(log, date + 1, { amount: amountFromAbroad, tag: 'Abroad' }));
                    }
                }
            }
            inventory.set(log.item, itemStats);
            resultTransactions.push(...transactionsToAdd);
        } else {
            // skipNegativeStock is OFF, apply as is
            const tag = log.tag || 'Normal';
            if (tag === 'Abroad') {
                const avgCostBasis = itemStats.abroadStock > 0 ? itemStats.abroadTotalCost / itemStats.abroadStock : 0;
                const costOfGoodsSold = avgCostBasis * log.amount;
                const revenue = log.price * log.amount;
                itemStats.abroadStock -= log.amount;
                itemStats.abroadTotalCost -= costOfGoodsSold;
                itemStats.abroadRealizedProfit += (revenue - costOfGoodsSold);
            } else {
                const avgCostBasis = itemStats.stock > 0 ? itemStats.totalCost / itemStats.stock : 0;
                const costOfGoodsSold = avgCostBasis * log.amount;
                const revenue = log.price * log.amount;
                itemStats.stock -= log.amount;
                itemStats.totalCost -= costOfGoodsSold;
                itemStats.realizedProfit += (revenue - costOfGoodsSold);
            }
            inventory.set(log.item, itemStats);
            resultTransactions.push(toTransaction(log, date, { tag: tag as TransactionTag }));
        }
    });

    // Process mugs (no inventory effect)
    mugs.forEach((log, idx) => {
        if (hasImportedTornLog(log)) return;
        const date = getTransactionDate(log, initialDate + buys.length + converts.length + setConverts.length + sells.length + idx);
        resultTransactions.push(toTransaction(log, date));
    });

    return [...baseTransactions, ...resultTransactions];
}

export function getLogBreakdown(baseTransactions: Transaction[], parsedLogs: ParsedLog[], skipNegativeStock: boolean = false): LogBreakdown {
    let completeCount = 0;
    let partialCount = 0;
    let skippedCount = 0;
    const filteredLogs: ParsedLog[] = [];

    if (!skipNegativeStock) {
        return {
            completeCount: parsedLogs.length,
            partialCount: 0,
            skippedCount: 0,
            filteredLogs: [...parsedLogs]
        };
    }

    // Create a deep copy of base transactions to compute initial inventory
    const baseCopy = JSON.parse(JSON.stringify(baseTransactions));
    const inventory = calculateInventory(baseCopy);

    // Separate parsed logs by type
    const buys: ParsedBuyLog[] = [];
    const converts: ParsedConvertOnlyLog[] = [];
    const setConverts: ParsedSetConvertOnlyLog[] = [];
    const sells: ParsedSellLog[] = [];
    const mugs: ParsedMugOnlyLog[] = [];

    parsedLogs.forEach((log) => {
        if (log.type === 'BUY') buys.push(log as ParsedBuyLog);
        else if (log.type === 'CONVERT') converts.push(log as ParsedConvertOnlyLog);
        else if (log.type === 'SET_CONVERT') setConverts.push(log as ParsedSetConvertOnlyLog);
        else if (log.type === 'SELL') sells.push(log as ParsedSellLog);
        else if (log.type === 'MUG') mugs.push(log as ParsedMugOnlyLog);
    });

    // Step 1: Process Buys (always complete)
    buys.forEach(log => {
        completeCount++;
        filteredLogs.push(log);
        // Update inventory for subsequent logs
        const tag = (log as any).tag || 'Normal';
        const stats = inventory.get((log as any).item) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
        if (tag === 'Abroad') {
            stats.abroadStock += (log as any).amount;
        } else {
            stats.stock += (log as any).amount;
        }
        inventory.set((log as any).item, stats);
    });

    // Step 2: Process Mugs (always complete)
    mugs.forEach(log => {
        completeCount++;
        filteredLogs.push(log);
    });

    // Step 3: Process Converts
    converts.forEach(log => {
        const stats = inventory.get((log as any).fromItem) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
        const available = stats.stock;

        if (available >= (log as any).fromAmount) {
            completeCount++;
            filteredLogs.push(log);
            stats.stock -= (log as any).fromAmount;
            const toStats = inventory.get((log as any).toItem) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
            toStats.stock += (log as any).toAmount;
            inventory.set((log as any).fromItem, stats);
            inventory.set((log as any).toItem, toStats);
        } else if (available > 0) {
            partialCount++;
            const ratio = available / (log as any).fromAmount;
            const actualToAmount = Math.floor((log as any).toAmount * ratio);
            filteredLogs.push({ ...log, fromAmount: available, toAmount: actualToAmount } as any);
            stats.stock = 0;
            const toStats = inventory.get((log as any).toItem) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
            toStats.stock += actualToAmount;
            inventory.set((log as any).fromItem, stats);
            inventory.set((log as any).toItem, toStats);
        } else {
            skippedCount++;
        }
    });

    // Step 4: Process Set Converts
    setConverts.forEach(log => {
        const setItems = (log as any).setType === 'flower' ? FLOWER_SET : PLUSHIE_SET;
        let minStock = Infinity;
        setItems.forEach(item => {
            const stats = inventory.get(item) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
            minStock = Math.min(minStock, stats.stock);
        });

        if (minStock >= (log as any).times) {
            completeCount++;
            filteredLogs.push(log);
            setItems.forEach(item => {
                const stats = inventory.get(item)!;
                stats.stock -= (log as any).times;
                inventory.set(item, stats);
            });
        } else if (minStock > 0) {
            partialCount++;
            const timesToApply = minStock;
            const pointsEarned = timesToApply * 10;
            filteredLogs.push({ ...log, times: timesToApply, pointsEarned } as any);
            setItems.forEach(item => {
                const stats = inventory.get(item)!;
                stats.stock -= timesToApply;
                inventory.set(item, stats);
            });
        } else {
            skippedCount++;
        }
    });

    // Step 5: Process Sells
    sells.forEach(log => {
        const stats = inventory.get((log as any).item) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
        let normalAvail = stats.stock;
        let abroadAvail = stats.abroadStock;
        let remaining = (log as any).amount;

        if ((log as any).tag === 'Abroad') {
            const fromAbroad = Math.min(abroadAvail, remaining);
            if (fromAbroad > 0) {
                if (fromAbroad === (log as any).amount) completeCount++; else partialCount++;
                filteredLogs.push({ ...log, amount: fromAbroad } as any);
                stats.abroadStock -= fromAbroad;
            } else {
                skippedCount++;
            }
        } else if ((log as any).tag === 'Normal') {
            const fromNormal = Math.min(normalAvail, remaining);
            if (fromNormal > 0) {
                if (fromNormal === (log as any).amount) completeCount++; else partialCount++;
                filteredLogs.push({ ...log, amount: fromNormal } as any);
                stats.stock -= fromNormal;
            } else {
                skippedCount++;
            }
        } else {
            let soldNormal = 0;
            let soldAbroad = 0;

            soldNormal = Math.min(normalAvail, remaining);
            remaining -= soldNormal;
            if (remaining > 0) {
                soldAbroad = Math.min(abroadAvail, remaining);
                remaining -= soldAbroad;
            }

            const totalSold = soldNormal + soldAbroad;
            if (totalSold > 0) {
                if (totalSold === (log as any).amount) completeCount++; else partialCount++;
                
                if (soldNormal > 0 && soldAbroad > 0) {
                    filteredLogs.push({ ...log, amount: soldNormal, tag: 'Normal' } as any);
                    filteredLogs.push({ ...log, amount: soldAbroad, tag: 'Abroad' } as any);
                } else if (soldNormal > 0) {
                    filteredLogs.push({ ...log, amount: soldNormal, tag: 'Normal' } as any);
                } else {
                    filteredLogs.push({ ...log, amount: soldAbroad, tag: 'Abroad' } as any);
                }
                
                stats.stock -= soldNormal;
                stats.abroadStock -= soldAbroad;
            } else {
                skippedCount++;
            }
        }
        inventory.set((log as any).item, stats);
    });

    return { completeCount, partialCount, skippedCount, filteredLogs };
}
