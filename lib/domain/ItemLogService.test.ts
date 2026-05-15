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
    });
});
