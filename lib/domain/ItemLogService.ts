import { BaseService } from "./BaseService";
import { Logger } from "./Logger";
import {
    ItemLog,
    ItemLogCategories,
    ItemLogRegistry,
    type ItemLogCreateFields,
} from "../objects/ItemLog";
import { ItemLogWrapper, ItemLogWrapperRegistry } from "../objects/ItemLogWrapper";

/**
 * Service for managing item logs.
 * Handles the business logic for creating, retrieving, and persisting item logs.
 */
export class ItemLogService extends BaseService {
    private readonly registry: ItemLogRegistry;
    private readonly wrapperRegistry: ItemLogWrapperRegistry;
    private readonly logger: Logger;

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
        this.logger = new Logger("ItemLogService");
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
        const processedWrappers = new Set<number>();

        for (let i = 0; i < allLogs.length; i++) {
            let log = allLogs[i];
            this.logger.info(`Updating log: ${log.id}`);

            // Case: Log is before the start timestamp
            if (log.timestamp < fromTimestamp) {
                // We've already initialized runningTotals using the latest logs before fromTimestamp
                // But we still need to track them for logs that ARE in allLogs but before fromTimestamp
                // so that when we reach fromTimestamp, we have the correct state.
                runningTotals.set(log.category, { stock: log.total_stock, cost: log.total_cost });
                this.logger.info(`Skipped. log.timestamp=${log.timestamp}, fromTimestamp=${fromTimestamp}`);
                continue;
            }

            // Case: Log is after the start timestamp, and with a wrapper.
            if (log.wrapper_id !== null) {
                const wid = typeof log.wrapper_id === "string" ? parseInt(log.wrapper_id) : log.wrapper_id;
                this.logger.info(`Log has wrapper: ${wid} (original type: ${typeof log.wrapper_id})`);
                
                const wrapper = await this.wrapperRegistry.getById(wid);
                if (!wrapper) {
                    this.logger.info(`Wrapper not found: ${wid}`);
                    // TODO: Handle this case.
                    continue;
                } else if (wrapper.type === "auto-split") {
                    this.logger.info(`Processing auto-split wrapper: ${wid}`);
                    // Reversal: Merge split logs back into one and re-evaluate
                    const logsWithWrapper = await this.registry.getLogsByWrapperId(wid);
                    const totalQuantity = logsWithWrapper.reduce((sum, l) => sum + l.quantity, 0);

                    // Sort to find the canonical log (least ID)
                    logsWithWrapper.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
                    const targetLog = logsWithWrapper[0];
                    const others = logsWithWrapper.slice(1);

                    // Delete redundant logs
                    for (const other of others) {
                        if (other.id) {
                            await this.registry.delete(other.id);
                            // Remove from current iteration array
                            const removeIdx = allLogs.findIndex((l) => l.id === other.id);
                            if (removeIdx !== -1) {
                                allLogs.splice(removeIdx, 1);
                                if (removeIdx <= i) i--;
                            }
                        }
                    }

                    // Delete the wrapper
                    await this.wrapperRegistry.delete(wid);

                    // Prepare the merged log for re-evaluation
                    log = targetLog.withTotals(targetLog.total_stock, targetLog.total_cost, {
                        quantity: totalQuantity,
                        wrapper_id: null,
                    });

                    // Update in database and in iteration array
                    await this.updateLog(log);
                    const targetIdxInAll = allLogs.findIndex((l) => l.id === targetLog.id);
                    if (targetIdxInAll !== -1) {
                        allLogs[targetIdxInAll] = log;
                    }
                } else if (wrapper.type === "manual-transfer" && !processedWrappers.has(wid)) {
                    processedWrappers.add(wid);
                    this.logger.info(`Processing manual-transfer wrapper: ${wid}`);
                    const logsWithWrapper = await this.registry.getLogsByWrapperId(wid);

                    // Seprate a skipped log from the rest
                    const skippedLogs = logsWithWrapper.filter((l) => l.category === "skipped");
                    const restLogs = logsWithWrapper.filter((l) => l.category !== "skipped");

                    if (restLogs.length !== 2) {
                        throw new Error(`Unexpected number of logs (${restLogs.length}) in manual transfer wrapper.`);
                    }

                    // Identify fromLog and toLog
                    const sourceLog = restLogs.find((l) => l.quantity < 0);
                    const destLog = restLogs.find((l) => l.quantity > 0);
                    if (!sourceLog || !destLog) {
                        throw new Error("Unexpected quantity in manual transfer wrapper.");
                    }

                    // Get categories
                    const sourceCat = sourceLog.category as ItemLogCategories;
                    const destCat = destLog.category as ItemLogCategories;

                    // Calaculate the quantities and cost basis.
                    const prevRequestedQty =
                        Math.abs(sourceLog.quantity) +
                        skippedLogs
                            .filter((l) => l.quantity > 0)
                            .reduce((sum, l) => sum + l.quantity, 0);
                    const currentTotals = runningTotals.get(sourceCat) || { stock: 0, cost: 0 };
                    
                    // Use the existing unit_price if it's set (manual override), otherwise use average cost
                    const averageCost =
                        currentTotals.stock > 0 ? currentTotals.cost / currentTotals.stock : 0;
                    const finalUnitCost = sourceLog.unit_price > 0 ? sourceLog.unit_price : averageCost;

                    const doableQty = Math.min(prevRequestedQty, currentTotals.stock);

                    this.logger.info(
                        ` manual-transfer: prevRequestedQty=${prevRequestedQty}, currentStock(${sourceCat})=${currentTotals.stock}, doableQty=${doableQty}, avgCost=${averageCost}, finalUnitCost=${finalUnitCost}`
                    );

                    // Update the source log and dest log with the new quantities and unit price.
                    const costOfGoodsSold = doableQty * averageCost;
                    const transferRealizedProfit = doableQty * finalUnitCost - costOfGoodsSold;

                    const updatedSourceLog = sourceLog.withTotals(
                        sourceLog.total_stock,
                        sourceLog.total_cost,
                        {
                            quantity: -doableQty,
                            unit_price: finalUnitCost,
                            realized_profit: transferRealizedProfit,
                        }
                    );
                    const updatedDestLog = destLog.withTotals(
                        destLog.total_stock,
                        destLog.total_cost,
                        { quantity: doableQty, unit_price: finalUnitCost, realized_profit: 0 }
                    );

                    this.logger.info(
                        ` Updating logs: sourceLogId=${sourceLog.id}, destLogId=${destLog.id}, realizedProfit=${transferRealizedProfit}`
                    );
                    await this.registry.put(updatedSourceLog);
                    await this.registry.put(updatedDestLog);

                    // Update in iteration array
                    const sIdx = allLogs.findIndex((l) => l.id === sourceLog.id);
                    if (sIdx !== -1) allLogs[sIdx] = updatedSourceLog;
                    const dIdx = allLogs.findIndex((l) => l.id === destLog.id);
                    if (dIdx !== -1) allLogs[dIdx] = updatedDestLog;

                    // Ensure current 'log' is updated if it was one of them
                    if (log.id === updatedSourceLog.id) log = updatedSourceLog;
                    else if (log.id === updatedDestLog.id) log = updatedDestLog;

                    // Handle skipped logs
                    const remainingSkippedQty = prevRequestedQty - doableQty;
                    this.logger.info(` remainingSkippedQty=${remainingSkippedQty}`);

                    if (remainingSkippedQty <= 0) {
                        this.logger.info(` Fulfilling transfer, deleting ${skippedLogs.length} skipped logs`);
                        for (const sLog of skippedLogs) {
                            if (sLog.id) {
                                await this.registry.delete(sLog.id);
                                const idx = allLogs.findIndex((l) => l.id === sLog.id);
                                if (idx !== -1) {
                                    allLogs.splice(idx, 1);
                                    if (idx <= i) i--;
                                }
                            }
                        }
                    } else {
                        if (skippedLogs.length > 0) {
                            const targetSkipped = skippedLogs[0];
                            this.logger.info(` Updating existing skipped log: ${targetSkipped.id} with qty ${remainingSkippedQty}`);
                            const updatedSkipped = targetSkipped.withTotals(
                                targetSkipped.total_stock,
                                targetSkipped.total_cost,
                                { quantity: remainingSkippedQty }
                            );
                            await this.registry.put(updatedSkipped);

                            const idx = allLogs.findIndex((l) => l.id === targetSkipped.id);
                            if (idx !== -1) allLogs[idx] = updatedSkipped;
                            if (log.id === updatedSkipped.id) log = updatedSkipped;

                            // Delete extra skipped logs
                            for (let j = 1; j < skippedLogs.length; j++) {
                                const extra = skippedLogs[j];
                                if (extra.id) {
                                    this.logger.info(` Deleting extra skipped log: ${extra.id}`);
                                    await this.registry.delete(extra.id);
                                    const eIdx = allLogs.findIndex((l) => l.id === extra.id);
                                    if (eIdx !== -1) {
                                        allLogs.splice(eIdx, 1);
                                        if (eIdx <= i) i--;
                                    }
                                }
                            }
                        } else {
                            this.logger.info(` Creating new skipped log with qty ${remainingSkippedQty}`);
                            const newSkippedLog = ItemLog.create({
                                timestamp: log.timestamp,
                                item_id: log.item_id,
                                quantity: remainingSkippedQty,
                                unit_price: 0,
                                category: "skipped",
                                wrapper_id: wid,
                                total_stock: 0,
                                total_cost: 0,
                            });
                            const newId = await this.registry.put(newSkippedLog);
                            newId && newSkippedLog.applyPersistedId(newId);

                            allLogs.push(newSkippedLog);
                            allLogs.sort(
                                (a, b) => a.timestamp - b.timestamp || (a.id ?? 0) - (b.id ?? 0)
                            );
                            i = allLogs.findIndex((l) => l.id === log.id);
                        }
                    }
                }
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
                            type: "auto-split",
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

            // Case: Log is after the start timestamp and has a wrapper (not handled above or not reversed)
            if (log.wrapper_id !== null) {
                const wid = typeof log.wrapper_id === "string" ? parseInt(log.wrapper_id) : log.wrapper_id;
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

    /**
     * Transfers a specific quantity of an item from one category to another.
     * Creates a manual transfer wrapper and associated logs, then triggers cost-basis recalculation.
     * @param itemId (number): Unique identifier of the item
     * @param fromCategory (ItemLogCategories): The source category
     * @param toCategory (ItemLogCategories): The destination category
     * @param quantity (number): The amount to transfer
     * @param unitCost (number): Optional custom cost per unit to transfer (overrides average cost calculation)
     * @param timestamp (number): Optional domain timestamp for the transfer (defaults to now)
     * @returns (Promise<void>)
     * @sideEffects Writes to IndexedDB and triggers cost-basis update
     */
    public async transferItem(
        itemId: number,
        fromCategory: ItemLogCategories,
        toCategory: ItemLogCategories,
        quantity: number,
        unitCost: number | null = null,
        timestamp: number = Date.now()
    ): Promise<void> {
        if (quantity <= 0) {
            throw new Error("Transfer quantity must be positive.");
        }

        if (fromCategory === toCategory) {
            throw new Error("Source and destination categories must be different.");
        }

        this.logger.info(
            `Requesting transfer: ${quantity} units of item ${itemId} from ${fromCategory} to ${toCategory}`
        );

        // 0. Determine initial unit cost if not provided
        let initialUnitCost = unitCost;
        if (initialUnitCost === null) {
            const currentTotals = await this.registry.getLatestTotalsPerCategoryBefore(
                itemId,
                timestamp
            );
            const sourceTotals = currentTotals.get(fromCategory);
            initialUnitCost =
                sourceTotals && sourceTotals.stock > 0 ? sourceTotals.cost / sourceTotals.stock : 0;
            this.logger.info(`No unitCost provided. Using current cost basis: ${initialUnitCost}`);
        }

        // 1. Create the wrapper
        const wrapper = ItemLogWrapper.create({
            timestamp,
            type: "manual-transfer",
            description: `Manual transfer: ${quantity} units from ${fromCategory} to ${toCategory}.`,
        });
        const wrapperId = await this.wrapperRegistry.put(wrapper);

        // 2. Create the source log (negative quantity)
        const sourceLog = ItemLog.create({
            timestamp,
            item_id: itemId,
            quantity: -quantity,
            unit_price: initialUnitCost,
            category: fromCategory,
            wrapper_id: wrapperId,
        });

        // 3. Create the destination log (positive quantity)
        const destLog = ItemLog.create({
            timestamp,
            item_id: itemId,
            quantity: quantity,
            unit_price: initialUnitCost,
            category: toCategory,
            wrapper_id: wrapperId,
        });

        // 4. Persist logs
        await this.registry.bulkPut([sourceLog, destLog]);

        // 5. Trigger cost-basis update
        await this.updateCostBasis(itemId, timestamp);

        this.logger.info("Transfer request processed and cost-basis updated.");
    }
}
