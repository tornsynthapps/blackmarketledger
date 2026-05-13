import { BaseService } from "./BaseService";
import { Trade, TradeRegistry, TradeType } from "../objects/Trade";
import { TradeItem, TradeItemRegistry } from "../objects/TradeItem";
import { ItemLog } from "../objects/ItemLog";
import { ItemLogWrapper, ItemLogWrapperRegistry } from "../objects/ItemLogWrapper";
import { TornAPI } from "../old/game/api";
import { TornAPIClient } from "../tornAPI";
import { ItemLogService } from "./ItemLogService";
import { ReceiptRegistry } from "../objects/Receipt";
import { ReceiptItemRegistry } from "../objects/ReceiptItem";
import { TornTradeItem, TornTradeMoney } from "../old/game/trade";
import { MetadataInterface } from "../old/interfaces/metadata";

export class TradeService extends BaseService {
    protected get SERVICE_NAME(): string {
        return "TradeService";
    }

    private readonly tradeRegistry: TradeRegistry;
    private readonly tradeItemRegistry: TradeItemRegistry;
    private readonly wrapperRegistry: ItemLogWrapperRegistry;
    private readonly itemLogService: ItemLogService;
    private readonly receiptRegistry: ReceiptRegistry;
    private readonly receiptItemRegistry: ReceiptItemRegistry;

    constructor() {
        super();
        this.tradeRegistry = new TradeRegistry();
        this.tradeItemRegistry = new TradeItemRegistry();
        this.wrapperRegistry = new ItemLogWrapperRegistry();
        this.itemLogService = new ItemLogService();
        this.receiptRegistry = new ReceiptRegistry();
        this.receiptItemRegistry = new ReceiptItemRegistry();
    }

    private getItemType(item: any): string {
        if (item instanceof TornTradeItem || item.itemID !== undefined) return "Item";
        if (item instanceof TornTradeMoney || item.amount !== undefined) return "Money";
        if (item.details) {
            return item.type; // "Item" | "Money" | "Unsupported"
        }
        return "Unsupported";
    }

    private determineTradeType(tornTrade: any, ourId: number): TradeType {
        this.logger.info(`Determining trade type for trade ${tornTrade.id}. Our ID: ${ourId}`);
        
        const ourEntries = tornTrade.items.filter((i: any) => (i.userID || i.user_id) === ourId);
        const theirEntries = tornTrade.items.filter((i: any) => (i.userID || i.user_id) !== ourId);

        this.logger.info(`Entry counts - Ours (Sent): ${ourEntries.length}, Theirs (Received): ${theirEntries.length}`);

        const weSentOnlyMoney = ourEntries.length > 0 && ourEntries.every((i: any) => this.getItemType(i) === "Money");
        const theySentOnlyItems = theirEntries.length > 0 && theirEntries.every((i: any) => this.getItemType(i) === "Item");
        
        const weSentOnlyItems = ourEntries.length > 0 && ourEntries.every((i: any) => this.getItemType(i) === "Item");
        const theySentOnlyMoney = theirEntries.length > 0 && theirEntries.every((i: any) => this.getItemType(i) === "Money");

        if (weSentOnlyMoney && theySentOnlyItems) {
            this.logger.info(`Detected BUY trade: We sent only money (Buy), they sent only items.`);
            return "buy";
        } else if (weSentOnlyItems && theySentOnlyMoney) {
            this.logger.info(`Detected SELL trade: We sent only items (Sell), they sent only money.`);
            return "sell";
        } else {
            this.logger.warn(`Detected OTHERS trade: Mixed items/money or empty trade. WeSentMoneyOnly: ${weSentOnlyMoney}, TheySentItemsOnly: ${theySentOnlyItems}, WeSentItemsOnly: ${weSentOnlyItems}, TheySentMoneyOnly: ${theySentOnlyMoney}`);
            return "others";
        }
    }

