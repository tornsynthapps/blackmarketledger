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
            ItemList.SHEEP_PLUSHIE,
            ItemList.TEDDY_BEAR_PLUSHIE,
            ItemList.KITTEN_PLUSHIE,
            ItemList.JAGUAR_PLUSHIE,
            ItemList.WOLVERINE_PLUSHIE,
            ItemList.NESSIE_PLUSHIE,
            ItemList.RED_FOX_PLUSHIE,
            ItemList.MONKEY_PLUSHIE,
            ItemList.CHAMOIS_PLUSHIE,
            ItemList.PANDA_PLUSHIE,
            ItemList.LION_PLUSHIE,
            ItemList.CAMEL_PLUSHIE,
            ItemList.STINGRAY_PLUSHIE,
        ],
        "exotic-flower-set": [
            ItemList.AFRICAN_VIOLET,
            ItemList.BANANA_ORCHID,
            ItemList.CROCUS,
            ItemList.DAHLIA,
            ItemList.EDELWEISS,
            ItemList.HEATHER,
            ItemList.ORCHID,
            ItemList.PEONY,
            ItemList.CEIBO_FLOWER,
            ItemList.CHERRY_BLOSSOM,
            ItemList.TRIBULUS_OMANENSE,
        ],
        "meteorite-fragment": [ItemList.METEORITE_FRAGMENT],
        "patagonian-fossil": [ItemList.PATAGONIAN_FOSSIL],
        "arrowhead-set": [
            ItemList.OBSIDIAN_POINT,
            ItemList.QUARTZITE_POINT,
            ItemList.CHERT_POINT,
            ItemList.BASALT_POINT,
            ItemList.CHALCEDONY_POINT,
            ItemList.QUARTZ_POINT,
        ],
        "medieval-coin-set": [
            ItemList.LEOPARD_COIN,
            ItemList.FLORIN_COIN,
            ItemList.GOLD_NOBLE_COIN,
        ],
        "vairocana-buddha": [ItemList.VAIROCANA_BUDDHA_SCULPTURE],
        "ganesha-sculpture": [ItemList.GANESHA_SCULPTURE],
        "shabti-sculpture": [ItemList.SHABTI_SCULPTURE],
        "companion-scripts": [
            ItemList.COMPANION_SCRIPT_ABDULLAH,
            ItemList.COMPANION_SCRIPT_UBAY,
            ItemList.COMPANION_SCRIPT_ALI,
        ],
        "senet-game-set": [
            ItemList.WHITE_SENET_PAWN,
            ItemList.BLACK_SENET_PAWN,
            ItemList.SENET_BOARD,
        ],
        "egyptian-amulet": [ItemList.EGYPTIAN_AMULET],
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

            this.logger.debug(` Item ${itemId}: museum=${mStock} (avg ${mAvgCost}), normal=${nStock} (avg ${nAvgCost})`);

            if (mStock + nStock < finalExchangeQuantity) {
                finalExchangeQuantity = Math.max(0, mStock + nStock);
            }
        }

        this.logger.info(`Final exchange quantity determined: ${finalExchangeQuantity} sets (requested ${quantity})`);

        if (finalExchangeQuantity <= 0) {
            this.logger.warn(`Insufficient stock for '${set}'. Proceeding with skipped logs for re-evaluation.`);
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
            const takeFromMuseum = Math.min(finalExchangeQuantity, stats.mStock);
            const takeFromNormal = finalExchangeQuantity - takeFromMuseum;
            const skippedAmount = quantity - finalExchangeQuantity;

            if (takeFromNormal > 0) {
                totalCostOfExchange += takeFromNormal * stats.nAvgCost;
                logsToPersist.push(
                    ItemLog.create({
                        timestamp,
                        item_id: itemId,
                        quantity: -takeFromNormal,
                        unit_price: stats.nAvgCost,
                        category: "normal",
                        wrapper_id: exchangeWrapperId,
                    })
                );
            }

            if (takeFromMuseum > 0) {
                totalCostOfExchange += takeFromMuseum * stats.mAvgCost;
                logsToPersist.push(
                    ItemLog.create({
                        timestamp,
                        item_id: itemId,
                        quantity: -takeFromMuseum,
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

        // 5. Persist logs.
        await itemLogService.bulkPutLogs(logsToPersist);
    }
}
