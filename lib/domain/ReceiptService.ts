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
     * Fetches a receipt from an external source and persists it with its items.
     * @param source (ReceiptSource): The source of the receipt
     * @param receiptIdString (string): The external identifier
     */
    public async fetchAndCreateReceipt(source: ReceiptSource, receiptIdString: string): Promise<Receipt> {
        this.logger.info(`Fetching ${source} receipt ${receiptIdString}`);
        
        let totalValue = 0;
        let createdAt = 0;
        let sellerId = 0;
        let items: any[] = [];

        if (source === "weav3r") {
            const weav3rReceipt = await T3BAPI.getReceipt(receiptIdString);
            totalValue = weav3rReceipt.totalValue;
            createdAt = weav3rReceipt.createdAt * 1000;
            // Assuming sellerId is the user who created it, or 0 if unknown
            items = weav3rReceipt.items;
        } else if (source === "tornexchange") {
            const teClient = TornExchange.getInstance();
            const teReceipt = await teClient.getReceipt(receiptIdString);
            totalValue = teReceipt.meta.total;
            createdAt = new Date(teReceipt.meta.created_at).getTime();
            sellerId = parseInt(teReceipt.meta.seller, 10) || 0;
            items = Object.values(teReceipt.data);
        }

        const receipt = Receipt.create({
            receipt_id_string: receiptIdString,
            source,
            total_value: totalValue,
            seller_id: sellerId,
            created_at: createdAt,
        });

        const receiptDbId = await this.receiptRegistry.put(receipt);

        const receiptItems: ReceiptItem[] = items.map((item: any) => {
            if (source === "weav3r") {
                return ReceiptItem.create({
                    receipt_db_id: receiptDbId,
                    item_id: item.itemID,
                    name: item.itemName,
                    quantity: item.quantity,
                    price: item.priceUsed,
                    subtotal: item.totalValue,
                });
            } else {
                // TornExchange format
                return ReceiptItem.create({
                    receipt_db_id: receiptDbId,
                    item_id: 0, // TE data doesn't seem to have item_id in ReceiptItem based on interface, but item names are keys
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    subtotal: item.subtotal,
                });
            }
        });

        await this.receiptItemRegistry.bulkPut(receiptItems);

        this.logger.info(`Successfully created ${source} receipt with ${receiptItems.length} items`);
        return receipt;
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