    /**
     * Creates a partial trade record with no items, marked as pending_details.
     * @param tornId (number): The Torn API trade identifier
     * @param timestamp (number): The trade timestamp in seconds
     * @returns (Promise<number>): The database ID of the created trade
     */
    public async createPartialTrade(tornId: number, timestamp: number): Promise<number> {
        const existing = await this.tradeRegistry.getByTornId(tornId);
        if (existing) return existing.id!;

        const ourId = await MetadataInterface.getUserID();
        const trade = Trade.create({
            timestamp: timestamp * 1000,
            type: "others", // Default until details fetched
            torn_id: tornId,
            user_id: ourId,
            sync_status: "pending_details"
        });

        return await this.tradeRegistry.put(trade);
    }

    /**
     * Fetches details for a partial trade and populates items and logs.
     * @param tradeDbId (number): The database ID of the trade to populate
     */
    public async populateTradeDetails(tradeDbId: number): Promise<void> {
        const trade = await this.tradeRegistry.getById(tradeDbId);
        if (!trade || trade.sync_status === "complete") return;

        this.logger.info(`Populating details for trade ${trade.torn_id} (DB: ${tradeDbId})`);
        
        let tornTrade;
        try {
            tornTrade = await TornAPI.getTornTrade(String(trade.torn_id));
        } catch (error: any) {
            if (error.message?.includes("Rate limit")) {
                this.logger.warn(`Rate limit hit during trade population. Pausing 10s.`);
                await new Promise(r => setTimeout(r, 10000));
                throw error; // Re-throw to let caller handle retry
            }
            throw error;
        }

        const timestampMs = tornTrade.timestamp * 1000;
        const ourId = await MetadataInterface.getUserID();
        const tradeType = this.determineTradeType(tornTrade, ourId);

        // 1. Create Wrapper
        const wrapper = ItemLogWrapper.create({
            type: "trade-receipt",
            description: `Trade ${trade.torn_id}: ${tradeType} trade`,
            timestamp: timestampMs,
        });
        const wrapperId = await this.wrapperRegistry.put(wrapper);

        // 2. Update Trade Record
        // @ts-ignore - bypassing readonly
        trade.type = tradeType;
        // @ts-ignore
        trade.wrapper_id = wrapperId;
        // @ts-ignore
        trade.sync_status = "complete";
        await this.tradeRegistry.put(trade);

        let totalMoneyPaid = 0;
        let totalMoneyReceived = 0;
        const receivedItemsMap: Record<number, number> = {};
        const sentItemsMap: Record<number, number> = {};

        // 3. Create Trade Items
        const tradeItems: TradeItem[] = tornTrade.items.map((item: any) => {
            let type = "Unsupported";
            let itemId: number | null = null;
            let quantity = 0;
            let userId = item.userID || item.user_id;

            if (item instanceof TornTradeItem) {
                type = "Item";
                itemId = item.itemID;
                quantity = item.quantity;
            } else if (item instanceof TornTradeMoney) {
                type = "Money";
                quantity = item.amount;
            } else if (item.details) {
                if (item.type === "Item" || (item.details.id !== undefined)) {
                    type = "Item";
                    itemId = item.details.id || item.itemID;
                    quantity = item.details.amount || item.quantity;
                } else if (item.type === "Money" || (item.details.amount !== undefined)) {
                    type = "Money";
                    quantity = item.details.amount || item.amount;
                }
            }

            if (userId === ourId) {
                if (type === "Money") totalMoneyPaid += quantity;
                else if (type === "Item" && itemId !== null) sentItemsMap[itemId] = (sentItemsMap[itemId] || 0) + quantity;
            } else {
                if (type === "Money") totalMoneyReceived += quantity;
                else if (type === "Item" && itemId !== null) receivedItemsMap[itemId] = (receivedItemsMap[itemId] || 0) + quantity;
            }

            return TradeItem.create({
                trade_db_id: tradeDbId,
                type,
                item_id: itemId,
                quantity,
                user_id: userId,
            });
        });

        await this.tradeItemRegistry.bulkPut(tradeItems);

        // 4. Ingest items into logs
        if (tradeType === "buy") {
            const marketPrices = await TornAPIClient.getMarketPrices();
            let totalMarketValue = 0;

            const itemsToLog = Object.entries(receivedItemsMap).map(([idStr, qty]) => {
                const id = parseInt(idStr, 10);
                const mp = marketPrices[id] || 0;
                totalMarketValue += mp * qty;
                return { id, qty, mp };
            });

            const proportionPaid = totalMarketValue > 0 ? totalMoneyPaid / totalMarketValue : 0;

            for (const item of itemsToLog) {
                await this.itemLogService.addItemLog({
                    timestamp: timestampMs,
                    item_id: item.id,
                    quantity: item.qty,
                    unit_price: item.mp * proportionPaid,
                    category: "normal",
                    wrapper_id: wrapperId,
                });
            }
        } else if (tradeType === "sell") {
            const marketPrices = await TornAPIClient.getMarketPrices();
            let totalMarketValue = 0;

            const itemsToLog = Object.entries(sentItemsMap).map(([idStr, qty]) => {
                const id = parseInt(idStr, 10);
                const mp = marketPrices[id] || 0;
                totalMarketValue += mp * qty;
                return { id, qty, mp };
            });

            const proportionReceived = totalMarketValue > 0 ? totalMoneyReceived / totalMarketValue : 0;

            for (const item of itemsToLog) {
                await this.itemLogService.addItemLog({
                    timestamp: timestampMs,
                    item_id: item.id,
                    quantity: -item.qty,
                    unit_price: item.mp * proportionReceived,
                    category: "normal",
                    wrapper_id: wrapperId,
                });
            }
        }
    }

