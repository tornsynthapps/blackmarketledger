import { 
    Transaction, 
    ParsedLog, 
    TransactionTag, 
    FLOWER_SET, 
    PLUSHIE_SET,
    ParsedTradeLog,
    ParsedConvertLog,
    ParsedSetConvertLog,
    ParsedMugLog
} from './parser';


export interface LogBreakdown {
    completeCount: number;
    partialCount: number;
    skippedCount: number;
    filteredLogs: ParsedLog[];
}

export interface InventoryStats {
    stock: number;
    totalCost: number;
    realizedProfit: number;
    abroadStock: number;
    abroadTotalCost: number;
    abroadRealizedProfit: number;
}


export function calculateInventory(txns: Transaction[]): Map<string, InventoryStats> {
    const inv = new Map<string, InventoryStats>();

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

    // Create a deep copy of base transactions to compute initial inventory
    const baseCopy = JSON.parse(JSON.stringify(baseTransactions));
    const inventory = calculateInventory(baseCopy);

    // Separate parsed logs by type
    const buys: ParsedTradeLog[] = [];

    const converts: ParsedConvertLog[] = [];

    const setConverts: ParsedSetConvertLog[] = [];

    const sells: ParsedTradeLog[] = [];

    const mugs: ParsedMugLog[] = [];


    parsedLogs.forEach((log) => {
        if (log.type === 'BUY') buys.push(log);
        else if (log.type === 'CONVERT') converts.push(log);
        else if (log.type === 'SET_CONVERT') setConverts.push(log);
        else if (log.type === 'SELL') sells.push(log);
        else if (log.type === 'MUG') mugs.push(log);
    });

    // Process buys first (increase inventory)
    buys.forEach((log, idx) => {
        const date = initialDate + idx;
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
        resultTransactions.push({
            ...log,
            id: crypto.randomUUID(),
            date,
            tag: tag as TransactionTag
        } as Transaction);
    });

    // Process converts (transfer stock)
    converts.forEach((log, idx) => {
        const date = initialDate + buys.length + idx;
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
                resultTransactions.push({ ...log, id: crypto.randomUUID(), date } as Transaction);
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
                resultTransactions.push({ ...log, fromAmount: availableStock, toAmount: actualToAmount, id: crypto.randomUUID(), date } as Transaction);
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
            resultTransactions.push({ ...log, id: crypto.randomUUID(), date } as Transaction);
        }
    });

    // Process set converts
    setConverts.forEach((log, idx) => {
        const date = initialDate + buys.length + converts.length + idx;
        const setItems = log.setType === 'flower' ? FLOWER_SET : PLUSHIE_SET;
        let minStock = Infinity;
        const itemStatsMap = new Map<string, InventoryStats>();

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
                resultTransactions.push({ ...log, times: timesToApply, pointsEarned, id: crypto.randomUUID(), date } as Transaction);
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
            resultTransactions.push({ ...log, id: crypto.randomUUID(), date } as Transaction);
        }
    });

    // Process sells (consume inventory)
    sells.forEach((log, idx) => {
        const date = initialDate + buys.length + converts.length + setConverts.length + idx;
        const itemStats = inventory.get(log.item) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };

        if (skipNegativeStock) {
            const normalAvail = itemStats.stock;
            const abroadAvail = itemStats.abroadStock;

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
                    transactionsToAdd.push({ ...log, amount: amountFromAbroad, id: crypto.randomUUID(), date, tag: 'Abroad' } as Transaction);
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
                    transactionsToAdd.push({ ...log, amount: amountFromNormal, id: crypto.randomUUID(), date, tag: 'Normal' } as Transaction);
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
                    transactionsToAdd.push({ ...log, id: crypto.randomUUID(), date, tag: 'Normal' } as Transaction);
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
                        transactionsToAdd.push({ ...log, amount: amountFromNormal, id: crypto.randomUUID(), date, tag: 'Normal' } as Transaction);
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
                        transactionsToAdd.push({ ...log, amount: amountFromAbroad, id: crypto.randomUUID(), date: date + 1, tag: 'Abroad' } as Transaction);
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
            resultTransactions.push({ ...log, id: crypto.randomUUID(), date, tag: tag as TransactionTag } as Transaction);
        }
    });

    // Process mugs (no inventory effect)
    mugs.forEach((log, idx) => {
        const date = initialDate + buys.length + converts.length + setConverts.length + sells.length + idx;
        resultTransactions.push({ ...log, id: crypto.randomUUID(), date } as Transaction);
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
    const buys: ParsedTradeLog[] = [];
    const converts: ParsedConvertLog[] = [];
    const setConverts: ParsedSetConvertLog[] = [];
    const sells: ParsedTradeLog[] = [];
    const mugs: ParsedMugLog[] = [];

    parsedLogs.forEach((log) => {
        if (log.type === 'BUY') buys.push(log);
        else if (log.type === 'CONVERT') converts.push(log);
        else if (log.type === 'SET_CONVERT') setConverts.push(log);
        else if (log.type === 'SELL') sells.push(log);
        else if (log.type === 'MUG') mugs.push(log);
    });

    // Step 1: Process Buys (always complete)
    buys.forEach(log => {
        completeCount++;
        filteredLogs.push(log);
        // Update inventory for subsequent logs
        const tag = log.tag || 'Normal';
        const stats = inventory.get(log.item) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
        if (tag === 'Abroad') {
            stats.abroadStock += log.amount;
        } else {
            stats.stock += log.amount;
        }
        inventory.set(log.item, stats);
    });

    // Step 2: Process Mugs (always complete)
    mugs.forEach(log => {
        completeCount++;
        filteredLogs.push(log);
    });

    // Step 3: Process Converts
    converts.forEach(log => {
        const stats = inventory.get(log.fromItem) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
        const available = stats.stock;

        if (available >= log.fromAmount) {
            completeCount++;
            filteredLogs.push(log);
            stats.stock -= log.fromAmount;
            const toStats = inventory.get(log.toItem) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
            toStats.stock += log.toAmount;
            inventory.set(log.fromItem, stats);
            inventory.set(log.toItem, toStats);
        } else if (available > 0) {
            partialCount++;
            const ratio = available / log.fromAmount;
            const actualToAmount = Math.floor(log.toAmount * ratio);
            filteredLogs.push({ ...log, fromAmount: available, toAmount: actualToAmount } as ParsedConvertLog);

            stats.stock = 0;
            const toStats = inventory.get(log.toItem) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
            toStats.stock += actualToAmount;
            inventory.set(log.fromItem, stats);
            inventory.set(log.toItem, toStats);
        } else {
            skippedCount++;
        }
    });

    // Step 4: Process Set Converts
    setConverts.forEach(log => {
        const setItems = log.setType === 'flower' ? FLOWER_SET : PLUSHIE_SET;
        let minStock = Infinity;
        setItems.forEach(item => {
            const stats = inventory.get(item) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
            minStock = Math.min(minStock, stats.stock);
        });

        if (minStock >= log.times) {
            completeCount++;
            filteredLogs.push(log);
            setItems.forEach(item => {
                const stats = inventory.get(item)!;
                stats.stock -= log.times;
                inventory.set(item, stats);
            });
        } else if (minStock > 0) {
            partialCount++;
            const timesToApply = minStock;
            const pointsEarned = timesToApply * 10;
            filteredLogs.push({ ...log, times: timesToApply, pointsEarned } as ParsedSetConvertLog);

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
        const stats = inventory.get(log.item) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
        const normalAvail = stats.stock;
        const abroadAvail = stats.abroadStock;

        let remaining = log.amount;

        if (log.tag === 'Abroad') {
            const fromAbroad = Math.min(abroadAvail, remaining);
            if (fromAbroad > 0) {
                if (fromAbroad === log.amount) completeCount++; else partialCount++;
                filteredLogs.push({ ...log, amount: fromAbroad } as ParsedTradeLog);
                stats.abroadStock -= fromAbroad;
            } else {
                skippedCount++;
            }
        } else if (log.tag === 'Normal') {
            const fromNormal = Math.min(normalAvail, remaining);
            if (fromNormal > 0) {
                if (fromNormal === log.amount) completeCount++; else partialCount++;
                filteredLogs.push({ ...log, amount: fromNormal } as ParsedTradeLog);
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
                if (totalSold === log.amount) completeCount++; else partialCount++;
                
                if (soldNormal > 0 && soldAbroad > 0) {
                    filteredLogs.push({ ...log, amount: soldNormal, tag: 'Normal' } as ParsedTradeLog);
                    filteredLogs.push({ ...log, amount: soldAbroad, tag: 'Abroad' } as ParsedTradeLog);
                } else if (soldNormal > 0) {
                    filteredLogs.push({ ...log, amount: soldNormal, tag: 'Normal' } as ParsedTradeLog);
                } else {
                    filteredLogs.push({ ...log, amount: soldAbroad, tag: 'Abroad' } as ParsedTradeLog);
                }

                
                stats.stock -= soldNormal;
                stats.abroadStock -= soldAbroad;
            } else {
                skippedCount++;
            }
        }
        inventory.set(log.item, stats);
    });

    return { completeCount, partialCount, skippedCount, filteredLogs };
}