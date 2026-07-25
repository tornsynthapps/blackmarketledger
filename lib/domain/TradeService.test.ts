import { describe, it, expect, beforeEach, vi } from "vitest";
import { TradeService } from "./TradeService";
import { ReceiptService } from "./ReceiptService";
import { SyncService } from "./SyncService";
import { Trade, TradeRegistry } from "../objects/Trade";
import { Receipt, ReceiptRegistry } from "../objects/Receipt";
import { TradeItem, TradeItemRegistry } from "../objects/TradeItem";
import { ReceiptItem, ReceiptItemRegistry } from "../objects/ReceiptItem";
import { TornTrade, Weav3rReceipt } from "../old/game/trade";

describe("TradeService Linking", () => {
    it("should correctly compare and link incoming trade with receipt", () => {
        const ourUserId = "100";
        const traderId = "200";

        const mockTrade = new TornTrade(
            "123",
            "123",
            1700000000,
            "",
            parseInt(traderId), // Initiator (user.id = 200)
            parseInt(ourUserId), // Target/trader (trader.id = 100)
            [
                { type: "Money", user_id: parseInt(ourUserId), details: { amount: 10000 } },
                { type: "Item", user_id: parseInt(traderId), details: { id: 186, amount: 2 } }
            ]
        );

        const mockReceipt = new Weav3rReceipt(
            "r1",
            "r1",
            10000,
            1700000000,
            1700000000,
            [
                { item_id: 186, item_name: "Xanax", quantity: 2, price_used: 5000, total_value: 10000 }
            ]
        );

        const isLinked = mockTrade.compareAndLinkReceipt(mockReceipt, ourUserId);
        expect(isLinked).toBe(true);
        expect(mockTrade.linkedReceiptId).toBe("r1");
    });
});
