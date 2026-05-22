import { ItemList } from "../objects/Item";
import { ItemLog, ItemLogCategories } from "../objects/ItemLog";
import { ItemLogWrapper, ItemLogWrapperMuseumSubType, MUSEUM_EXCHANGE_RATES } from "../objects/ItemLogWrapper";
import { TornAPIClient } from "../tornAPI";
import { BaseService } from "./BaseService";
import { ItemLogService } from "./ItemLogService";

const TAKE_ORDER: ItemLogCategories[] = ["museum", "normal", "abroad", "city-finds", "city-shop", "crimes", "dump"];

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

        // 1. Determine the maximum possible quantity based on combined stock across all valid categories.
        let finalExchangeQuantity = quantity;
        const marketPrices = await TornAPIClient.getMarketPrices();

        type CatStat = { stock: number; cost: number; unitPrice: number };
        const itemStats = new Map<number, { 
            catStats: Map<ItemLogCategories, CatStat>;
            totalAvailableStock: number;
        }>();

        for (const itemId of itemsInSet) {
            const totals = await itemLogService.getLatestTotals(itemId, timestamp);
            const catStats = new Map<ItemLogCategories, CatStat>();
            let totalAvailableStock = 0;
            
            // First get normal avg cost, as it's needed for other categories
            const nTotals = totals.get("normal") || { stock: 0, cost: 0 };
            const nAvgCost = nTotals.stock > 0 ? nTotals.cost / nTotals.stock : 0;
            
            for (const cat of TAKE_ORDER) {
                const catTotal = totals.get(cat) || { stock: 0, cost: 0 };
                let unitPrice = 0;
                
                if (cat === "museum" || cat === "normal") {
                    unitPrice = catTotal.stock > 0 ? catTotal.cost / catTotal.stock : 0;
                } else {
                    unitPrice = nAvgCost > 0 ? nAvgCost : (marketPrices[itemId] || 0);
                }
                
                catStats.set(cat, { stock: catTotal.stock, cost: catTotal.cost, unitPrice });
                totalAvailableStock += catTotal.stock;
            }

            itemStats.set(itemId, { catStats, totalAvailableStock });

            this.logger.debug(` Item ${itemId}: totalAvailable=${totalAvailableStock}, nAvg=${nAvgCost}`);

            if (totalAvailableStock < finalExchangeQuantity) {
                finalExchangeQuantity = Math.max(0, totalAvailableStock);
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
            let remainingToTake = finalExchangeQuantity;
            const skippedAmount = quantity - finalExchangeQuantity;

            for (const cat of TAKE_ORDER) {
                if (remainingToTake <= 0) break;
                
                const catStat = stats.catStats.get(cat)!;
                const takeFromCat = Math.min(remainingToTake, catStat.stock);

                if (takeFromCat > 0) {
                    const avgCost = catStat.stock > 0 ? catStat.cost / catStat.stock : 0;
                    const cogs = takeFromCat * avgCost;
                    
                    let realizedProfit = 0;
                    if (cat === "museum" || cat === "normal") {
                        totalCostOfExchange += cogs;
                    } else {
                        totalCostOfExchange += takeFromCat * catStat.unitPrice;
                        realizedProfit = takeFromCat * catStat.unitPrice - cogs;
                    }

                    logsToPersist.push(
                        ItemLog.create({
                            timestamp,
                            item_id: itemId,
                            quantity: -takeFromCat,
                            unit_price: catStat.unitPrice,
                            category: cat,
                            wrapper_id: exchangeWrapperId,
                            realized_profit: realizedProfit,
                        })
                    );
                    remainingToTake -= takeFromCat;
                }
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
