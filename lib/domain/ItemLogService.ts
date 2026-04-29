import { BaseService } from "./BaseService";
import { ItemLog, ItemLogCategories, ItemLogRegistry, type ItemLogCreateFields } from "../objects/ItemLog";
import { ItemLogWrapper, ItemLogWrapperRegistry } from "../objects/ItemLogWrapper";

/**
 * Service for managing item logs.
 * Handles the business logic for creating, retrieving, and persisting item logs.
 */
export class ItemLogService extends BaseService {
    private readonly registry: ItemLogRegistry;
    private readonly wrapperRegistry: ItemLogWrapperRegistry;

    public readonly CATEGORY_PRIORITY: ItemLogCategories[] = [
        "normal",
        "abroad",
        "city-finds",
        "museum",
    ];

    /**
     * Creates a new instance of ItemLogService.
     * @returns (ItemLogService): Item log service instance
     * @sideEffects Initializes the ItemLogRegistry and ItemLogWrapperRegistry
     */
    constructor() {
        super();
        this.registry = new ItemLogRegistry();
        this.wrapperRegistry = new ItemLogWrapperRegistry();
    }

    /**
     * Creates and persists a new item log.
     * @param fields (ItemLogCreateFields): Data for the new item log
     * @returns (Promise<number>): The persisted ID of the new item log
     * @sideEffects Writes to IndexedDB via ItemLogRegistry
     */
    public async addItemLog(fields: ItemLogCreateFields): Promise<number> {
        const itemLog = ItemLog.create(fields);
        return await this.registry.put(itemLog);
    }

    /**
     * Retrieves all item logs from storage.
     * @returns (Promise<ItemLog[]>): Array of hydrated ItemLog objects
     * @sideEffects Reads from IndexedDB via ItemLogRegistry
     */
    public async getAllLogs(): Promise<ItemLog[]> {
        return await this.registry.getAll();
    }

    /**
     * Retrieves a specific item log by its ID.
     * @param id (number): The unique identifier of the item log
     * @returns (Promise<ItemLog | undefined>): The found ItemLog or undefined
     * @sideEffects Reads from IndexedDB via ItemLogRegistry
     */
    public async getLogById(id: number): Promise<ItemLog | undefined> {
        return await this.registry.getById(id);
    }

    /**
     * Deletes an item log by its ID.
     * @param id (number): The unique identifier of the item log
     * @returns (Promise<void>)
     * @sideEffects Writes to IndexedDB via ItemLogRegistry
     */
    public async deleteLog(id: number): Promise<void> {
        await this.registry.delete(id);
    }

    /**
     * Directly updates an item log. Use with caution as it bypasses business logic.
     * @param log (ItemLog): The item log instance to update
     * @returns (Promise<number>): The updated log ID
     * @sideEffects Writes to IndexedDB via ItemLogRegistry
     */
    public async updateLog(log: ItemLog): Promise<number> {
        return await this.registry.put(log);
    }

    /**
     * Retrieves all item log wrappers.
     * @returns (Promise<ItemLogWrapper[]>): Array of all wrappers
     * @sideEffects Reads from IndexedDB via ItemLogWrapperRegistry
     */
    public async getAllWrappers(): Promise<ItemLogWrapper[]> {
        return await this.wrapperRegistry.getAll();
    }

    /**
     * Deletes a wrapper by its ID.
     * @param id (number): The unique identifier of the wrapper
     * @returns (Promise<void>)
     * @sideEffects Writes to IndexedDB via ItemLogWrapperRegistry
     */
    public async deleteWrapper(id: number): Promise<void> {
        await this.wrapperRegistry.delete(id);
    }

    /**
     * Directly updates an item log wrapper. Use with caution as it bypasses business logic.
     * @param wrapper (ItemLogWrapper): The wrapper instance to update
     * @returns (Promise<number>): The updated wrapper ID
     * @sideEffects Writes to IndexedDB via ItemLogWrapperRegistry
     */
    public async updateWrapper(wrapper: ItemLogWrapper): Promise<number> {
        return await this.wrapperRegistry.put(wrapper);
    }

