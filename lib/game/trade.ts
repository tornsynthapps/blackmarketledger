import { mydebug } from "../debug";
import { MetadataInterface } from "../interfaces/metadata";

export class TornTradeItem {
    userID: number;
    itemID: number;
    quantity: number;

    constructor(userID: number, itemID: number, quantity: number) {
        this.userID = userID;
        this.itemID = itemID;
        this.quantity = quantity;
    }
}

export class TornTradeMoney {
    userID: number;
    amount: number;

    constructor(userID: number, amount: number) {
        this.userID = userID;
        this.amount = amount;
    }
}

export class UnsupportedTornTradeItem {
    userID: number;
    type: string;
    details: any;

    constructor(userID: number, type: string, details: any) {
        this.userID = userID;
        this.type = type;
        this.details = details;
    }
}

export class UnsupportedTradeItemError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UnsupportedTradeItemError";
    }
}

export class UnsupportedTradeTypeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UnsupportedTradeTypeError";
    }
}

export class TornTrade {
    id: string;
    tornLogId: string;
    timestamp: number;
    description: string;
    userID: number;
    traderID: number;
    items: (TornTradeItem | TornTradeMoney | UnsupportedTornTradeItem)[];
    linkedReceiptId?: string;
    manuallyLiked: boolean = false;
    hasUnsupportedItems: boolean = false;

    constructor(
        id: string,
        tornLogId: string,
        timestamp: number,
        description: string,
        userID: number,
        traderID: number,
        items: any[]
    ) {
        this.id = id;
        this.tornLogId = tornLogId;
        this.timestamp = timestamp;
        this.description = description;
        this.userID = userID;
        this.traderID = traderID;
        this.items = TornTrade.standardizeItems(items);
        this.hasUnsupportedItems = this.items.some(
            (item) => item instanceof UnsupportedTornTradeItem
        );

        // this.validateTradeType();
    }

    /**
     * Converts this TornTrade to a plain object for persistence.
     * @returns any: Plain object representation.
     */
    toInterface(): any {
        return {
            id: this.id,
            tornLogId: this.tornLogId,
            timestamp: this.timestamp,
            description: this.description,
            userID: this.userID,
            traderID: this.traderID,
            items: this.items.map((item) => {
                if (item instanceof TornTradeMoney) {
                    return {
                        type: "Money",
                        user_id: item.userID,
                        details: { amount: item.amount },
                    };
                }
                if (item instanceof TornTradeItem) {
                    return {
                        type: "Item",
                        user_id: item.userID,
                        details: { id: item.itemID, amount: item.quantity },
                    };
                }
                return {
                    type: (item as UnsupportedTornTradeItem).type,
                    user_id: item.userID,
                    details: (item as UnsupportedTornTradeItem).details,
                };
            }),
            linkedReceiptId: this.linkedReceiptId,
            manuallyLiked: this.manuallyLiked,
            hasUnsupportedItems: this.hasUnsupportedItems,
        };
    }

    async validateTradeType() {
        for (const item of this.items) {
            // TradeMoney
            if (item instanceof TornTradeMoney) {
                if (item.userID !== (await MetadataInterface.getUserID())) {
                    throw new UnsupportedTradeTypeError(
                        `Sender (${item.userID}) cannot trade money.`
                    );
                }
            }
            // TradeItem
            else if (item instanceof TornTradeItem) {
                if (item.userID === (await MetadataInterface.getUserID())) {
                    throw new UnsupportedTradeTypeError(`You (${item.userID}) cannot trade items.`);
                }
            }
            // Unsupported
            else {
                throw new UnsupportedTradeTypeError(`Unsupported trade item found. ${item}.`);
            }
        }
    }

    /**
     * Checks if this trade is linked to a Weav3rReceipt.
     * @returns Boolean: true if linked, false otherwise.
     */
    isLinked(): Boolean {
        return Boolean(this.linkedReceiptId);
    }

    /**
     * Compares a Weav3rReceipt against this trade and links it if valid.
     * @param receipt Weav3rReceipt: The receipt to compare.
     * @returns Boolean: true if receipt is valid, false otherwise.
     */
    compareAndLinkReceipt(receipt: Weav3rReceipt): Boolean {
        if (this.linkedReceiptId || receipt.linkedTradeId) {
            mydebug(
                [this.linkedReceiptId, receipt.linkedTradeId],
                "TornTrade.compareAndLinkReceipt: Receipt already linked"
            );
            return false;
        }

        if (!this.compareReceipt(receipt)) {
            return false;
        }

        this.linkedReceiptId = receipt.id;
        receipt.linkedTradeId = this.tornLogId;

        return true;
    }

