import { BaseService } from "./BaseService";
import { Logger } from "./Logger";
import { ItemList } from "../objects/Item";
import {
    ItemLog,
    ItemLogCategories,
    ItemLogRegistry,
    type ItemLogCreateFields,
} from "../objects/ItemLog";
import {
    ItemLogWrapper,
    ItemLogWrapperAutoSplitSubType,
    ItemLogWrapperMuseumSubType,
    ItemLogWrapperRegistry,
    MUSEUM_EXCHANGE_RATES,
} from "../objects/ItemLogWrapper";


/**
 * Service for managing item logs.
 * Handles the business logic for creating, retrieving, and persisting item logs.
 */
export class ItemLogService extends BaseService {
    protected get SERVICE_NAME() { return "ItemLogService"; }
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
     * Retrieves the latest running totals for each category before a given timestamp.
     * @param itemId (number): Unique identifier of the item
     * @param timestamp (number): The threshold timestamp
     * @returns (Promise<Map<string, { stock: number; cost: number }>>): Mapping of category to its latest totals
     * @sideEffects Reads from IndexedDB via ItemLogRegistry
     */
    public async getLatestTotals(itemId: number, timestamp: number): Promise<Map<string, { stock: number; cost: number }>> {
        return await this.registry.getLatestTotalsPerCategoryBefore(itemId, timestamp);
    }

    /**
     * Persists multiple item logs at once.
     * @param logs (ItemLog[]): Array of item logs to persist
     * @returns (Promise<void>)
     * @sideEffects Writes to IndexedDB via ItemLogRegistry
     */
    public async bulkPutLogs(logs: ItemLog[]): Promise<void> {
        await this.registry.bulkPut(logs);
    }

