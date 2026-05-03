import { ItemList } from "../objects/Item";
import { ItemLog } from "../objects/ItemLog";
import { ItemLogWrapper, ItemLogWrapperMuseumSubType, MUSEUM_EXCHANGE_RATES } from "../objects/ItemLogWrapper";
import { BaseService } from "./BaseService";
import { ItemLogService } from "./ItemLogService";

export class MuseumService extends BaseService {
    protected get SERVICE_NAME() { return "MuseumService"; }
    public readonly EXCHANGE_RATES = MUSEUM_EXCHANGE_RATES;

    public readonly SETS: Record<ItemLogWrapperMuseumSubType, number[]> = {
        "plushie-set": [
            ItemList.TEDDY_BEAR_PLUSHIE,
            ItemList.KITTEN_PLUSHIE,
            ItemList.MONKEY_PLUSHIE,
        ],
        "exotic-flower-set": [ItemList.DAHLIA],
        "meteorite-fragment": [],
        "patagonian-fossil": [],
        "arrowhead-set": [],
        "medieval-coin-set": [],
        "vairocana-buddha": [],
        "ganesha-sculpture": [],
        "shabti-sculpture": [],
        "companion-scripts": [],
        "senet-game-set": [],
        "egyptian-amulet": [],
    };

    /**
     * Exchanges a specified quantity of item sets for points in the museum.
     * Calculates the maximum possible exchange based on current stock, creates logs for item removals and point additions.
     * @param set (ItemLogWrapperMuseumSubType): The type of set to exchange
     * @param quantity (number): The number of sets to attempt to exchange
     * @param itemLogService (ItemLogService): Service to handle log creation and stock retrieval
     * @param timestamp (number): Optional domain timestamp for the exchange (defaults to now)
     * @returns (Promise<void>)
     * @throws Error if the set is unsupported or stock is insufficient
     * @sideEffects Creates multiple ItemLogs and a Wrapper in IndexedDB; triggers cost-basis recalculation.
     */
    public async exchangeSet(
        set: ItemLogWrapperMuseumSubType,
        quantity: number,
        itemLogService: ItemLogService,
        timestamp: number = Date.now()
    ): Promise<void> {
        // Currently, only support for "plushie-set" and "exotic-flower-set".
        if (set !== "plushie-set" && set !== "exotic-flower-set") {
            throw new Error(`Museum exchange for '${set}' is not yet supported.`);
        }

        const itemsInSet = this.SETS[set];
        const pointsGainedPerSet = this.EXCHANGE_RATES[set];

        if (!itemsInSet || itemsInSet.length === 0) {
            throw new Error(`No items defined for set: ${set}`);
        }

        // 1. Determine the maximum possible quantity based on combined stock from 'museum' and 'normal'.
        let finalExchangeQuantity = quantity;
        const itemStats = new Map<number, { 
            mStock: number; mAvgCost: number; 
            nStock: number; nAvgCost: number; 
        }>();

        for (const itemId of itemsInSet) {
            const totals = await itemLogService.getLatestTotals(itemId, timestamp);
            const mTotals = totals.get("museum") || { stock: 0, cost: 0 };
            const nTotals = totals.get("normal") || { stock: 0, cost: 0 };
            
            const mStock = mTotals.stock;
            const mAvgCost = mStock > 0 ? mTotals.cost / mStock : 0;
            const nStock = nTotals.stock;
            const nAvgCost = nStock > 0 ? nTotals.cost / nStock : 0;

            itemStats.set(itemId, { mStock, mAvgCost, nStock, nAvgCost });

            if (mStock + nStock < finalExchangeQuantity) {
                finalExchangeQuantity = Math.max(0, mStock + nStock);
            }
        }

        new Logger("MuseumService").info(`Exchanged ${finalExchangeQuantity} ${set}(s)`);
        new Logger("MuseumService").info(itemStats.toString());

        if (finalExchangeQuantity <= 0) {
            throw new Error(`Insufficient stock in 'museum' and 'normal' categories to exchange any '${set}'.`);
        }

        // 2. Create the museum-exchange wrapper.
        const totalPointsGained = finalExchangeQuantity * pointsGainedPerSet;
        const exchangeWrapper = ItemLogWrapper.create({
            timestamp,
            type: "museum-exchange",
            sub_type: set,
            description: `Museum Exchange: requested ${quantity} ${set}(s), fulfilled ${finalExchangeQuantity}.`,
        });
        const exchangeWrapperId = await itemLogService.addWrapper(exchangeWrapper);

        let totalCostOfExchange = 0;
        const logsToPersist: ItemLog[] = [];

        // 3. Process each item: perform direct removals and log skips for shortfalls.
        for (const itemId of itemsInSet) {
            const stats = itemStats.get(itemId)!;
            const fromNormal = Math.max(0, finalExchangeQuantity - stats.mStock);
            const fromMuseum = finalExchangeQuantity - fromNormal;
            const skippedAmount = quantity - finalExchangeQuantity;

            if (fromNormal > 0) {
                totalCostOfExchange += fromNormal * stats.nAvgCost;
                logsToPersist.push(
                    ItemLog.create({
                        timestamp,
                        item_id: itemId,
                        quantity: -fromNormal,
                        unit_price: stats.nAvgCost,
                        category: "normal",
                        wrapper_id: exchangeWrapperId,
                    })
                );
            }

            if (fromMuseum > 0) {
                totalCostOfExchange += fromMuseum * stats.mAvgCost;
                logsToPersist.push(
                    ItemLog.create({
                        timestamp,
                        item_id: itemId,
                        quantity: -fromMuseum,
                        unit_price: stats.mAvgCost,
                        category: "museum",
                        wrapper_id: exchangeWrapperId,
                    })
                );
            }

            if (skippedAmount > 0) {
                logsToPersist.push(
                    ItemLog.create({
                        timestamp,
                        item_id: itemId,
                        quantity: -skippedAmount,
                        unit_price: 0,
                        category: "skipped",
                        wrapper_id: exchangeWrapperId,
                    })
                );
            }
        }

        // 4. Add points with a calculated cost-basis.
        const costBasisPerPoint = totalPointsGained > 0 ? totalCostOfExchange / totalPointsGained : 0;

        logsToPersist.push(
            ItemLog.create({
                timestamp,
                item_id: ItemList.POINTS,
                quantity: totalPointsGained,
                unit_price: costBasisPerPoint,
                category: "normal",
                wrapper_id: exchangeWrapperId,
            })
        );

        // 5. Persist and update cost-basis globally.
        await itemLogService.bulkPutLogs(logsToPersist);
        await itemLogService.updateCostBasis(timestamp);
    }
}