    /**
     * Compares a Weav3rReceipt against this trade.
     * @param receipt Weav3rReceipt: The receipt to compare.
     * @returns Boolean: true if receipt is valid, false otherwise.
     */
    compareReceipt(receipt: Weav3rReceipt): Boolean {
        return TornTrade.compareReceipt(this, receipt);
    }

    /**
     * Verifies that the trade has only one money item and returns its amount.
     * @returns Total amount sent by the user.
     */
    getTotalValue(failSafe: boolean = false): number {
        const moneyItems = this.items.filter((item) => item instanceof TornTradeMoney);

        if (moneyItems.length !== 1) {
            throw new Error("Invalid trade: more than one money item found.");
        }

        return moneyItems[0].amount;
    }

    /**
     * Checks if the trade has only one money item.
     * @returns boolean: true if trade has only one money item.
     */
    hasOnlyOneMoneyItem(): boolean {
        return this.items.filter((item) => item instanceof TornTradeMoney).length === 1;
    }

    /**
     * Standardizes the items array to a standard format.
     * @param items any[]: The items array to standardize.
     * @returns (TornTradeItem | TornTradeMoney)[]: The standardized items array.
     */
    static standardizeItems(
        items: any[]
    ): (TornTradeItem | TornTradeMoney | UnsupportedTornTradeItem)[] {
        return items.map((item) => {
            if (item.type === "Money") {
                return new TornTradeMoney(item.user_id, item.details.amount);
            } else if (item.type === "Item") {
                return new TornTradeItem(item.user_id, item.details.id, item.details.amount);
            }

            return new UnsupportedTornTradeItem(item.user_id, item.type, item.details);
        });
    }

    /**
     * Checks if a trade receipt is valid for a given trade.
     * @param trade TornTrade: The trade to check against.
     * @param receipt Weav3rReceipt: The receipt to check.
     * @returns boolean: true if receipt is valid, false otherwise.
     */
    static compareReceipt(trade: TornTrade, receipt: Weav3rReceipt): Boolean {
        // Check if it's simple buy trade.
        if (trade.hasOnlyOneMoneyItem() && trade.getTotalValue() !== receipt.totalValue) {
            mydebug(
                [trade.getTotalValue(), receipt.totalValue],
                "TornTrade.compareReceipt: Receipt total value mismatch"
            );
            return false;
        }

        // Check that receipt was no older than 6 hours.
        if (receipt.createdAt < trade.timestamp - 6 * 60 * 60 - 10 * 60) {
            mydebug(
                [trade.timestamp, receipt.createdAt],
                "TornTrade.compareReceipt: Receipt too old"
            );
            return false;
        }

        // Check for item mismatches.
        const missingItemsInReceipt = trade.items.filter((item) => {
            if (item instanceof TornTradeMoney || item instanceof UnsupportedTornTradeItem) {
                return false;
            }
            return !receipt.items.some((rItem) => {
                return rItem.itemID === item.itemID && rItem.quantity === item.quantity;
            });
        });

        const missingItemsInTrade = receipt.items.filter((item) => {
            return !trade.items.some((tItem) => {
                if (tItem instanceof TornTradeMoney || tItem instanceof UnsupportedTornTradeItem) {
                    return false;
                }
                return tItem.itemID === item.itemID && tItem.quantity === item.quantity;
            });
        });

        if (missingItemsInReceipt.length > 0 || missingItemsInTrade.length > 0) {
            mydebug(
                [missingItemsInReceipt, missingItemsInTrade, trade.items, receipt.items],
                "TornTrade.compareReceipt: Receipt missing items"
            );
            return false;
        }

        return true;
    }

    /**
     * Creates a TornTrade from a plain object (from persistence).
     * @param data any: Plain object data.
     * @returns TornTrade: The created TornTrade instance.
     */
    static fromInterface(data: any): TornTrade {
        const trade = new TornTrade(
            data.id,
            data.tornLogId,
            data.timestamp,
            data.description,
            data.userID,
            data.traderID,
            data.items
        );
        trade.linkedReceiptId = data.linkedReceiptId;
        trade.manuallyLiked = data.manuallyLiked || false;
        trade.hasUnsupportedItems = data.hasUnsupportedItems || false;
        return trade;
    }