    /**
     * Recalculates and updates the cost-basis (total stock and total cost) for all logs of a given item.
     * Starts recalculation from the provided timestamp onwards.
     * @param itemId (number): Unique identifier of the item
     * @param fromTimestamp (number): The starting domain timestamp for recalculation
     * @returns (Promise<void>)
     * @sideEffects Reads from and writes to IndexedDB via ItemLogRegistry and ItemLogWrapperRegistry
     */
    public async updateCostBasis(itemId: number, fromTimestamp: number): Promise<void> {
        const allLogs = await this.registry.getLogsByItemId(itemId);

        if (allLogs.length === 0) {
            return;
        }

        // Initialize category-specific running totals
        const runningTotals = await this.registry.getLatestTotalsPerCategoryBefore(
            itemId,
            fromTimestamp
        );

        const updatedLogs: ItemLog[] = [];

        for (let i = 0; i < allLogs.length; i++) {
            const log = allLogs[i];

            // Case: Log is before the start timestamp
            if (log.timestamp < fromTimestamp) {
                // We've already initialized runningTotals using the latest logs before fromTimestamp
                // But we still need to track them for logs that ARE in allLogs but before fromTimestamp
                // so that when we reach fromTimestamp, we have the correct state.
                runningTotals.set(log.category, { stock: log.total_stock, cost: log.total_cost });
                continue;
            }

            // Case: Log is after the start timestamp, but without a wrapper
            if (log.wrapper_id === null) {
                // Calculate new totals for this log based on its category
                const categoryTotals = runningTotals.get(log.category) || { stock: 0, cost: 0 };
                const quantity = log.quantity;
                const unitPrice = log.unit_price;
                let realizedProfit = 0;

                if (quantity > 0) {
                    // Buy: Increase stock and increase total cost by purchase amount
                    categoryTotals.stock += quantity;
                    categoryTotals.cost += quantity * unitPrice;
                } else if (quantity < 0) {
                    const absQuantity = Math.abs(quantity);
                    const currentAverageCost =
                        categoryTotals.stock > 0 ? categoryTotals.cost / categoryTotals.stock : 0;

                    if (absQuantity <= categoryTotals.stock) {
                        // Standard Sell: Fully covered by existing stock in this category
                        const costOfGoodsSold = absQuantity * currentAverageCost;
                        realizedProfit = absQuantity * unitPrice - costOfGoodsSold;

                        categoryTotals.stock -= absQuantity;
                        categoryTotals.cost -= costOfGoodsSold;
                    } else {
                        // Over-Sell: Part of the sell exceeds current stock in this category.
                        // We split the log into multiple logs across categories.

                        const wrapper = ItemLogWrapper.create({
                            timestamp: log.timestamp,
                            type: "trade-split",
                            description: `Automatic split: ${absQuantity} total from ${log.category} overflow.`,
                        });
                        const wrapperId = await this.wrapperRegistry.put(wrapper);

                        let remainingToSell = absQuantity;

                        // 1. Use up current category stock first
                        const coveredInCurrent = categoryTotals.stock;
                        const currentCOGS = coveredInCurrent * currentAverageCost;

                        categoryTotals.stock = 0;
                        categoryTotals.cost = 0;
                        runningTotals.set(log.category, categoryTotals);

                        const originalLogUpdated = log.withTotals(0, 0, {
                            quantity: -coveredInCurrent,
                            wrapper_id: wrapperId,
                            realized_profit: coveredInCurrent * unitPrice - currentCOGS,
                        });
                        updatedLogs.push(originalLogUpdated);
                        remainingToSell -= coveredInCurrent;

                        // 2. Loop through other priority categories
                        for (const cat of this.CATEGORY_PRIORITY) {
                            if (remainingToSell <= 0) break;
                            if (cat === (log.category as ItemLogCategories)) continue;

                            const catTotals = runningTotals.get(cat) || { stock: 0, cost: 0 };
                            if (catTotals.stock <= 0) continue;

                            const usedFromCat = Math.min(remainingToSell, catTotals.stock);
                            const catAvgCost = catTotals.cost / catTotals.stock;
                            const catCOGS = usedFromCat * catAvgCost;

                            catTotals.stock -= usedFromCat;
                            catTotals.cost -= catCOGS;
                            runningTotals.set(cat, catTotals);

                            const splitLog = ItemLog.create({
                                timestamp: log.timestamp,
                                item_id: log.item_id,
                                quantity: -usedFromCat,
                                unit_price: unitPrice,
                                category: cat,
                                wrapper_id: wrapperId,
                                total_stock: catTotals.stock,
                                total_cost: catTotals.cost,
                                realized_profit: usedFromCat * unitPrice - catCOGS,
                            });
                            const splitLogId = await this.registry.put(splitLog);
                            splitLog.applyPersistedId(splitLogId);

                            remainingToSell -= usedFromCat;
                        }

                        // 3. Move all the remaining quantity to the "skipped" category
                        if (remainingToSell > 0) {
                            // Skipped category has 0 cost basis
                            const skippedLog = ItemLog.create({
                                timestamp: log.timestamp,
                                item_id: log.item_id,
                                quantity: -remainingToSell,
                                unit_price: unitPrice,
                                category: "skipped",
                                wrapper_id: wrapperId,
                                total_stock: 0,
                                total_cost: 0,
                                realized_profit: remainingToSell * unitPrice,
                            });
                            const skippedLogId = await this.registry.put(skippedLog);
                            skippedLog.applyPersistedId(skippedLogId);
                        }

                        continue;
                    }
                }

                // Update running totals for this category
                runningTotals.set(log.category, categoryTotals);

                const updatedLog = log.withTotals(categoryTotals.stock, categoryTotals.cost, {
                    realized_profit: realizedProfit,
                });
                updatedLogs.push(updatedLog);
                continue;
            }

            // Case: Log is after the start timestamp and has a wrapper
            if (log.wrapper_id !== null) {
                // If item log has a wrapper, we still need to update running totals
                // so that subsequent logs see the correct state.
                const categoryTotals = runningTotals.get(log.category) || { stock: 0, cost: 0 };

                const quantity = log.quantity;
                const unitPrice = log.unit_price;

                if (quantity > 0) {
                    categoryTotals.stock += quantity;
                    categoryTotals.cost += quantity * unitPrice;
                } else if (quantity < 0) {
                    const absQuantity = Math.abs(quantity);
                    const currentAverageCost =
                        categoryTotals.stock > 0 ? categoryTotals.cost / categoryTotals.stock : 0;
                    const costOfGoodsSold = absQuantity * currentAverageCost;

                    categoryTotals.stock -= absQuantity;
                    categoryTotals.cost -= costOfGoodsSold;
                }

                categoryTotals.stock = Math.max(0, categoryTotals.stock);
                categoryTotals.cost = Math.max(0, categoryTotals.cost);
                runningTotals.set(log.category, categoryTotals);

                const updatedLog = log.withTotals(categoryTotals.stock, categoryTotals.cost);
                updatedLogs.push(updatedLog);
            }
        }

        if (updatedLogs.length > 0) {
            await this.registry.bulkPut(updatedLogs);
        }
    }
}
