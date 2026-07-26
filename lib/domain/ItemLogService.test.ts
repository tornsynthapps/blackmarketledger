import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ItemLogService } from "./ItemLogService";
import { ItemLog, ItemLogRegistry } from "../objects/ItemLog";
import { ItemLogWrapper, ItemLogWrapperRegistry } from "../objects/ItemLogWrapper";

// Mock the registries
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

// CSV Parser Helper
function parseLogsCsv(filePath: string): ItemLog[] {
    const content = fs.readFileSync(filePath, "utf-8");
    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        cast: (value, context) => {
            if (context.header) return value;
            if (value === "") return null;
            if (!isNaN(Number(value)) && value.trim() !== "") return Number(value);
            return value;
        },
    });

    return records.map((record: any) => ItemLog.fromDatabase(record));
}

function parseWrappersCsv(filePath: string): ItemLogWrapper[] {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, "utf-8");
    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        cast: (value, context) => {
            if (context.header) return value;
            if (value === "") return null;
            if (!isNaN(Number(value)) && value.trim() !== "") return Number(value);
            return value;
        },
    });

    return records.map((record: any) => ItemLogWrapper.fromDatabase(record));
}

describe("ItemLogService", () => {
    let service: ItemLogService;
    let mockRegistry: any;
    let mockWrapperRegistry: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockRegistry = {
            getLogsByItemId: vi.fn(),
            getLogsByIdentity: vi.fn(),
            getLatestTotalsPerCategoryBefore: vi.fn(),
            put: vi.fn(),
            bulkPut: vi.fn(),
            delete: vi.fn(),
            getLogsByWrapperId: vi.fn(),
            getAll: vi.fn(),
        };

        mockWrapperRegistry = {
            getById: vi.fn(),
            put: vi.fn(),
            delete: vi.fn(),
            getAll: vi.fn(),
        };

        (ItemLogRegistry as any).mockImplementation(function (this: any) {
            return mockRegistry;
        });
        (ItemLogWrapperRegistry as any).mockImplementation(function (this: any) {
            return mockWrapperRegistry;
        });

        service = new ItemLogService();
    });

    describe("updateCostBasis", () => {
        const testDataDir = path.join(__dirname, "test-data");

        async function runTest(caseNum: number, startTimestamp: number) {
            const inputLogs = parseLogsCsv(path.join(testDataDir, `case${caseNum}_input_logs.csv`));
            const inputWrappers = parseWrappersCsv(path.join(testDataDir, `case${caseNum}_input_wrappers.csv`));
            const expectedOutputLogs = parseLogsCsv(path.join(testDataDir, `case${caseNum}_output_logs.csv`));

            mockRegistry.getAll.mockResolvedValue(inputLogs);
            mockRegistry.getLatestTotalsPerCategoryBefore.mockResolvedValue(
                new Map([
                    ["normal", { stock: 0, cost: 0 }],
                    ["abroad", { stock: 0, cost: 0 }],
                    ["museum", { stock: 0, cost: 0 }],
                    ["city-finds", { stock: 0, cost: 0 }],
                    ["city-shop", { stock: 0, cost: 0 }],
                    ["crimes", { stock: 0, cost: 0 }],
                    ["dump", { stock: 0, cost: 0 }],
                    ["skipped", { stock: 0, cost: 0 }],
                ])
            );

            mockWrapperRegistry.getById.mockImplementation((id: number) => {
                const w = inputWrappers.find(wrapper => wrapper.id === id);
                return Promise.resolve(w);
            });

            mockRegistry.getLogsByWrapperId.mockImplementation((id: number) => {
                const logs = inputLogs.filter(l => l.wrapper_id === id);
                return Promise.resolve(logs);
            });

            // Handle new IDs for created logs/wrappers
            let nextWrapperId = Math.max(0, ...inputWrappers.map(w => w.id ?? 0), ...inputLogs.map(l => l.wrapper_id ?? 0)) + 1;
            mockWrapperRegistry.put.mockImplementation(() => Promise.resolve(nextWrapperId++));
            
            let nextLogId = Math.max(0, ...inputLogs.map(l => l.id ?? 0)) + 1;
            mockRegistry.put.mockImplementation(() => Promise.resolve(nextLogId++));

            await service.updateCostBasis(startTimestamp);

            // Verify the results
            // 1. Logs in bulkPut
            const bulkPutLogs: ItemLog[] = mockRegistry.bulkPut.mock.calls.length > 0 ? mockRegistry.bulkPut.mock.calls[0][0] : [];
            
            // 2. Logs in individual put
            const individualPutLogs: ItemLog[] = mockRegistry.put.mock.calls.map(c => c[0]);

            const allActualLogs = [...bulkPutLogs, ...individualPutLogs];

            // Filter expected logs that were actually "touched" or created
            // The service only bulkPuts 'updatedLogs'. 
            // We need to compare the final state of the database for the item.
            // In our mock, the final state is inputLogs (as modified) + new logs.
            
            for (const expected of expectedOutputLogs) {
                const actual = allActualLogs.find(l => 
                    l.timestamp === expected.timestamp && 
                    l.category === expected.category &&
                    l.quantity === expected.quantity &&
                    l.unit_price === expected.unit_price
                );
                
                expect(actual, `Log not found: ${expected.category} ${expected.quantity} @ ${expected.unit_price}`).toBeTruthy();
                if (actual) {
                    expect(actual.total_stock).toBeCloseTo(expected.total_stock, 1);
                    expect(actual.total_cost).toBeCloseTo(expected.total_cost, 1);
                    expect(actual.realized_profit).toBeCloseTo(expected.realized_profit, 1);
                    if (expected.wrapper_id) {
                        expect(actual.wrapper_id).toBeTruthy();
                    } else {
                        expect(actual.wrapper_id).toBeNull();
                    }
                }
            }
        }

        it("(1) should handle no wrapper split", async () => {
            await runTest(1, 1777519444667);
        });

        it("(2) should handle auto-split wrapper reversal", async () => {
            await runTest(2, 1777520119238);
        });

        it("(3) should handle normal with different category split", async () => {
            await runTest(3, 1777521206160);
        });

        it("(4) should handle added items in past with reversal", async () => {
            await runTest(4, 1777521206160);
        });

        it("(5) should handle different source category split", async () => {
            await runTest(5, 1777521206160);
        });

        it("(6) should handle manual transfer split", async () => {
            await runTest(6, 1777521206160);
        });

        it("keeps same item_id with different uid buckets fully separate", async () => {
            const sharedTimestamp = 2000000;
            const logs = [
                ItemLog.create({
                    timestamp: sharedTimestamp,
                    item_id: 186,
                    uid: "alpha",
                    quantity: 2,
                    unit_price: 100,
                    category: "normal",
                }),
                ItemLog.create({
                    timestamp: sharedTimestamp + 1,
                    item_id: 186,
                    uid: "beta",
                    quantity: 3,
                    unit_price: 200,
                    category: "normal",
                }),
                ItemLog.create({
                    timestamp: sharedTimestamp + 2,
                    item_id: 186,
                    uid: "alpha",
                    quantity: -1,
                    unit_price: 150,
                    category: "normal",
                }),
            ];

            logs.forEach((log, index) => log.applyPersistedId(index + 1));

            mockRegistry.getAll.mockResolvedValue(logs);
            mockRegistry.getLatestTotalsPerCategoryBefore.mockImplementation((identity: { item_id: number; uid: string | null }) => {
                expect(identity.item_id).toBe(186);
                return Promise.resolve(
                    new Map([
                        ["normal", { stock: 0, cost: 0 }],
                        ["abroad", { stock: 0, cost: 0 }],
                        ["museum", { stock: 0, cost: 0 }],
                        ["city-finds", { stock: 0, cost: 0 }],
                        ["city-shop", { stock: 0, cost: 0 }],
                        ["crimes", { stock: 0, cost: 0 }],
                        ["dump", { stock: 0, cost: 0 }],
                        ["christmas-town", { stock: 0, cost: 0 }],
                        ["skipped", { stock: 0, cost: 0 }],
                    ])
                );
            });

            await service.updateCostBasis(sharedTimestamp);

            const updatedLogs: ItemLog[] = mockRegistry.bulkPut.mock.calls[0][0];
            const alphaBuy = updatedLogs.find((log) => log.uid === "alpha" && log.quantity === 2);
            const betaBuy = updatedLogs.find((log) => log.uid === "beta" && log.quantity === 3);
            const alphaSell = updatedLogs.find((log) => log.uid === "alpha" && log.quantity === -1);

            expect(alphaBuy?.total_stock).toBe(2);
            expect(alphaBuy?.total_cost).toBe(200);
            expect(betaBuy?.total_stock).toBe(3);
            expect(betaBuy?.total_cost).toBe(600);
            expect(alphaSell?.total_stock).toBe(1);
            expect(alphaSell?.total_cost).toBe(100);
            expect(alphaSell?.realized_profit).toBe(50);
        });

        it("should fallback to UID 0 stock when specific UID stock is insufficient and mark category as skipped-counted", async () => {
            const service = new ItemLogService();
            const mockRegistry = (service as any).registry;
            const mockWrapperRegistry = (service as any).wrapperRegistry;

            const logs = [
                ItemLog.create({
                    timestamp: 1000,
                    item_id: 179,
                    uid: "0",
                    quantity: 5,
                    unit_price: 100,
                    category: "normal",
                }),
                ItemLog.create({
                    timestamp: 2000,
                    item_id: 179,
                    uid: "23423423",
                    quantity: -3,
                    unit_price: 200,
                    category: "normal",
                }),
            ];

            vi.spyOn(service, "getAllLogs").mockResolvedValue(logs);
            vi.spyOn(mockRegistry, "getLatestTotalsPerCategoryBefore").mockResolvedValue(
                new Map([
                    ["normal", { stock: 0, cost: 0 }],
                    ["abroad", { stock: 0, cost: 0 }],
                ])
            );
            vi.spyOn(mockWrapperRegistry, "put").mockResolvedValue(99);
            vi.spyOn(mockRegistry, "put").mockImplementation(async (log: ItemLog) => {
                if (!log.id) log.applyPersistedId(Math.floor(Math.random() * 1000) + 1);
                return log.id!;
            });

            await service.updateCostBasis(1000);

            const bulkPutLogs: ItemLog[] = mockRegistry.bulkPut.mock.calls.flatMap((c: any) => c[0]);
            const putCalls: ItemLog[] = mockRegistry.put.mock.calls.map((c: any) => c[0]);
            const putLogs = [...bulkPutLogs, ...putCalls];

            const skippedCountedLog = putLogs.find(
                (l) => l.uid === "23423423" && l.category === "skipped-counted"
            );
            const noUidDeductionLog = putLogs.find((l) => l.uid === "0" && l.quantity === -3);

            expect(skippedCountedLog).toBeDefined();
            expect(noUidDeductionLog).toBeDefined();
            expect(noUidDeductionLog?.realized_profit).toBe(300); // 3 * 200 - 3 * 100 = 300
        });
    });

    describe("consumeItem", () => {
        it("should consume items from normal stock using average cost basis and log consumption loss", async () => {
            const mockRegistry = {
                getLatestTotalsPerCategoryBefore: vi.fn().mockResolvedValue(
                    new Map([
                        ["normal", { stock: 5, cost: 500 }],
                        ["abroad", { stock: 0, cost: 0 }],
                    ])
                ),
                bulkPut: vi.fn().mockResolvedValue(undefined),
                getAll: vi.fn().mockResolvedValue([]),
                getPaginatedLogs: vi.fn().mockResolvedValue([]),
                countLogs: vi.fn().mockResolvedValue(0),
            };

            const mockWrapperRegistry = {
                put: vi.fn().mockResolvedValue(1),
                getById: vi.fn().mockResolvedValue(null),
                getAll: vi.fn().mockResolvedValue([]),
                delete: vi.fn().mockResolvedValue(undefined),
            };

            (ItemLogRegistry as any).mockImplementation(function (this: any) {
                return mockRegistry;
            });
            (ItemLogWrapperRegistry as any).mockImplementation(function (this: any) {
                return mockWrapperRegistry;
            });

            const service = new ItemLogService();
            const logs = await service.consumeItem({
                timestamp: 1000,
                item_id: 1,
                quantity: 2,
                marketPrice: 300,
            });

            expect(logs.length).toBe(3);
            const normalDeduction = logs.find((l) => l.category === "normal");
            const consumptionAdd = logs.find((l) => l.category === "consumption" && l.quantity === 2);
            const consumptionDeduct = logs.find((l) => l.category === "consumption" && l.quantity === -2);

            expect(normalDeduction?.quantity).toBe(-2);
            expect(normalDeduction?.unit_price).toBe(100); // 500 / 5 = 100
            expect(consumptionAdd?.unit_price).toBe(100);
            expect(consumptionDeduct?.unit_price).toBe(0);
        });
    });
});