    /**
     * Creates a TornTrade from a TornTradeDetail interface.
     * @param detail TornTradeDetail: The trade detail from the API.
     * @returns Promise<TornTrade>: The created TornTrade instance.
     */
    static async fromTradeDetail(detail: any): Promise<TornTrade> {
        const userID = await MetadataInterface.getUserID();
        const trade = new TornTrade(
            String(detail.id),
            String(detail.id),
            Number(detail.timestamp),
            String(detail.description || ""),
            userID,
            Number(detail.trader_id),
            detail.items
        );
        return trade;
    }

    /**
     * Creates a TornTrade from a TornTradeDetail interface without validation.
     * @param detail any: The trade detail from the API.
     * @param userID number: The current user's ID.
     * @returns TornTrade: The created TornTrade instance.
     */
    static fromTradeDetailSync(detail: any, userID: number): TornTrade {
        const trade = new TornTrade(
            String(detail.id),
            String(detail.id),
            Number(detail.timestamp),
            String(detail.description || ""),
            userID,
            Number(detail.trader_id),
            detail.items
        );
        return trade;
    }
}

export class Weav3rReceiptItem {
    itemID: number;
    itemName: string;
    quantity: number;
    priceUsed: number;
    totalValue: number;

    constructor(
        itemID: number,
        itemName: string,
        quantity: number,
        priceUsed: number,
        totalValue: number
    ) {
        this.itemID = itemID;
        this.itemName = itemName;
        this.quantity = quantity;
        this.priceUsed = priceUsed;
        this.totalValue = totalValue;
    }
}

export class Weav3rReceipt {
    id: string;
    weav3rReceiptId: string;
    totalValue: number;
    createdAt: number;
    updatedAt: number;
    items: Weav3rReceiptItem[];
    linkedTradeId?: string;
    trashed?: boolean = false;

    /**
     * Creates a Weav3rReceipt from an API response (Weav3rReceipt interface).
     * @param response any: The API response with snake_case properties.
     * @returns Weav3rReceipt: The created Weav3rReceipt instance.
     */
    static fromApiResponse(response: any): Weav3rReceipt {
        return new Weav3rReceipt(
            response.id,
            response.trade_id,
            Number(response.total_value || 0),
            Number(response.created_at || 0),
            Number(response.updated_at || response.created_at || 0),
            (response.items || []).map(
                (item: any) =>
                    new Weav3rReceiptItem(
                        item.item_id,
                        item.item_name,
                        item.quantity,
                        item.price_used,
                        item.total_value
                    )
            )
        );
    }

    constructor(
        id: string,
        weav3rReceiptId: string,
        totalValue: number,
        createdAt: number,
        updatedAt: number,
        items: any[]
    ) {
        this.id = id;
        this.weav3rReceiptId = weav3rReceiptId;
        this.totalValue = totalValue;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.items = items.map(
            (item) =>
                new Weav3rReceiptItem(
                    item.item_id,
                    item.item_name,
                    item.quantity,
                    item.price_used,
                    item.total_value
                )
        );
    }

    /**
     * Trashes this receipt.
     */
    trash() {
        if (this.linkedTradeId) {
            throw new Error("Cannot trash a trade with a linked receipt.");
        }
        this.trashed = true;
    }

    /**
     * Converts this Weav3rReceipt to a plain object for persistence.
     * Uses snake_case format to match existing Weav3rReceipt interface.
     * @returns any: Plain object representation.
     */
    toInterface(): any {
        return {
            id: this.id,
            trade_id: this.weav3rReceiptId,
            total_value: this.totalValue,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
            items: this.items.map((item) => ({
                item_id: item.itemID,
                item_name: item.itemName,
                quantity: item.quantity,
                price_used: item.priceUsed,
                total_value: item.totalValue,
            })),
            linked_trade_id: this.linkedTradeId,
            trashed: this.trashed,
        };
    }

    /**
     * Creates a Weav3rReceipt from a plain object (from persistence).
     * @param data any: Plain object data.
     * @returns Weav3rReceipt: The created Weav3rReceipt instance.
     */
    static fromInterface(data: any): Weav3rReceipt {
        const receipt = new Weav3rReceipt(
            data.id,
            data.trade_id,
            Number(data.total_value || 0),
            Number(data.created_at || 0),
            Number(data.updated_at || data.created_at || 0),
            data.items || []
        );
        receipt.linkedTradeId = data.linked_trade_id;
        receipt.trashed = data.trashed || false;
        return receipt;
    }
}
