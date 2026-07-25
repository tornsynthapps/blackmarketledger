import { vi, describe, it, expect, beforeEach } from "vitest";
import { ItemLogService } from "./ItemLogService";
import { createItemIdentity, getItemIdentityKey, ItemLog, ItemLogRegistry } from "../objects/ItemLog";
import { ItemLogWrapper, ItemLogWrapperRegistry } from "../objects/ItemLogWrapper";
import { ItemList } from "../objects/Item";
import { TornAPIClient } from "../tornAPI";

import { MuseumService } from "./MuseumService";

vi.mock("../tornAPI", () => ({
    TornAPIClient: {
        getMarketPrices: vi.fn(),
    },
}));

vi.mock("../objects/ItemLog", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../objects/ItemLog")>();
    return {
        ...actual,
        ItemLogRegistry: vi.fn(),
    };
});

vi.mock("../objects/ItemLogWrapper", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../objects/ItemLogWrapper")>();
    return {
        ...actual,
        ItemLogWrapperRegistry: vi.fn(),
    };
});

describe("ItemLogService Museum Fallback", () => {
    let service: ItemLogService;
    let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
    let mockWrapperRegistry: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockRegistry = {
            getLatestTotalsPerCategoryBefore: vi.fn(),
            put: vi.fn(),
            delete: vi.fn(),
            getLogsByWrapperId: vi.fn(),
            getAll: vi.fn(),
        };
        mockWrapperRegistry = {
            getById: vi.fn(),
            put: vi.fn(),
            delete: vi.fn(),
        };
        (ItemLogRegistry as unknown as ReturnType<typeof vi.fn>).mockImplementation(function() { return mockRegistry; });
        (ItemLogWrapperRegistry as unknown as ReturnType<typeof vi.fn>).mockImplementation(function() { return mockWrapperRegistry; });
        service = new ItemLogService();
        
        (TornAPIClient.getMarketPrices as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            [ItemList.SHEEP_PLUSHIE]: 1000,
        });
    });

    it("should use abroad stock when normal stock is empty", async () => {
        const timestamp = 1000000;
        const wid = 1;
        
        const wrapper = ItemLogWrapper.create({
            timestamp,
            type: "museum-exchange",
            sub_type: "plushie-set",
        });
        (wrapper as unknown as Record<string, unknown>).id = wid;

        const sheepLog = ItemLog.create({
            timestamp,
            item_id: ItemList.SHEEP_PLUSHIE,
            quantity: -1,
            unit_price: 0,
            category: "normal",
            wrapper_id: wid,
        });
        const pointsLog = ItemLog.create({
            timestamp,
            item_id: ItemList.POINTS,
            quantity: 10,
            unit_price: 0,
            category: "museum",
            wrapper_id: wid,
        });

        mockWrapperRegistry.getById.mockResolvedValue(wrapper);
        mockRegistry.getLogsByWrapperId.mockResolvedValue([sheepLog, pointsLog]);
        
        // Setup totals: normal is empty, abroad has 5 sheep at $500 each
        mockRegistry.getLatestTotalsPerCategoryBefore.mockImplementation((identity: { item_id: number; uid: string | null }) => {
            const totals = new Map();
            if (identity.item_id === ItemList.SHEEP_PLUSHIE) {
                totals.set("normal", { stock: 0, cost: 0 });
                totals.set("abroad", { stock: 5, cost: 2500 });
            } else {
                totals.set("normal", { stock: 0, cost: 0 });
            }
            return Promise.resolve(totals);
        });

        const runningTotalsByItem = new Map();
        // Initialize running totals for points
        runningTotalsByItem.set(getItemIdentityKey(createItemIdentity(ItemList.POINTS, null)), new Map([["museum", { stock: 100, cost: 10000 }]]));

        await (service as unknown as Record<string, (...args: unknown[]) => unknown>).handleMuseumExchangeWrapper(wid, sheepLog, [sheepLog, pointsLog], 0, runningTotalsByItem, new Set());

        // Verify abroad was used
        const puts = (mockRegistry.put as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
        const abroadLog = puts.find((l: ItemLog) => l.category === "abroad");
        expect(abroadLog).toBeTruthy();
        expect(abroadLog.quantity).toBe(-1);
        // unit_price should be market price (1000) since normal cost is 0
        expect(abroadLog.unit_price).toBe(1000);
        // realized_profit = 1000 - 500 = 500
        expect(abroadLog.realized_profit).toBe(500);
        
        const pointsOutputLog = puts.find((l: ItemLog) => l.item_id === ItemList.POINTS);
        expect(pointsOutputLog.unit_price).toBe(100); // 1000 total cost / 10 points
    });

    it("should use normal cost-basis as selling price for city-finds stock", async () => {
        const timestamp = 1000000;
        const wid = 2;
        
        const wrapper = ItemLogWrapper.create({
            timestamp,
            type: "museum-exchange",
            sub_type: "plushie-set",
        });
        (wrapper as unknown as Record<string, unknown>).id = wid;

        const sheepLog = ItemLog.create({
            timestamp,
            item_id: ItemList.SHEEP_PLUSHIE,
            quantity: -1,
            unit_price: 0,
            category: "normal",
            wrapper_id: wid,
        });
        const pointsLog = ItemLog.create({
            timestamp,
            item_id: ItemList.POINTS,
            quantity: 10,
            unit_price: 0,
            category: "museum",
            wrapper_id: wid,
        });

        mockWrapperRegistry.getById.mockResolvedValue(wrapper);
        mockRegistry.getLogsByWrapperId.mockResolvedValue([sheepLog, pointsLog]);
        
        // Setup totals: normal has 0 stock but had a cost basis of $2000 from previous logs
        // (Wait, if stock is 0, cost is usually 0, but let's simulate normal having stock first)
        mockRegistry.getLatestTotalsPerCategoryBefore.mockImplementation((identity: { item_id: number; uid: string | null }) => {
            const totals = new Map();
            if (identity.item_id === ItemList.SHEEP_PLUSHIE) {
                totals.set("normal", { stock: 1, cost: 2000 });
                totals.set("city-finds", { stock: 1, cost: 0 });
            } else {
                totals.set("normal", { stock: 0, cost: 0 });
            }
            return Promise.resolve(totals);
        });

        const runningTotalsByItem = new Map();
        runningTotalsByItem.set(getItemIdentityKey(createItemIdentity(ItemList.POINTS, null)), new Map([["museum", { stock: 0, cost: 0 }]]));

        // We want to exchange 2 sets
        const sheepLog2 = ItemLog.create({
            timestamp,
            item_id: ItemList.SHEEP_PLUSHIE,
            quantity: -2,
            unit_price: 0,
            category: "normal",
            wrapper_id: wid,
        });
        const pointsLog2 = ItemLog.create({
            timestamp,
            item_id: ItemList.POINTS,
            quantity: 20,
            unit_price: 0,
            category: "museum",
            wrapper_id: wid,
        });
        mockRegistry.getLogsByWrapperId.mockResolvedValue([sheepLog2, pointsLog2]);

        await (service as unknown as Record<string, (...args: unknown[]) => unknown>).handleMuseumExchangeWrapper(wid, sheepLog2, [sheepLog2, pointsLog2], 0, runningTotalsByItem, new Set());

        const puts = (mockRegistry.put as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
        const normalRemoval = puts.find((l: ItemLog) => l.category === "normal");
        const cityFindsRemoval = puts.find((l: ItemLog) => l.category === "city-finds");

        expect(normalRemoval.quantity).toBe(-1);
        expect(normalRemoval.unit_price).toBe(2000);
        
        expect(cityFindsRemoval.quantity).toBe(-1);
        expect(cityFindsRemoval.unit_price).toBe(2000); // Should match normal's avg cost
        expect(cityFindsRemoval.realized_profit).toBe(2000); // 2000 - 0 = 2000
        
        const pointsOutputLog = puts.find((l: ItemLog) => l.item_id === ItemList.POINTS);
        expect(pointsOutputLog.quantity).toBe(20);
        expect(pointsOutputLog.unit_price).toBe(200); // (2000 + 2000) / 20 points = 200
    });

    it("should correctly handle exchangeSet with multiple categories in MuseumService", async () => {
        const museumService = new MuseumService();
        const timestamp = 2000000;
        
        // Mock itemLogService
        const mockItemLogService = {
            getLatestTotalsByItemIdentities: vi.fn(),
            addWrapper: vi.fn().mockResolvedValue(100),
            bulkPutLogs: vi.fn(),
            logger: (service as unknown as Record<string, { logger: unknown }>).logger, // reuse logger
        };

        // Setup totals for SHEEP_PLUSHIE: normal has 0, crimes has 10
        mockItemLogService.getLatestTotalsByItemIdentities.mockImplementation((itemId: number) => {
            const totals = new Map();
            if (itemId === ItemList.SHEEP_PLUSHIE) {
                totals.set("normal", { stock: 0, cost: 0 });
                totals.set("crimes", { stock: 10, cost: 1000 }); // $100 avg
            } else {
                // Other items in set have plenty of normal stock
                totals.set("normal", { stock: 100, cost: 50000 }); // $500 avg
            }
            return Promise.resolve([{ identity: { item_id: itemId, uid: null }, totals }]);
        });

        (TornAPIClient.getMarketPrices as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            [ItemList.SHEEP_PLUSHIE]: 1500,
        });

        await museumService.exchangeSet("plushie-set", 1, mockItemLogService as unknown as ItemLogService, timestamp);

        expect(mockItemLogService.addWrapper).toHaveBeenCalled();
        const bulkPutCall = mockItemLogService.bulkPutLogs.mock.calls[0][0];
        
        const sheepLog = bulkPutCall.find((l: ItemLog) => l.item_id === ItemList.SHEEP_PLUSHIE);
        expect(sheepLog.category).toBe("crimes");
        // Normal cost was 0, so should use market price 1500
        expect(sheepLog.unit_price).toBe(1500);
        // Realized profit = 1500 - 100 = 1400
        expect(sheepLog.realized_profit).toBe(1400);

        const pointsLog = bulkPutCall.find((l: ItemLog) => l.item_id === ItemList.POINTS);
        expect(pointsLog.category).toBe("museum");
        // Total cost = 1 * 1500 (for sheep) + 12 * 500 (for other plushies) = 1500 + 6000 = 7500
        // Points gained = 10 (standard for plushie-set)
        // cost basis per point = 750
        expect(pointsLog.unit_price).toBe(750);
    });
});