    /**
     * Creates and persists a new item log wrapper.
     * @param wrapper (ItemLogWrapper): The wrapper instance to persist
     * @returns (Promise<number>): The persisted wrapper ID
     * @sideEffects Writes to IndexedDB via ItemLogWrapperRegistry
     */
    public async addWrapper(wrapper: ItemLogWrapper): Promise<number> {
        return await this.wrapperRegistry.put(wrapper);
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
     * Recalculates and updates the cost-basis (total stock and total cost) for all logs starting from a given timestamp.
     * Sweeps through all items chronologically to correctly handle cross-item dependencies.
     * @param fromTimestamp (number): The starting domain timestamp for recalculation
     * @returns (Promise<void>)
     * @sideEffects Reads from and writes to IndexedDB via ItemLogRegistry and ItemLogWrapperRegistry
     */
    public async updateCostBasis(fromTimestamp: number): Promise<void> {
        const allLogs = await this.getAllLogs();

        if (allLogs.length === 0) {
            return;
        }

        // Find all unique item IDs affected from the start timestamp
        const affectedItemIds = new Set<number>();
        for (const log of allLogs) {
            if (log.timestamp >= fromTimestamp) {
                affectedItemIds.add(log.item_id);
            }
        }

        if (affectedItemIds.size === 0) {
            return;
        }

        this.logger.info(`Updating cost-basis globally for ${affectedItemIds.size} items from ${fromTimestamp}`);

        // Initialize category-specific running totals per affected item using the last known state before fromTimestamp
        const runningTotalsByItem = new Map<number, Map<string, { stock: number; cost: number }>>();
        for (const itemId of affectedItemIds) {
            this.logger.debug(`Initializing totals for item: ${itemId}`);
            const totals = await this.registry.getLatestTotalsPerCategoryBefore(itemId, fromTimestamp);
            runningTotalsByItem.set(itemId, totals);
        }

        // Sort all logs chronologically (timestamp first, then database ID for stability)
        allLogs.sort((a, b) => a.timestamp - b.timestamp || (a.id ?? 0) - (b.id ?? 0));

        const updatedLogs: ItemLog[] = [];
        const processedWrappers = new Set<number>();

        for (let i = 0; i < allLogs.length; i++) {
            let log = allLogs[i];

            // Skip logs before the starting timestamp or logs for items that haven't had activity since fromTimestamp
            if (log.timestamp < fromTimestamp || !affectedItemIds.has(log.item_id)) {
                if (log.timestamp >= fromTimestamp) {
                    this.logger.debug(`Skipping unaffected item log: ${log.id} (item ${log.item_id})`);
                }
                continue;
            }

            this.logger.info(`Processing log: ${log.id} for item: ${log.item_id}`);
            const runningTotals = runningTotalsByItem.get(log.item_id)!;

            // Case: Log has a wrapper.
            if (log.wrapper_id !== null) {
                const wid = typeof log.wrapper_id === "string" ? parseInt(log.wrapper_id) : log.wrapper_id;
                
                const wrapper = await this.wrapperRegistry.getById(wid);
                if (!wrapper) {
                    this.logger.info(`Wrapper not found: ${wid}`);
                    // Generic fallback for missing wrappers
                    const { updatedLog } = this.handleGenericWrapperLog(log, runningTotals);
                    updatedLogs.push(updatedLog);
                    continue;
                } else if (wrapper.type === "auto-split") {
                    const result = await this.handleAutoSplitWrapper(wid, wrapper.sub_type as ItemLogWrapperAutoSplitSubType, allLogs, i, runningTotals);
                    i = result.newIndex;
                    // Auto-split reversal replaces 'log' with a merged version for re-evaluation in the loop
                    log = allLogs[i];
                } else if (wrapper.type === "manual-transfer" && !processedWrappers.has(wid)) {
                    const result = await this.handleManualTransferWrapper(wid, log, allLogs, i, runningTotals, processedWrappers);
                    i = result.newIndex;
                    updatedLogs.push(...result.updatedLogs);
                    continue;
                } else if (wrapper.type === "museum-exchange" && !processedWrappers.has(wid)) {
                    const result = await this.handleMuseumExchangeWrapper(wid, log, allLogs, i, runningTotalsByItem, processedWrappers);
                    i = result.newIndex;
                    updatedLogs.push(...result.updatedLogs);
                    continue;
                } else if (processedWrappers.has(wid)) {
                    // Already processed as part of a multi-log wrapper (e.g. manual-transfer)
                    // Its totals in allLogs[i] are already correct and runningTotals already reflects it.
                    updatedLogs.push(log);
                    continue;
                }
            }

            // Case: Log is standalone (no wrapper)
            if (log.wrapper_id === null) {
                const result = await this.handleNoWrapperLog(log, runningTotals);
                updatedLogs.push(...result.updatedLogs);
                continue;
            }

            // Case: Log has a wrapper but wasn't handled by specific reversal/recalculation logic above
            if (log.wrapper_id !== null) {
                const { updatedLog } = this.handleGenericWrapperLog(log, runningTotals);
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
        await this.updateCostBasis(timestamp);

        this.logger.info("Transfer request processed and cost-basis updated.");
    }

    private async handleAutoSplitWrapper(
        wid: number,
        subType: ItemLogWrapperAutoSplitSubType | null,
        allLogs: ItemLog[],
        currentIndex: number,
        runningTotals: Map<string, { stock: number; cost: number }>
    ): Promise<{ updatedLogs: ItemLog[]; newIndex: number }> {
        this.logger.info(`Processing auto-split wrapper: ${wid} (${subType})`);
        const logsWithWrapper = await this.registry.getLogsByWrapperId(wid);

        // Default Case: Merge split logs back into one and re-evaluate
        const totalQuantity = logsWithWrapper.reduce((sum, l) => sum + l.quantity, 0);

        // Sort to find the canonical log (least ID)
        logsWithWrapper.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
        const targetLog = logsWithWrapper[0];
        const others = logsWithWrapper.slice(1);

        let newIndex = currentIndex;

        // Delete redundant logs
        for (const other of others) {
            if (other.id) {
                await this.registry.delete(other.id);
                // Remove from current iteration array
                const removeIdx = allLogs.findIndex((l) => l.id === other.id);
                if (removeIdx !== -1) {
                    allLogs.splice(removeIdx, 1);
                    if (removeIdx <= newIndex) newIndex--;
                }
            }
        }

        // Delete the wrapper
        await this.wrapperRegistry.delete(wid);

        // Determine merged log totals from current running totals (not stale DB values)
        const mergedCategoryTotals = runningTotals.get(targetLog.category) || { stock: 0, cost: 0 };
        const mergedLog = targetLog.withTotals(mergedCategoryTotals.stock, mergedCategoryTotals.cost, {
            quantity: totalQuantity,
            wrapper_id: null,
        });

        // Update in database and in iteration array
        // NOTE: This DB write is a safety checkpoint; handleNoWrapperLog will overwrite with correct totals
        await this.updateLog(mergedLog);
        const targetIdxInAll = allLogs.findIndex((l) => l.id === targetLog.id);
        if (targetIdxInAll !== -1) {
            allLogs[targetIdxInAll] = mergedLog;
        }

        return { updatedLogs: [mergedLog], newIndex };
    }

    private async handleManualTransferWrapper(
        wid: number,
        log: ItemLog,
        allLogs: ItemLog[],
        currentIndex: number,
        runningTotals: Map<string, { stock: number; cost: number }>,
        processedWrappers: Set<number>
    ): Promise<{ updatedLogs: ItemLog[]; newIndex: number }> {
        processedWrappers.add(wid);
        this.logger.info(`Processing manual-transfer wrapper: ${wid}`);
        const logsWithWrapper = await this.registry.getLogsByWrapperId(wid);

        // Identify logs
        const skippedLogs = logsWithWrapper.filter((l) => l.category === "skipped");
        const restLogs = logsWithWrapper.filter((l) => l.category !== "skipped");

        if (restLogs.length !== 2) {
            throw new Error(`Unexpected number of logs (${restLogs.length}) in manual transfer wrapper.`);
        }

        const sourceLog = restLogs.find((l) => l.quantity < 0);
        const destLog = restLogs.find((l) => l.quantity > 0);
        if (!sourceLog || !destLog) {
            throw new Error("Unexpected quantity in manual transfer wrapper.");
        }

        const sourceCat = sourceLog.category as ItemLogCategories;
        const destCat = destLog.category as ItemLogCategories;

        // Calculate total requested quantity (sum of primary and existing skipped logs)
        const prevRequestedQty =
            Math.abs(sourceLog.quantity) +
            skippedLogs.reduce((sum, l) => sum + Math.abs(l.quantity), 0);
        
        const currentSourceTotals = runningTotals.get(sourceCat) || { stock: 0, cost: 0 };
        const averageCost =
            currentSourceTotals.stock > 0 ? currentSourceTotals.cost / currentSourceTotals.stock : 0;
        const finalUnitCost = sourceLog.unit_price > 0 ? sourceLog.unit_price : averageCost;

        const doableQty = Math.min(prevRequestedQty, currentSourceTotals.stock);
        const remainingQty = prevRequestedQty - doableQty;

        this.logger.info(
            ` manual-transfer: prevRequestedQty=${prevRequestedQty}, currentStock(${sourceCat})=${currentSourceTotals.stock}, doableQty=${doableQty}, avgCost=${averageCost}, finalUnitCost=${finalUnitCost}`
        );

        // 1. Update Source Log (fulfilled part)
        const costOfGoodsSold = doableQty * averageCost;
        const transferRealizedProfit = doableQty * finalUnitCost - costOfGoodsSold;

        currentSourceTotals.stock -= doableQty;
        currentSourceTotals.cost -= costOfGoodsSold;
        runningTotals.set(sourceCat, { ...currentSourceTotals });

        const updatedSourceLog = sourceLog.withTotals(
            currentSourceTotals.stock,
            currentSourceTotals.cost,
            {
                quantity: -doableQty,
                unit_price: finalUnitCost,
                realized_profit: transferRealizedProfit,
            }
        );

        // 2. Update Destination Log (fulfilled part)
        const currentDestTotals = runningTotals.get(destCat) || { stock: 0, cost: 0 };
        currentDestTotals.stock += doableQty;
        currentDestTotals.cost += doableQty * finalUnitCost;
        runningTotals.set(destCat, { ...currentDestTotals });

        const updatedDestLog = destLog.withTotals(
            currentDestTotals.stock,
            currentDestTotals.cost,
            { quantity: doableQty, unit_price: finalUnitCost, realized_profit: 0 }
        );

        await this.registry.put(updatedSourceLog);
        await this.registry.put(updatedDestLog);

        // Update in iteration array
        const sIdx = allLogs.findIndex((l) => l.id === sourceLog.id);
        if (sIdx !== -1) allLogs[sIdx] = updatedSourceLog;
        const dIdx = allLogs.findIndex((l) => l.id === destLog.id);
        if (dIdx !== -1) allLogs[dIdx] = updatedDestLog;

        let activeLog = log.id === sourceLog.id ? updatedSourceLog : (log.id === destLog.id ? updatedDestLog : log);
        let newIndex = currentIndex;

        // 3. Handle Overflows
        if (remainingQty > 0) {
            // Source overflow -> skipped category
            const existingSourceSkipped = skippedLogs.find(l => l.quantity < 0);
            const sourceSkippedProfit = remainingQty * finalUnitCost;
            if (existingSourceSkipped) {
                const updated = existingSourceSkipped.withTotals(0, 0, {
                    quantity: -remainingQty,
                    unit_price: finalUnitCost,
                    realized_profit: sourceSkippedProfit
                });
                await this.registry.put(updated);
                const idx = allLogs.findIndex(l => l.id === existingSourceSkipped.id);
                if (idx !== -1) allLogs[idx] = updated;
                if (activeLog.id === updated.id) activeLog = updated;
            } else {
                const n = ItemLog.create({
                    timestamp: sourceLog.timestamp,
                    item_id: sourceLog.item_id,
                    quantity: -remainingQty,
                    unit_price: finalUnitCost,
                    category: "skipped",
                    wrapper_id: wid,
                    total_stock: 0,
                    total_cost: 0,
                    realized_profit: sourceSkippedProfit
                });
                const id = await this.registry.put(n);
                id && n.applyPersistedId(id);
                allLogs.push(n);
            }

            // Destination overflow -> stays in destCat but separate log
            const existingDestExtra = logsWithWrapper.find(l => l.category === destCat && l.id !== destLog.id);
            
            const destTotalsExtra = runningTotals.get(destCat)!;
            destTotalsExtra.stock += remainingQty;
            destTotalsExtra.cost += remainingQty * finalUnitCost;
            runningTotals.set(destCat, { ...destTotalsExtra });

            if (existingDestExtra) {
                const updated = existingDestExtra.withTotals(destTotalsExtra.stock, destTotalsExtra.cost, {
                    quantity: remainingQty,
                    unit_price: finalUnitCost
                });
                await this.registry.put(updated);
                const idx = allLogs.findIndex(l => l.id === existingDestExtra.id);
                if (idx !== -1) allLogs[idx] = updated;
                if (activeLog.id === updated.id) activeLog = updated;
            } else {
                const n = ItemLog.create({
                    timestamp: sourceLog.timestamp,
                    item_id: sourceLog.item_id,
                    quantity: remainingQty,
                    unit_price: finalUnitCost,
                    category: destCat,
                    wrapper_id: wid,
                    total_stock: destTotalsExtra.stock,
                    total_cost: destTotalsExtra.cost
                });
                const id = await this.registry.put(n);
                id && n.applyPersistedId(id);
                allLogs.push(n);
            }

            // New logs have the same timestamp and larger IDs than existing logs,
            // so they naturally sort after the current position. No re-sort needed.
            // activeLog's position hasn't changed (no splices in this path).
            // newIndex stays as currentIndex (unchanged from the top of this handler).
        } else {
            // Delete unused extra logs
            for (const sLog of skippedLogs) {
                if (sLog.id) {
                    await this.registry.delete(sLog.id);
                    const idx = allLogs.findIndex((l) => l.id === sLog.id);
                    if (idx !== -1) {
                        allLogs.splice(idx, 1);
                        if (idx <= newIndex) newIndex--;
                    }
                }
            }
            // Also check for extra dest logs
            const extraDestLogs = logsWithWrapper.filter(l => l.category === destCat && l.id !== destLog.id);
            for (const eLog of extraDestLogs) {
                if (eLog.id) {
                    await this.registry.delete(eLog.id);
                    const idx = allLogs.findIndex((l) => l.id === eLog.id);
                    if (idx !== -1) {
                        allLogs.splice(idx, 1);
                        if (idx <= newIndex) newIndex--;
                    }
                }
            }
        }

        return { updatedLogs: [activeLog], newIndex };
    }

    /**
     * Re-calculates and updates all logs associated with a museum-exchange wrapper.
     * Dynamically resizes the exchange based on currently available stock in museum and normal categories.
     * @param wid (number): The unique identifier of the museum-exchange wrapper
     * @param log (ItemLog): The specific log that triggered this wrapper processing
     * @param allLogs (ItemLog[]): The full array of item logs in the current sweep
     * @param currentIndex (number): The current iteration index in the sweep
     * @param runningTotalsByItem (Map): Current stock/cost totals for all items in the sweep
     * @param processedWrappers (Set): Set of wrappers already handled in this sweep
     * @returns (Promise): Updated logs and the new iteration index
     * @sideEffects Writes to IndexedDB via ItemLogRegistry
     */
    private async handleMuseumExchangeWrapper(
        wid: number,
        log: ItemLog,
        allLogs: ItemLog[],
        currentIndex: number,
        runningTotalsByItem: Map<number, Map<string, { stock: number; cost: number }>>,
        processedWrappers: Set<number>
    ): Promise<{ updatedLogs: ItemLog[]; newIndex: number }> {
        processedWrappers.add(wid);
        this.logger.info(`Processing museum-exchange wrapper: ${wid}`);
        const logsWithWrapper = await this.registry.getLogsByWrapperId(wid);
        const wrapper = await this.wrapperRegistry.getById(wid);
        let newIndex = currentIndex;

        // 1. Identify involved items and the target requested sets
        const pointsLog = logsWithWrapper.find(l => l.item_id === ItemList.POINTS);
        if (!pointsLog) {
            this.logger.error(`Museum exchange #${wid} is missing Points log. Skipping.`);
            return { updatedLogs: [], newIndex: currentIndex };
        }

        const nonPointsLogs = logsWithWrapper.filter(l => l.item_id !== ItemList.POINTS);
        const itemIds = Array.from(new Set(nonPointsLogs.map(l => l.item_id)));
        
        if (itemIds.length === 0) {
            this.logger.error(`Museum exchange #${wid} is missing item logs. Skipping.`);
            return { updatedLogs: [], newIndex: currentIndex };
        }

        // Calculate total requested sets based on the absolute sum of all logs (normal, museum, skipped) for the first item
        const firstItemId = itemIds[0];
        const requestedSets = nonPointsLogs
            .filter(l => l.item_id === firstItemId)
            .reduce((sum, l) => sum + Math.abs(l.quantity), 0);
        
        // Determine the points exchange rate
        let pointsExchangeRate = 0;
        if (wrapper?.sub_type && wrapper.sub_type in MUSEUM_EXCHANGE_RATES) {
            pointsExchangeRate = MUSEUM_EXCHANGE_RATES[wrapper.sub_type as ItemLogWrapperMuseumSubType];
        } else {
            // Fallback for custom/legacy: derive from existing doable ratio
            const prevDoableSets = nonPointsLogs
                .filter(l => l.item_id === firstItemId && l.category !== "skipped")
                .reduce((sum, l) => sum + Math.abs(l.quantity), 0);
            pointsExchangeRate = prevDoableSets > 0 ? pointsLog.quantity / prevDoableSets : 0;
        }

        this.logger.info(` exchange #${wid}: requestedSets=${requestedSets}, rate=${pointsExchangeRate}`);

        // 2. Determine the new max possible sets based on current stock (normal + museum)
        let finalDoableSets = requestedSets;
        const itemStats = new Map<number, { mStock: number; mAvg: number; nStock: number; nAvg: number }>();

        for (const itemId of itemIds) {
            let totals = runningTotalsByItem.get(itemId);
            if (!totals) {
                this.logger.warn(` Item ${itemId} in exchange #${wid} has no totals initialized in current sweep. Fetching latest state.`);
                totals = await this.registry.getLatestTotalsPerCategoryBefore(itemId, pointsLog.timestamp);
                runningTotalsByItem.set(itemId, totals);
            }
            const m = totals.get("museum") || { stock: 0, cost: 0 };
            const n = totals.get("normal") || { stock: 0, cost: 0 };
            
            const stats = {
                mStock: m.stock,
                mAvg: m.stock > 0 ? m.cost / m.stock : 0,
                nStock: n.stock,
                nAvg: n.stock > 0 ? n.cost / n.stock : 0
            };
            itemStats.set(itemId, stats);
            
            this.logger.debug(` Item ${itemId}: museum=${stats.mStock} (avg ${stats.mAvg}), normal=${stats.nStock} (avg ${stats.nAvg})`);
            
            if (stats.mStock + stats.nStock < finalDoableSets) {
                finalDoableSets = Math.max(0, stats.mStock + stats.nStock);
                this.logger.info(` Exchange #${wid}: Final doable sets reduced to ${finalDoableSets} due to item ${itemId} constraints.`);
            }
        }
        const skippedSets = requestedSets - finalDoableSets;
        this.logger.info(` exchange #${wid}: finalDoableSets=${finalDoableSets}, skippedSets=${skippedSets}`);

        // 3. Re-calculate and rewrite logs
        const updatedLogsInWrapper: ItemLog[] = [];
        let totalCostOfExchange = 0;

        for (const itemId of itemIds) {
            const stats = itemStats.get(itemId)!;
            const takeFromMuseum = Math.min(finalDoableSets, stats.mStock);
            const takeFromNormal = finalDoableSets - takeFromMuseum;

            this.logger.info(` Item ${itemId}: takeFromMuseum=${takeFromMuseum}, takeFromNormal=${takeFromNormal}, skipped=${skippedSets}`);

            // a. Process Museum Removal
            const mTotals = runningTotalsByItem.get(itemId)!.get("museum") || { stock: 0, cost: 0 };
            const mCOGS = takeFromMuseum * stats.mAvg;
            mTotals.stock -= takeFromMuseum;
            mTotals.cost -= mCOGS;
            runningTotalsByItem.get(itemId)!.set("museum", { ...mTotals });
            totalCostOfExchange += mCOGS;

            // b. Process Normal Removal
            const nTotals = runningTotalsByItem.get(itemId)!.get("normal") || { stock: 0, cost: 0 };
            const nCOGS = takeFromNormal * stats.nAvg;
            nTotals.stock -= takeFromNormal;
            nTotals.cost -= nCOGS;
            runningTotalsByItem.get(itemId)!.set("normal", { ...nTotals });
            totalCostOfExchange += nCOGS;

            // c. Update/Create/Delete logs for this item
            const itemLogs = nonPointsLogs.filter(l => l.item_id === itemId);
            const configs = [
                { cat: "museum", qty: -takeFromMuseum, price: stats.mAvg },
                { cat: "normal", qty: -takeFromNormal, price: stats.nAvg },
                { cat: "skipped", qty: -skippedSets, price: 0 }
            ].filter(c => c.qty !== 0);

            // Reuse existing logs where possible
            for (let j = 0; j < Math.max(itemLogs.length, configs.length); j++) {
                const existing = itemLogs[j];
                const config = configs[j];

                if (existing && config) {
                    const updated = existing.withTotals(
                        runningTotalsByItem.get(itemId)!.get(config.cat)?.stock ?? 0,
                        runningTotalsByItem.get(itemId)!.get(config.cat)?.cost ?? 0,
                        {
                            category: config.cat as ItemLogCategories,
                            quantity: config.qty,
                            unit_price: config.price,
                            realized_profit: 0
                        }
                    );
                    updatedLogsInWrapper.push(updated);
                } else if (config) {
                    const n = ItemLog.create({
                        timestamp: pointsLog.timestamp,
                        item_id: itemId,
                        quantity: config.qty,
                        unit_price: config.price,
                        category: config.cat as ItemLogCategories,
                        wrapper_id: wid,
                        total_stock: runningTotalsByItem.get(itemId)!.get(config.cat)?.stock ?? 0,
                        total_cost: runningTotalsByItem.get(itemId)!.get(config.cat)?.cost ?? 0,
                    });
                    const id = await this.registry.put(n);
                    id && n.applyPersistedId(id);
                    updatedLogsInWrapper.push(n);
                    allLogs.push(n);
                } else if (existing) {
                    if (existing.id) await this.registry.delete(existing.id);
                    const idx = allLogs.findIndex(l => l.id === existing.id);
                    if (idx !== -1) {
                        allLogs.splice(idx, 1);
                        if (idx <= newIndex) newIndex--;
                    }
                }
            }
        }

        // 4. Process Points log
        const totalPoints = finalDoableSets * pointsExchangeRate;
        const costBasisPerPoint = totalPoints > 0 ? totalCostOfExchange / totalPoints : 0;
        this.logger.info(` exchange #${wid}: generating ${totalPoints} points at cost-basis ${costBasisPerPoint} (total cost ${totalCostOfExchange})`);
        
        const pTotalsMap = runningTotalsByItem.get(ItemList.POINTS);
        if (!pTotalsMap) {
            this.logger.warn(`Points totals map not initialized in exchange #${wid}.`);
        } else {
            const pTotals = pTotalsMap.get("normal") || { stock: 0, cost: 0 };
            pTotals.stock += totalPoints;
            pTotals.cost += totalPoints * costBasisPerPoint;
            pTotalsMap.set("normal", { ...pTotals });

            const updatedPointsLog = pointsLog.withTotals(pTotals.stock, pTotals.cost, {
                quantity: totalPoints,
                unit_price: costBasisPerPoint,
                realized_profit: 0
            });
            updatedLogsInWrapper.push(updatedPointsLog);
        }

        // 5. Cleanup iteration array and database
        for (const u of updatedLogsInWrapper) {
            const idx = allLogs.findIndex(l => l.id === u.id);
            if (idx !== -1) allLogs[idx] = u;
            await this.registry.put(u);
        }

        // New logs have the same timestamp and larger IDs, so they sort after current position.
        // activeLog (log.id) tracking preserves iteration continuity without a full re-sort.
        let activeLog = allLogs.find(l => l.id === log.id) || log;
        return { updatedLogs: [activeLog], newIndex };
    }

    private async handleNoWrapperLog(
        log: ItemLog,
        runningTotals: Map<string, { stock: number; cost: number }>
    ): Promise<{ updatedLogs: ItemLog[] }> {
        const updatedLogs: ItemLog[] = [];
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
                this.logger.info(` Over-sell detected for item ${log.item_id} in ${log.category}: requested ${absQuantity}, available ${categoryTotals.stock}. Splitting.`);
                // Over-Sell: Part of the sell exceeds current stock in this category.
                // We split the log into multiple logs across categories.

                const subType = log.category === "museum" ? "auto-split-museum" : "auto-split-default";
                const wrapper = ItemLogWrapper.create({
                    timestamp: log.timestamp,
                    type: "auto-split",
                    sub_type: subType,
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

                return { updatedLogs };
            }
        }

        // Update running totals for this category
        runningTotals.set(log.category, categoryTotals);

        const updatedLog = log.withTotals(categoryTotals.stock, categoryTotals.cost, {
            realized_profit: realizedProfit,
        });
        updatedLogs.push(updatedLog);

        return { updatedLogs };
    }

    private handleGenericWrapperLog(
        log: ItemLog,
        runningTotals: Map<string, { stock: number; cost: number }>
    ): { updatedLog: ItemLog } {
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

        return { updatedLog: log.withTotals(categoryTotals.stock, categoryTotals.cost) };
    }
}
