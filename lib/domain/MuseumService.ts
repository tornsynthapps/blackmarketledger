import { ItemList } from "../objects/Item";
import { createItemIdentity, ItemLog, ItemLogCategories, type ItemIdentity } from "../objects/ItemLog";
import { ItemLogWrapper, ItemLogWrapperMuseumSubType, MUSEUM_EXCHANGE_RATES } from "../objects/ItemLogWrapper";
import { TornAPIClient } from "../tornAPI";
import { BaseService } from "./BaseService";
import { ItemLogService } from "./ItemLogService";

const TAKE_ORDER: ItemLogCategories[] = ["museum", "normal", "abroad", "city-finds", "city-shop", "crimes", "dump", "christmas-town"];

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
        const itemStats = new Map<number, Array<{
            identity: ItemIdentity;
            catStats: Map<ItemLogCategories, CatStat>;
            totalAvailableStock: number;
        }>>();

        for (const itemId of itemsInSet) {
            const identityTotals = await itemLogService.getLatestTotalsByItemIdentities(itemId, timestamp);
            const identityStats = identityTotals.map(({ identity, totals }) => {
                const catStats = new Map<ItemLogCategories, CatStat>();
                let totalAvailableStock = 0;

                // First get normal avg cost, as it's needed for other categories.
                const normalTotals = totals.get("normal") || { stock: 0, cost: 0 };
                const normalAverageCost = normalTotals.stock > 0 ? normalTotals.cost / normalTotals.stock : 0;

                for (const cat of TAKE_ORDER) {
                    const catTotal = totals.get(cat) || { stock: 0, cost: 0 };
                    let unitPrice = 0;

                    if (cat === "museum" || cat === "normal") {
                        unitPrice = catTotal.stock > 0 ? catTotal.cost / catTotal.stock : 0;
                    } else {
                        unitPrice = normalAverageCost > 0 ? normalAverageCost : (marketPrices[itemId] || 0);
                    }

                    catStats.set(cat, { stock: catTotal.stock, cost: catTotal.cost, unitPrice });
                    totalAvailableStock += catTotal.stock;
                }

                this.logger.debug(
                    ` Item ${itemId}${identity.uid === null ? "" : ` uid=${identity.uid}`}: totalAvailable=${totalAvailableStock}, nAvg=${normalAverageCost}`
                );

                return {
                    identity,
                    catStats,
                    totalAvailableStock,
                };
            });

            itemStats.set(itemId, identityStats);

            const combinedAvailableStock = identityStats.reduce(
                (sum, identityStat) => sum + identityStat.totalAvailableStock,
                0
            );

            if (combinedAvailableStock < finalExchangeQuantity) {
                finalExchangeQuantity = Math.max(0, combinedAvailableStock);
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
            let remainingToTake = finalExchangeQuantity;
            const skippedAmount = quantity - finalExchangeQuantity;

            for (const identityStat of itemStats.get(itemId) ?? []) {
                for (const cat of TAKE_ORDER) {
                    if (remainingToTake <= 0) break;

                    const catStat = identityStat.catStats.get(cat)!;
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
                                uid: identityStat.identity.uid,
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
            }

            if (skippedAmount > 0) {
                logsToPersist.push(
                    ItemLog.create({
                        timestamp,
                        item_id: itemId,
                        uid: createItemIdentity(itemId, null).uid,
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
                category: "museum",
                wrapper_id: exchangeWrapperId,
            })
        );

        // 5. Persist logs.
        await itemLogService.bulkPutLogs(logsToPersist);
    }

    public static readonly ITEM_NAMES: Record<number, string> = {
        [ItemList.POINTS]: "Points",
        [ItemList.SHEEP_PLUSHIE]: "Sheep Plushie",
        [ItemList.TEDDY_BEAR_PLUSHIE]: "Teddy Bear Plushie",
        [ItemList.KITTEN_PLUSHIE]: "Kitten Plushie",
        [ItemList.JAGUAR_PLUSHIE]: "Jaguar Plushie",
        [ItemList.WOLVERINE_PLUSHIE]: "Wolverine Plushie",
        [ItemList.NESSIE_PLUSHIE]: "Nessie Plushie",
        [ItemList.RED_FOX_PLUSHIE]: "Red Fox Plushie",
        [ItemList.MONKEY_PLUSHIE]: "Monkey Plushie",
        [ItemList.CHAMOIS_PLUSHIE]: "Chamois Plushie",
        [ItemList.PANDA_PLUSHIE]: "Panda Plushie",
        [ItemList.LION_PLUSHIE]: "Lion Plushie",
        [ItemList.CAMEL_PLUSHIE]: "Camel Plushie",
        [ItemList.STINGRAY_PLUSHIE]: "Stingray Plushie",
        [ItemList.AFRICAN_VIOLET]: "African Violet",
        [ItemList.BANANA_ORCHID]: "Banana Orchid",
        [ItemList.CROCUS]: "Crocus",
        [ItemList.DAHLIA]: "Dahlia",
        [ItemList.EDELWEISS]: "Edelweiss",
        [ItemList.HEATHER]: "Heather",
        [ItemList.ORCHID]: "Orchid",
        [ItemList.PEONY]: "Peony",
        [ItemList.CEIBO_FLOWER]: "Ceibo Flower",
        [ItemList.CHERRY_BLOSSOM]: "Cherry Blossom",
        [ItemList.TRIBULUS_OMANENSE]: "Tribulus Omanense",
        [ItemList.METEORITE_FRAGMENT]: "Meteorite Fragment",
        [ItemList.PATAGONIAN_FOSSIL]: "Patagonian Fossil",
        [ItemList.OBSIDIAN_POINT]: "Obsidian Point",
        [ItemList.QUARTZITE_POINT]: "Quartzite Point",
        [ItemList.CHERT_POINT]: "Chert Point",
        [ItemList.BASALT_POINT]: "Basalt Point",
        [ItemList.CHALCEDONY_POINT]: "Chalcedony Point",
        [ItemList.QUARTZ_POINT]: "Quartz Point",
        [ItemList.LEOPARD_COIN]: "Leopard Coin",
        [ItemList.FLORIN_COIN]: "Florin Coin",
        [ItemList.GOLD_NOBLE_COIN]: "Gold Noble Coin",
        [ItemList.VAIROCANA_BUDDHA_SCULPTURE]: "Vairocana Buddha Sculpture",
        [ItemList.GANESHA_SCULPTURE]: "Ganesha Sculpture",
        [ItemList.SHABTI_SCULPTURE]: "Shabti Sculpture",
        [ItemList.COMPANION_SCRIPT_ABDULLAH]: "Companion Script: Abdullah",
        [ItemList.COMPANION_SCRIPT_UBAY]: "Companion Script: Ubay",
        [ItemList.COMPANION_SCRIPT_ALI]: "Companion Script: Ali",
        [ItemList.WHITE_SENET_PAWN]: "White Senet Pawn",
        [ItemList.BLACK_SENET_PAWN]: "Black Senet Pawn",
        [ItemList.SENET_BOARD]: "Senet Board",
        [ItemList.EGYPTIAN_AMULET]: "Egyptian Amulet",
    };

    /**
     * Computes complete stats for the museum dashboard strictly using V2 domain logs.
     */
    public async getMuseumDashboardStats(
        itemLogService: ItemLogService,
        timestamp: number = Date.now()
    ) {
        await itemLogService.ensureLogsPopulated();

        const getItemStock = async (itemId: number) => {
            const identityTotals = await itemLogService.getLatestTotalsByItemIdentities(itemId, timestamp);
            let stock = 0;
            let totalCost = 0;
            let realizedProfit = 0;

            identityTotals.forEach(({ totals }) => {
                totals.forEach((catTotal, category) => {
                    if (category !== "skipped" && category !== "abroad") {
                        stock += catTotal.stock;
                        totalCost += catTotal.cost;
                    }
                });
            });

            const avgCost = stock > 0 ? totalCost / stock : 0;
            return {
                itemId,
                name: MuseumService.ITEM_NAMES[itemId] || `Item ${itemId}`,
                stock,
                totalCost,
                avgCost,
                realizedProfit,
                stats: { stock, totalCost, realizedProfit, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 }
            };
        };

        const pointsStats = await getItemStock(ItemList.POINTS);

        const flowersData = await Promise.all(
            this.SETS["exotic-flower-set"].map((itemId) => getItemStock(itemId))
        );

        const plushiesData = await Promise.all(
            this.SETS["plushie-set"].map((itemId) => getItemStock(itemId))
        );

        const artifactKeys: Array<{ key: string; title: string; setKey: ItemLogWrapperMuseumSubType }> = [
            { key: "meteorite-fragment", title: "Meteorite Fragment", setKey: "meteorite-fragment" },
            { key: "patagonian-fossil", title: "Patagonian Fossil", setKey: "patagonian-fossil" },
            { key: "arrowhead-set", title: "Arrowhead Set", setKey: "arrowhead-set" },
            { key: "medieval-coin-set", title: "Medieval Coin Set", setKey: "medieval-coin-set" },
            { key: "vairocana-buddha", title: "Vairocana Buddha Sculpture", setKey: "vairocana-buddha" },
            { key: "ganesha-sculpture", title: "Ganesha Sculpture", setKey: "ganesha-sculpture" },
            { key: "shabti-sculpture", title: "Shabti Sculpture", setKey: "shabti-sculpture" },
            { key: "companion-scripts", title: "Companion Scripts", setKey: "companion-scripts" },
            { key: "senet-game-set", title: "Senet Game Set", setKey: "senet-game-set" },
            { key: "egyptian-amulet", title: "Egyptian Amulet", setKey: "egyptian-amulet" },
        ];

        const artifactExchangeData = await Promise.all(
            artifactKeys.map(async (art) => {
                const itemIds = this.SETS[art.setKey] || [];
                const items = await Promise.all(
                    itemIds.map(async (itemId) => {
                        const st = await getItemStock(itemId);
                        return {
                            itemId,
                            itemID: itemId,
                            itemName: st.name,
                            quantity: 1,
                            stock: st.stock,
                            totalCost: st.totalCost,
                            stats: st.stats,
                        };
                    })
                );

                const exchangesReady =
                    items.length > 0
                        ? Math.min(...items.map((i) => Math.floor(i.stock / i.quantity)))
                        : 0;

                return {
                    key: art.key,
                    definition: {
                        name: art.title,
                        label: art.title,
                        points: this.EXCHANGE_RATES[art.setKey] || 0,
                        pointsPerExchange: this.EXCHANGE_RATES[art.setKey] || 0,
                        items,
                    },
                    items,
                    exchangesReady,
                };
            })
        );

        const flowerSetsPossible =
            flowersData.length > 0 ? Math.min(...flowersData.map((f) => f.stock)) : 0;
        const plushieSetsPossible =
            plushiesData.length > 0 ? Math.min(...plushiesData.map((p) => p.stock)) : 0;

        let itemsTotalCost = 0;
        let itemsRealizedProfit = 0;

        [...flowersData, ...plushiesData].forEach((item) => {
            itemsTotalCost += Math.max(0, item.totalCost);
            itemsRealizedProfit += item.realizedProfit;
        });

        artifactExchangeData.forEach((exchange) => {
            exchange.items.forEach((item) => {
                itemsTotalCost += Math.max(0, item.totalCost);
            });
        });

        const totalValue =
            Math.max(0, pointsStats.totalCost) + itemsTotalCost;
        const totalProfit =
            pointsStats.realizedProfit + itemsRealizedProfit;

        return {
            pointsStats,
            flowersData,
            plushiesData,
            artifactExchangeData,
            flowerSetsPossible,
            plushieSetsPossible,
            totalValue,
            totalProfit,
        };
    }
}
