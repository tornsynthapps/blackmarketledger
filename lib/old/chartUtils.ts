import type { Transaction as LegacyTransaction } from "@/lib/parser";
import type {
    AnyTrackedTransaction,
    MugTransaction,
    Transaction as NewTransaction,
} from "@/lib/old/interfaces/transactions";

export type InventorySnapshot = {
    stock: number;
    totalCost: number;
    realizedProfit: number;
    abroadStock: number;
    abroadTotalCost: number;
    abroadRealizedProfit: number;
};

export type LedgerTotals = {
    profit: number;
    inventory: number;
    abroadProfit: number;
    abroadInventory: number;
    museumProfit: number;
    museumInventory: number;
    mugLoss: number;
    netProfit: number;
};

function createEntry(): InventorySnapshot {
    return {
        stock: 0,
        totalCost: 0,
        realizedProfit: 0,
        abroadStock: 0,
        abroadTotalCost: 0,
        abroadRealizedProfit: 0,
    };
}

function isLegacyTransaction(
    transaction: LegacyTransaction | AnyTrackedTransaction
): transaction is LegacyTransaction {
    return "date" in transaction && "type" in transaction;
}

function isNewConcreteTransaction(
    transaction: LegacyTransaction | AnyTrackedTransaction
): transaction is NewTransaction {
    return "isWrapper" in transaction && transaction.isWrapper === false;
}

function isNewMugTransaction(
    transaction: LegacyTransaction | AnyTrackedTransaction
): transaction is MugTransaction {
    return "kind" in transaction && transaction.kind === "mug";
}

function getTrackedName(transaction: NewTransaction) {
    return transaction.itemName || `item-${transaction.itemID}`;
}

export const getInventoryEntry = (inventory: Map<string, InventorySnapshot>, item: string) => {
    return inventory.get(item) || createEntry();
};

export const applyTransaction = (
    inventory: Map<string, InventorySnapshot>,
    transaction: LegacyTransaction | AnyTrackedTransaction,
    mugState: { total: number },
    isTrackedItem: (item: string) => boolean = () => true
) => {
    if (isNewConcreteTransaction(transaction)) {
        if (isNewMugTransaction(transaction)) {
            mugState.total += transaction.amount;
            return;
        }

        if (transaction.stockType === "skip") return;
        const itemName = getTrackedName(transaction);
        if (!isTrackedItem(itemName)) return;
        const current = getInventoryEntry(inventory, itemName);

        if (transaction.amount >= 0) {
            if (transaction.stockType === "abroad") {
                current.abroadStock += transaction.amount;
                current.abroadTotalCost += transaction.price * transaction.amount;
            } else {
                current.stock += transaction.amount;
                current.totalCost += transaction.price * transaction.amount;
            }
        } else if (transaction.stockType === "abroad") {
            const amount = Math.abs(transaction.amount);
            const avgCost =
                current.abroadStock > 0 ? current.abroadTotalCost / current.abroadStock : 0;
            const costOfGoodsSold = avgCost * amount;
            current.abroadStock -= amount;
            current.abroadTotalCost -= costOfGoodsSold;
            current.abroadRealizedProfit += transaction.price * amount - costOfGoodsSold;
        } else {
            const amount = Math.abs(transaction.amount);
            const avgCost = current.stock > 0 ? current.totalCost / current.stock : 0;
            const costOfGoodsSold = avgCost * amount;
            current.stock -= amount;
            current.totalCost -= costOfGoodsSold;
            current.realizedProfit += transaction.price * amount - costOfGoodsSold;
        }

        inventory.set(itemName, current);
        return;
    }

    if (!isLegacyTransaction(transaction)) {
        return;
    }

    switch (transaction.type) {
        case "BUY": {
            if (!isTrackedItem(transaction.item)) return;
            const current = getInventoryEntry(inventory, transaction.item);
            if (transaction.tag === "Abroad") {
                current.abroadStock += transaction.amount;
                current.abroadTotalCost += transaction.price * transaction.amount;
            } else {
                current.stock += transaction.amount;
                current.totalCost += transaction.price * transaction.amount;
            }
            inventory.set(transaction.item, current);
            return;
        }
        case "SELL": {
            if (!isTrackedItem(transaction.item)) return;
            const current = getInventoryEntry(inventory, transaction.item);
            if (transaction.tag === "Abroad") {
                const avgCost =
                    current.abroadStock > 0 ? current.abroadTotalCost / current.abroadStock : 0;
                const costOfGoodsSold = avgCost * transaction.amount;
                current.abroadStock -= transaction.amount;
                current.abroadTotalCost -= costOfGoodsSold;
                current.abroadRealizedProfit +=
                    transaction.price * transaction.amount - costOfGoodsSold;
            } else {
                const avgCost = current.stock > 0 ? current.totalCost / current.stock : 0;
                const costOfGoodsSold = avgCost * transaction.amount;
                current.stock -= transaction.amount;
                current.totalCost -= costOfGoodsSold;
                current.realizedProfit += transaction.price * transaction.amount - costOfGoodsSold;
            }
            inventory.set(transaction.item, current);
            return;
        }
        case "MUG":
            mugState.total += transaction.amount;
            return;
        default:
            return;
    }
};

export const getTotals = (
    inventory: Map<string, InventorySnapshot>,
    totalMugLoss: number
): LedgerTotals => {
    let profit = 0;
    let inventoryVal = 0;
    let abroadProfit = 0;
    let abroadInventory = 0;
    let museumProfit = 0;
    let museumInventory = 0;

    inventory.forEach((item, name) => {
        const isMuseum = name.toLowerCase() === "points";
        if (isMuseum) {
            museumProfit += item.realizedProfit;
            museumInventory += Math.max(0, item.totalCost);
        } else {
            profit += item.realizedProfit;
            inventoryVal += Math.max(0, item.totalCost);
        }

        // Abroad profit and inventory should be tracked for all items,
        // including those that might be considered "museum" items (flowers/plushies)
        // if they were bought abroad.
        abroadProfit += item.abroadRealizedProfit;
        abroadInventory += Math.max(0, item.abroadTotalCost);
    });

    return {
        profit,
        inventory: inventoryVal,
        abroadProfit,
        abroadInventory,
        museumProfit,
        museumInventory,
        mugLoss: totalMugLoss,
        netProfit: profit + museumProfit + abroadProfit - totalMugLoss,
    };
};
