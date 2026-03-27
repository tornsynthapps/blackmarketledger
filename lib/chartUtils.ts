import { Transaction, FLOWER_SET, PLUSHIE_SET } from '@/lib/parser';

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

export const getInventoryEntry = (inventory: Map<string, InventorySnapshot>, item: string) => {
  return inventory.get(item) || {
    stock: 0,
    totalCost: 0,
    realizedProfit: 0,
    abroadStock: 0,
    abroadTotalCost: 0,
    abroadRealizedProfit: 0
  };
};

export const applyTransaction = (
  inventory: Map<string, InventorySnapshot>,
  transaction: Transaction,
  mugState: { total: number },
  isTrackedItem: (item: string) => boolean = () => true
) => {
  switch (transaction.type) {
    case 'BUY': {
      if (!isTrackedItem(transaction.item)) return;
      const current = getInventoryEntry(inventory, transaction.item);
      if (transaction.tag === 'Abroad') {
        current.abroadStock += transaction.amount;
        current.abroadTotalCost += transaction.price * transaction.amount;
      } else {
        current.stock += transaction.amount;
        current.totalCost += transaction.price * transaction.amount;
      }
      inventory.set(transaction.item, current);
      return;
    }
    case 'SELL': {
      if (!isTrackedItem(transaction.item)) return;
      const current = getInventoryEntry(inventory, transaction.item);
      if (transaction.tag === 'Abroad') {
        const avgCost = current.abroadStock > 0 ? current.abroadTotalCost / current.abroadStock : 0;
        const costOfGoodsSold = avgCost * transaction.amount;
        current.abroadStock -= transaction.amount;
        current.abroadTotalCost -= costOfGoodsSold;
        current.abroadRealizedProfit += transaction.price * transaction.amount - costOfGoodsSold;
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
    case 'MUG':
      mugState.total += transaction.amount;
      return;
    case 'CONVERT': {
      const fromCurrent = getInventoryEntry(inventory, transaction.fromItem);
      const fromAvgCost = fromCurrent.stock > 0 ? fromCurrent.totalCost / fromCurrent.stock : 0;
      const fromCostOfGoods = fromAvgCost * transaction.fromAmount;

      if (isTrackedItem(transaction.fromItem)) {
        fromCurrent.stock -= transaction.fromAmount;
        fromCurrent.totalCost -= fromCostOfGoods;
        inventory.set(transaction.fromItem, fromCurrent);
      }

      if (isTrackedItem(transaction.toItem)) {
        const toCurrent = getInventoryEntry(inventory, transaction.toItem);
        toCurrent.stock += transaction.toAmount;
        toCurrent.totalCost += fromCostOfGoods;
        inventory.set(transaction.toItem, toCurrent);
      }
      return;
    }
    case 'SET_CONVERT': {
      const setItems = transaction.setType === 'flower' ? FLOWER_SET : PLUSHIE_SET;

      let totalCostOfGoods = 0;

      setItems.forEach(item => {
        const current = getInventoryEntry(inventory, item);
        const avgCost = current.stock > 0 ? current.totalCost / current.stock : 0;
        const costOfGoods = avgCost * transaction.times;

        if (isTrackedItem(item)) {
          current.stock -= transaction.times;
          current.totalCost -= costOfGoods;
          inventory.set(item, current);
        }

        totalCostOfGoods += costOfGoods;
      });

      if (isTrackedItem('points')) {
        const pointsCurrent = getInventoryEntry(inventory, 'points');
        pointsCurrent.stock += transaction.pointsEarned;
        pointsCurrent.totalCost += totalCostOfGoods;
        inventory.set('points', pointsCurrent);
      }
    }
  }
};

export const getTotals = (inventory: Map<string, InventorySnapshot>, totalMugLoss: number): LedgerTotals => {
  let profit = 0, inventoryVal = 0;
  let abroadProfit = 0, abroadInventory = 0;
  let museumProfit = 0, museumInventory = 0;

  inventory.forEach((item, name) => {
    const isMuseum = name.toLowerCase() === 'points' || name.toLowerCase() === 'flushie';
    if (isMuseum) {
      museumProfit += item.realizedProfit;
      museumInventory += Math.max(0, item.totalCost);
    } else {
      profit += item.realizedProfit;
      inventoryVal += Math.max(0, item.totalCost);
      abroadProfit += item.abroadRealizedProfit;
      abroadInventory += Math.max(0, item.abroadTotalCost);
    }
  });

  return {
    profit,
    inventory: inventoryVal,
    abroadProfit,
    abroadInventory,
    museumProfit,
    museumInventory,
    mugLoss: totalMugLoss,
    netProfit: profit - totalMugLoss
  };
};
