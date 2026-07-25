import { BaseService } from "./BaseService";
import { Receipt, ReceiptRegistry, ReceiptSource } from "../objects/Receipt";
import { ReceiptItem, ReceiptItemRegistry } from "../objects/ReceiptItem";
import { T3BAPI } from "../old/game/api";
import { TornExchange } from "../tornexchange";

export class ReceiptService extends BaseService {
    protected get SERVICE_NAME(): string {
        return "ReceiptService";
    }

    private readonly receiptRegistry: ReceiptRegistry;
    private readonly receiptItemRegistry: ReceiptItemRegistry;

    constructor() {
        super();
        this.receiptRegistry = new ReceiptRegistry();
        this.receiptItemRegistry = new ReceiptItemRegistry();
    }

    /**
     * Creates a partial receipt record without items.
     */
    public async createPartialReceipt(source: ReceiptSource, receiptIdString: string, timestamp: number): Promise<number> {
        const existing = await this.receiptRegistry.getBySourceId(receiptIdString, source);
        if (existing) return existing.id!;

        const receipt = Receipt.create({
            receipt_id_string: receiptIdString,
            source,
            total_value: 0,
            seller_id: 0,
            created_at: timestamp * 1000,
            sync_status: "pending_details"
        });

        return await this.receiptRegistry.put(receipt);
    }

    /**
     * Fetches details and populates items for a partial receipt.
     */
    public async populateReceiptDetails(receiptDbId: number): Promise<void> {
        const receipt = await this.receiptRegistry.getById(receiptDbId);
        if (!receipt || receipt.sync_status === "complete") return;

        this.logger.info(`Populating details for ${receipt.source} receipt ${receipt.receipt_id_string}`);
        
        let totalValue = 0;
        let createdAt = 0;
        let sellerId = 0;
        let items: any[] = [];

        try {
            if (receipt.source === "weav3r") {
                const weav3rReceipt = await T3BAPI.getReceipt(receipt.receipt_id_string);
                totalValue = weav3rReceipt.totalValue;
                createdAt = weav3rReceipt.createdAt * 1000;
                items = weav3rReceipt.items;
            } else if (receipt.source === "tornexchange") {
                const teClient = TornExchange.getInstance();
                const teReceipt = await teClient.getReceipt(receipt.receipt_id_string);
                totalValue = teReceipt.meta.total;
                createdAt = new Date(teReceipt.meta.created_at).getTime();
                sellerId = parseInt(teReceipt.meta.seller, 10) || 0;
                items = Object.values(teReceipt.data);
            }
        } catch (error: any) {
            if (error.message?.includes("Rate limit")) {
                this.logger.warn(`Rate limit hit during receipt population. Pausing 10s.`);
                await new Promise(r => setTimeout(r, 10000));
                throw error;
            }
            throw error;
        }

        // @ts-ignore
        receipt.total_value = totalValue;
        // @ts-ignore
        receipt.created_at = createdAt;
        // @ts-ignore
        receipt.seller_id = sellerId;
        // @ts-ignore
        receipt.sync_status = "complete";
        await this.receiptRegistry.put(receipt);

        const receiptItems: ReceiptItem[] = items.map((item: any) => {
            if (receipt.source === "weav3r") {
                return ReceiptItem.create({
                    receipt_db_id: receiptDbId,
                    item_id: item.itemID,
                    name: item.itemName,
                    quantity: item.quantity,
                    price: item.priceUsed,
                    subtotal: item.totalValue,
                });
            } else {
                return ReceiptItem.create({
                    receipt_db_id: receiptDbId,
                    item_id: 0,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    subtotal: item.subtotal,
                });
            }
        });

        await this.receiptItemRegistry.bulkPut(receiptItems);
    }

    /**
     * Fetches a receipt from an external source and persists it with its items.
     */
    public async fetchAndCreateReceipt(source: ReceiptSource, receiptIdString: string): Promise<Receipt> {
        const dbId = await this.createPartialReceipt(source, receiptIdString, Math.floor(Date.now() / 1000));
        await this.populateReceiptDetails(dbId);
        return (await this.receiptRegistry.getById(dbId))!;
    }

    /**
     * Retrieves all receipts that are pending detailed ingestion.
     */
    public async getPendingReceipts(): Promise<Receipt[]> {
        const records = await this.receiptRegistry.getAll();
        return records.filter(r => r.sync_status === "pending_details");
    }

    /**
     * Deletes a receipt and its associated receipt items.
     * @param receiptId (number): Database ID of the receipt
     */
    public async deleteReceipt(receiptId: number): Promise<void> {
        this.logger.info(`Deleting receipt ${receiptId}`);
        const items = await this.receiptItemRegistry.getItemsByReceiptId(receiptId);
        
        // Delete items
        for (const item of items) {
            if (item.id) await this.receiptItemRegistry.delete(item.id);
        }

        // Delete receipt
        await this.receiptRegistry.delete(receiptId);
        this.logger.info(`Successfully deleted receipt ${receiptId} and its ${items.length} items`);
    }

    /**
     * Fetches all receipts.
     */
    public async getAllReceipts(): Promise<Receipt[]> {
        return this.receiptRegistry.getAll();
    }

    /**
     * Fetches receipt items for a receipt.
     */
    public async getReceiptItems(receiptDbId: number): Promise<ReceiptItem[]> {
        return this.receiptItemRegistry.getItemsByReceiptId(receiptDbId);
    }
}