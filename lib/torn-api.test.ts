import { afterEach, describe, expect, it, vi } from "vitest";
import { compareTradeAgainstReceipt, createParsedLogsFromReceipt, getNewLogs, parseNormalizedLog } from "./torn-api";

afterEach(() => {
    vi.restoreAllMocks();
});

describe("torn-api helpers", () => {
    it("parses a normalized bazaar sell log into a ledger sell", () => {
        const result = parseNormalizedLog({
            id: 1001,
            timestamp: 1710000000,
            category: "Bazaars",
            typeId: 0,
            title: "Bazaar sold item",
            data: {
                item_name: "Xanax",
                quantity: 2,
                total_value: 1640000
            },
            params: {}
        });

        expect(result.kind).toBe("parsed");
        if (result.kind !== "parsed") return;
        expect(result.logs[0]).toMatchObject({
            type: "SELL",
            item: "xanax",
            amount: 2,
            price: 820000,
            tornLogId: "1001"
        });
    });

    it("parses nested Torn items arrays for market logs", () => {
        const result = parseNormalizedLog({
            id: 1002,
            timestamp: 1710000001,
            category: "Item market",
            typeId: 0,
            title: "Item market buy",
            data: {
                items: [
                    { item_name: "Feathery Hotel Coupon", quantity: 1, total_value: 12000000 }
                ]
            },
            params: {}
        });

        expect(result.kind).toBe("parsed");
        if (result.kind !== "parsed") return;
        expect(result.logs[0]).toMatchObject({
            type: "BUY",
            item: "feathery hotel coupon",
            amount: 1,
            price: 12000000,
            tornLogId: "1002"
        });
    });

    it("resolves item ids through the Torn items map when names are missing", () => {
        const result = parseNormalizedLog({
            id: 1003,
            timestamp: 1710000002,
            category: "Bazaars",
            typeId: 0,
            title: "Bazaar sell",
            data: {
                items: [
                    { id: 27, quantity: 2, total_value: 1640000 }
                ]
            },
            params: {}
        }, new Map([[27, "xanax"]]));

        expect(result.kind).toBe("parsed");
        if (result.kind !== "parsed") return;
        expect(result.logs[0]).toMatchObject({
            type: "SELL",
            item: "xanax",
            amount: 2,
            price: 820000
        });
    });

    it("infers market action from data keys when title does not include buy or sell", () => {
        const result = parseNormalizedLog({
            id: 1004,
            timestamp: 1710000003,
            category: "Item market",
            typeId: 0,
            title: "Item market transaction",
            data: {
                qty_sold: 2,
                revenue: 1640000,
                items: [{ id: 27, qty: 2, total_value: 1640000 }]
            },
            params: {}
        }, new Map([[27, "xanax"]]));

        expect(result.kind).toBe("parsed");
        if (result.kind !== "parsed") return;
        expect(result.logs[0]).toMatchObject({
            type: "SELL",
            item: "xanax",
            amount: 2,
            price: 820000
        });
    });

    it("parses the provided item market sell payload shape", () => {
        const result = parseNormalizedLog({
            id: "TwgZnexqK7BinShT1HFx",
            timestamp: 1771745852,
            category: "Item market",
            typeId: 1113,
            title: "Item market sell",
            data: {
                buyer: 4114557,
                anonymous: 0,
                items: [{ id: 206, uid: null, qty: 1 }],
                cost_total: 798000,
                fee: 42000,
                cost_each: 840000
            },
            params: {
                italic: 1,
                color: "green"
            }
        }, new Map([[206, "xanax"]]));

        expect(result.kind).toBe("parsed");
        if (result.kind !== "parsed") return;
        expect(result.logs[0]).toMatchObject({
            type: "SELL",
            sourceType: "item-market",
            item: "xanax",
            amount: 1,
            price: 840000,
            tornLogId: "TwgZnexqK7BinShT1HFx"
        });
    });

    it("parses the provided bazaar buy payload shape", () => {
        const result = parseNormalizedLog({
            id: "nogVDZnMZcPvVhNbkzis",
            timestamp: 1773724128,
            category: "Bazaars",
            typeId: 1225,
            title: "Bazaar buy",
            data: {
                seller: 3630447,
                items: [{ id: 206, uid: null, qty: 2 }],
                cost_each: 820000,
                cost_total: 1640000
            },
            params: {
                color: "green"
            }
        }, new Map([[206, "xanax"]]));

        expect(result.kind).toBe("parsed");
        if (result.kind !== "parsed") return;
        expect(result.logs[0]).toMatchObject({
            type: "BUY",
            sourceType: "bazaar",
            item: "xanax",
            amount: 2,
            price: 820000,
            tornLogId: "nogVDZnMZcPvVhNbkzis"
        });
    });

    it("parses the provided bazaar sell payload shape", () => {
        const result = parseNormalizedLog({
            id: "tOgK1WiCrQEsRXAOXwWQ",
            timestamp: 1773899480,
            category: "Bazaars",
            typeId: 1226,
            title: "Bazaar sell",
            data: {
                buyer: 4172398,
                items: [{ id: 199, uid: 0, qty: 1 }],
                cost_each: 27999,
                cost_total: 27999
            },
            params: {
                italic: 1,
                color: "green"
            }
        }, new Map([[199, "cardholder"]]));

        expect(result.kind).toBe("parsed");
        if (result.kind !== "parsed") return;
        expect(result.logs[0]).toMatchObject({
            type: "SELL",
            sourceType: "bazaar",
            item: "cardholder",
            amount: 1,
            price: 27999,
            tornLogId: "tOgK1WiCrQEsRXAOXwWQ"
        });
    });

    it("parses the provided item market buy payload shape", () => {
        const result = parseNormalizedLog({
            id: "SZnQuG166odmpbGSpH3o",
            timestamp: 1773732598,
            category: "Item market",
            typeId: 1112,
            title: "Item market buy",
            data: {
                seller: 2053127,
                anonymous: 0,
                items: [{ id: 873, uid: null, qty: 1 }],
                cost_total: 900000,
                cost_each: 900000
            },
            params: {
                hideName: [1],
                color: "green"
            }
        }, new Map([[873, "feathery hotel coupon"]]));

        expect(result.kind).toBe("parsed");
        if (result.kind !== "parsed") return;
        expect(result.logs[0]).toMatchObject({
            type: "BUY",
            sourceType: "item-market",
            item: "feathery hotel coupon",
            amount: 1,
            price: 900000,
            tornLogId: "SZnQuG166odmpbGSpH3o"
        });
    });

    it("flags a mismatch when receipt money differs from Torn trade money", () => {
        const comparison = compareTradeAgainstReceipt({
            id: 500,
            timestamp: 1710000000,
            user: { id: 1, name: "me" },
            trader: { id: 2, name: "seller" },
            items: [
                { user_id: 1, type: "Money", details: { amount: 1000 } },
                { user_id: 2, type: "Item", details: { id: 27, amount: 1 } }
            ]
        }, {
            id: "receipt-1",
            trade_id: "500",
            total_value: 999,
            created_at: 1710000000,
            items: [{ item_id: 27, item_name: "Xanax", quantity: 1, price_used: 999, total_value: 999 }]
        }, "1");

        expect(comparison.differences.some((difference) => difference.kind === "money")).toBe(true);
    });

    it("creates buy logs from a matching receipt using Torn trade timestamp", () => {
        const logs = createParsedLogsFromReceipt({
            id: 500,
            timestamp: 1710000000,
            user: { id: 1, name: "me" },
            trader: { id: 2, name: "seller" },
            items: []
        }, {
            id: "receipt-1",
            trade_id: "500",
            total_value: 1000,
            created_at: 1710000000,
            items: [{ item_id: 27, item_name: "Xanax", quantity: 2, price_used: 500, total_value: 1000 }]
        });

        expect(logs[0]).toMatchObject({
            type: "BUY",
            item: "xanax",
            amount: 2,
            price: 500,
            loggedAt: 1710000000000,
            tornLogId: "trade:500",
            weav3rReceiptId: "receipt-1"
        });
    });

    it("still creates buy logs from receipt items even when Torn trade shape looks like a sell", () => {
        const logs = createParsedLogsFromReceipt({
            id: 501,
            timestamp: 1710000100,
            user: { id: 1, name: "me" },
            trader: { id: 2, name: "buyer" },
            items: [
                { user_id: 1, type: "Item", details: { id: 27, amount: 2 } },
                { user_id: 2, type: "Money", details: { amount: 1000 } }
            ]
        }, {
            id: "receipt-2",
            trade_id: "501",
            total_value: 1000,
            created_at: 1710000100,
            items: [{ item_id: 27, item_name: "Xanax", quantity: 2, price_used: 500, total_value: 1000 }]
        });

        expect(logs[0]).toMatchObject({
            type: "BUY",
            item: "xanax",
            amount: 2,
            price: 500,
            loggedAt: 1710000100000,
            tornLogId: "trade:501",
            weav3rReceiptId: "receipt-2"
        });
    });

    it("requests Torn category logs with from, to, sort=desc, and limit=20", async () => {
        const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({ log: [], _metadata: { links: { prev: null, next: null } } })
        } as Response);

        await getNewLogs("test-key", { lastTimestamp: 1772217000, lastLogId: "" });

        const firstUrl = new URL(String(fetchMock.mock.calls[0][0]));
        expect(firstUrl.pathname).toBe("/v2/user/log");
        expect(firstUrl.searchParams.get("cat")).toBe("11");
        expect(firstUrl.searchParams.get("from")).toBe("1772217000");
        expect(firstUrl.searchParams.get("limit")).toBe("20");
        expect(firstUrl.searchParams.get("sort")).toBe("desc");
        expect(firstUrl.searchParams.get("key")).toBe("test-key");
        expect(firstUrl.searchParams.get("to")).toBeTruthy();
    });

    it("paginates category logs by keeping from fixed and moving to backward", async () => {
        const fetchMock = vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    log: Array.from({ length: 20 }, (_, index) => ({
                        id: `log-${index}`,
                        timestamp: 1773893382 - index,
                        details: {
                            id: 1226,
                            title: "Bazaar sell",
                            category: "Bazaars"
                        },
                        data: {
                            items: [{ id: 199, qty: 1 }],
                            cost_each: 100,
                            cost_total: 100
                        },
                        params: {}
                    })),
                    _metadata: {
                        links: {
                            prev: "https://api.torn.com/v2/user/log?cat=11&from=1772217000&to=1773893362&limit=20&sort=desc",
                            next: null
                        }
                    }
                })
            } as Response)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ log: [], _metadata: { links: { prev: null, next: null } } })
            } as Response)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ log: [], _metadata: { links: { prev: null, next: null } } })
            } as Response);

        await getNewLogs("test-key", { lastTimestamp: 1772217000, lastLogId: "" });

        const firstUrl = new URL(String(fetchMock.mock.calls[0][0]));
        const secondUrl = new URL(String(fetchMock.mock.calls[2][0]));

        expect(firstUrl.searchParams.get("from")).toBe("1772217000");
        expect(secondUrl.searchParams.get("from")).toBe("1772217000");
        expect(firstUrl.searchParams.get("to")).toBeTruthy();
        expect(secondUrl.searchParams.get("to")).toBe(String(1773893382 - 20));
        expect(secondUrl.searchParams.get("limit")).toBe("20");
        expect(secondUrl.searchParams.get("sort")).toBe("desc");
        expect(secondUrl.searchParams.get("cat")).toBe("11");
    });

    it("continues following prev links even when a page has no new logs after filtering", async () => {
        const fetchMock = vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    log: [
                        {
                            id: "same-ts-older",
                            timestamp: 1772217000,
                            details: { id: 1226, title: "Bazaar sell", category: "Bazaars" },
                            data: { items: [{ id: 199, qty: 1 }], cost_each: 100, cost_total: 100 },
                            params: {}
                        }
                    ],
                    _metadata: {
                        links: {
                            prev: "https://api.torn.com/v2/user/log?cat=18&from=1772217000&to=1772216999&limit=20&sort=desc",
                            next: null
                        }
                    }
                })
            } as Response)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    log: [],
                    _metadata: { links: { prev: null, next: null } }
                })
            } as Response)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    log: [
                        {
                            id: "newer-id",
                            timestamp: 1772217000,
                            details: { id: 1226, title: "Bazaar sell", category: "Bazaars" },
                            data: { items: [{ id: 199, qty: 1 }], cost_each: 100, cost_total: 100 },
                            params: {}
                        }
                    ],
                    _metadata: { links: { prev: null, next: null } }
                })
            } as Response)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    log: [],
                    _metadata: { links: { prev: null, next: null } }
                })
            } as Response);

        const result = await getNewLogs("test-key", { lastTimestamp: 1772217000, lastLogId: "zzzz" });

        expect(fetchMock.mock.calls[2]).toBeTruthy();
        const thirdUrl = new URL(String(fetchMock.mock.calls[2][0]));
        expect(thirdUrl.searchParams.get("cat")).toBe("18");
        expect(thirdUrl.searchParams.get("to")).toBe("1772216999");
        expect(thirdUrl.searchParams.get("key")).toBe("test-key");
        expect(result.logs).toHaveLength(0);
    });
});