    /**
     * Fetches a trade from Torn API, creates a wrapper, and persists the trade and its items.
     */
    public async fetchAndCreateTrade(tornId: string): Promise<Trade> {
        const timestamp = Math.floor(Date.now() / 1000); // Temporary timestamp
        const dbId = await this.createPartialTrade(parseInt(tornId, 10), timestamp);
        await this.populateTradeDetails(dbId);
        return (await this.tradeRegistry.getById(dbId))!;
    }

    /**
     * Retrieves all trades that are pending detailed ingestion.
     */
    public async getPendingTrades(): Promise<Trade[]> {
        const records = await this.tradeRegistry.getAll();
        return records.filter(t => t.sync_status === "pending_details");
    }

    /**
     * Links a receipt to a trade.
     * Validates that items, quantities, and money match.
     * @param tradeId (number): Database ID of the trade
     * @param receiptDbId (number): Database ID of the receipt
     */
    public async linkReceiptToTrade(tradeId: number, receiptDbId: number): Promise<void> {
        this.logger.info(`Linking trade ${tradeId} to receipt ${receiptDbId}`);
        const trade = await this.tradeRegistry.getById(tradeId);
        if (!trade) {
            this.logger.error(`Trade ${tradeId} not found for linking.`);
            throw new Error(`Trade ${tradeId} not found`);
        }

        const receipt = await this.receiptRegistry.getById(receiptDbId);
        if (!receipt) {
            this.logger.error(`Receipt ${receiptDbId} not found for linking.`);
            throw new Error(`Receipt ${receiptDbId} not found`);
        }

        const tradeItems = await this.tradeItemRegistry.getItemsByTradeId(tradeId);
        const receiptItems = await this.receiptItemRegistry.getItemsByReceiptId(receiptDbId);

        this.logger.info(`Validating trade items (${tradeItems.length}) against receipt items (${receiptItems.length})`);

        // 1. Validate Money
        let tradeMoneyPaid = 0;
        const tradeReceivedItems: Record<number, number> = {};
        for (const item of tradeItems) {
            if ((item.user_id === trade.user_id) && item.type === "Money") {
                tradeMoneyPaid += item.quantity;
            } else if ((item.user_id !== trade.user_id) && item.type === "Item" && item.item_id !== null) {
                tradeReceivedItems[item.item_id] = (tradeReceivedItems[item.item_id] || 0) + item.quantity;
            }
        }

        this.logger.info(`Trade money paid: ${tradeMoneyPaid}, Receipt total: ${receipt.total_value}`);

        if (Math.abs(receipt.total_value - tradeMoneyPaid) > 0.01) {
            this.logger.warn(`Money mismatch detected! Trade: ${tradeMoneyPaid}, Receipt: ${receipt.total_value}`);
            throw new Error(`Money mismatch: Trade sent ${tradeMoneyPaid.toLocaleString()}, Receipt total ${receipt.total_value.toLocaleString()}`);
        }

        // 2. Validate Items and Quantities
        const receiptReceivedItems: Record<number, number> = {};
        for (const item of receiptItems) {
            if (item.item_id !== 0) {
                receiptReceivedItems[item.item_id] = (receiptReceivedItems[item.item_id] || 0) + item.quantity;
            }
        }

        // Check if all trade items exist in receipt with correct qty
        for (const [itemId, qty] of Object.entries(tradeReceivedItems)) {
            const numId = parseInt(itemId, 10);
            if (receiptReceivedItems[numId] !== qty) {
                this.logger.warn(`Quantity mismatch for item ${numId}: Trade=${qty}, Receipt=${receiptReceivedItems[numId] || 0}`);
                throw new Error(`Quantity mismatch for item ID ${itemId}: Trade=${qty}, Receipt=${receiptReceivedItems[numId] || 0}`);
            }
        }

        // Check if receipt has extra items
        for (const [itemId, qty] of Object.entries(receiptReceivedItems)) {
            const numId = parseInt(itemId, 10);
            if (tradeReceivedItems[numId] !== qty) {
                this.logger.warn(`Receipt extra item mismatch: Item ${numId} Qty ${qty}`);
                throw new Error(`Receipt contains extra item ID ${itemId} or quantity mismatch.`);
            }
        }

        this.logger.info(`Validation successful for trade ${tradeId} and receipt ${receiptDbId}`);

        // 3. Update Item Logs with precise prices from receipt if it's a buy trade
        if (trade.type === "buy" && trade.wrapper_id !== null) {
            this.logger.info(`Updating item logs with precise prices for buy-trade ${trade.torn_id}`);
            const allLogs = await this.itemLogService.getAllLogs();
            const relatedLogs = allLogs.filter(l => l.wrapper_id === trade.wrapper_id);
            
            this.logger.info(`Found ${relatedLogs.length} related logs to update.`);

            for (const log of relatedLogs) {
                const receiptItem = receiptItems.find(ri => ri.item_id === log.item_id);
                if (receiptItem) {
                    this.logger.info(`Updating item ${log.item_id} price: ${log.unit_price} -> ${receiptItem.price}`);
                    const updatedLog = ItemLog.fromDatabase({
                        ...log.toDatabaseRecord(),
                        id: log.id!,
                        unit_price: receiptItem.price
                    } as any);
                    await this.itemLogService.updateLog(updatedLog);
                } else {
                    this.logger.warn(`No matching receipt item found for log item ${log.item_id}`);
                }
            }
            this.logger.info(`Triggering cost-basis update from timestamp ${trade.timestamp}`);
            await this.itemLogService.updateCostBasis(trade.timestamp);
        }

        // 4. Persist the link
        // @ts-ignore - bypassing readonly for update
        trade.receipt_id = receiptDbId;
        await this.tradeRegistry.put(trade);
        this.logger.info(`Successfully linked receipt ${receiptDbId} to trade ${tradeId}`);
    }

    /**
     * Deletes a trade and its associated trade items.
     * @param tradeId (number): Database ID of the trade
     */
    public async deleteTrade(tradeId: number): Promise<void> {
        this.logger.info(`Deleting trade ${tradeId}`);
        const items = await this.tradeItemRegistry.getItemsByTradeId(tradeId);
        
        // Delete items
        for (const item of items) {
            if (item.id) await this.tradeItemRegistry.delete(item.id);
        }

        // Delete trade
        await this.tradeRegistry.delete(tradeId);
        this.logger.info(`Successfully deleted trade ${tradeId} and its ${items.length} items`);
    }

    /**
     * Fetches all trades.
     */
    public async getAllTrades(): Promise<Trade[]> {
        return this.tradeRegistry.getAll();
    }

    /**
     * Fetches trade items for a trade.
     */
    public async getTradeItems(tradeDbId: number): Promise<TradeItem[]> {
        return this.tradeItemRegistry.getItemsByTradeId(tradeDbId);
    }
}