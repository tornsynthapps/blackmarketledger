import { NormalizedLog } from "../objects/TornLog";
import {
    ItemLog,
    ItemLogCategories
} from "../objects/ItemLog";
import { ItemLogWrapperMuseumSubType } from "../objects/ItemLogWrapper";
import { ItemList } from "../objects/Item";
import {
    defaultLogRegistry,
    HandlerDependencies,
    LogHandlerFn
} from "./LogParserRegistry";

/**
 * Normalizes a raw Torn UID field to the persisted representation.
 * @param rawUid (unknown): Raw UID from Torn payload data
 * @returns (string | null): Stable UID string or null when absent
 * @sideEffects None
 */
function normalizeRawUid(rawUid: unknown): string | null {
    if (rawUid === undefined || rawUid === null || rawUid === "") {
        return null;
    }

    return String(rawUid);
}

// --- Bazaar & Item Market Handlers ---

/**
 * Enhanced handler for Item Market logs that explicitly supports UIDs.
 * Matches structure: { "item": [ { "id": 392, "uid": 11193572926, "qty": 1 } ], "cost": 1700, ... }
 */
export async function handleItemMarketLog(log: NormalizedLog, deps: HandlerDependencies): Promise<void> {
    const existing = await deps.itemLogService.getLogByTornLogId(String(log.id));
    if (existing) return;

    const data = log.data || {};
    const typeId = log.typeId;

    if (typeId !== 1103 && typeId !== 1104) return;
    const type: "BUY" | "SELL" = typeId === 1103 ? "BUY" : "SELL";

    const totalCost = Number(data.cost_total) || Number(data.cost);
    const logsToPersist: ItemLog[] = [];


    // Process array of items (Structure seen in log 1103)
    const items = (data.items || data.item) as Array<{
        id?: number | string;
        qty?: number | string;
        uid?: number | string;
    }>;

    if (!Array.isArray(items)) return;

    const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const unitPrice = totalCost && totalQty ? totalCost / totalQty : Number(data.cost_each) || 0;

    items.forEach((item) => {
        const itemId = Number(item.id);
        const qty = Number(item.qty);
        if (itemId && qty) {
            logsToPersist.push(ItemLog.create({
                timestamp: log.timestamp * 1000,
                item_id: itemId,
                uid: normalizeRawUid(item.uid),
                quantity: type === "BUY" ? qty : -qty,
                unit_price: unitPrice,
                category: "normal",
                torn_log_id: String(log.id),
            }));
        }
    });

    if (logsToPersist.length > 0) {
        await deps.itemLogService.bulkPutLogs(logsToPersist);
    }
}

export async function handleBazaarOrMarketLog(log: NormalizedLog, deps: HandlerDependencies): Promise<void> {
    const existing = await deps.itemLogService.getLogByTornLogId(String(log.id));
    if (existing) return;

    const data = log.data || {};
    const typeId = log.typeId;

    let type: "BUY" | "SELL" | undefined;
    let category: ItemLogCategories = "normal";
    const logsToPersist: ItemLog[] = [];

    if (typeId === 1112 || typeId === 1225 || typeId === 1103 || typeId === 1220) {
        type = "BUY";
    } else if (typeId === 1113 || typeId === 1226 || typeId === 1221 || typeId === 1104) {
        type = "SELL";
    } else if (typeId === 4201) {
        type = "BUY";
        category = "abroad";
    }

    if (!type) return;

    const totalCost = Number(data.cost_total) || Number(data.cost);

    // Structure 1: Single item (data.item is a number, data.quantity exists)
    // Types: 4201 (abroad), 1220 (buy legacy), 1221 (sell legacy)
    if (typeof data.item === "number" || (typeof data.item === "string" && !isNaN(Number(data.item)))) {
        const itemId = Number(data.item);
        const amount = Number(data.quantity);
        const unitPrice = totalCost && amount ? totalCost / amount : Number(data.cost_each) || 0;

        if (itemId && amount) {
            logsToPersist.push(ItemLog.create({
                timestamp: log.timestamp * 1000,
                item_id: itemId,
                uid: normalizeRawUid(data.uid),
                quantity: type === "BUY" ? amount : -amount,
                unit_price: unitPrice,
                category,
                torn_log_id: String(log.id),
            }));
        }
    }
    // Structure 2: Multiple items (data.items or data.item is an array)
    // Types: 1112, 1113, 1225, 1226, 1103
    else {
        const items = (data.items || data.item) as Array<{
            id?: number | string;
            qty?: number | string;
            uid?: number | string;
        }>;
        if (!Array.isArray(items)) return;

        const totalQty = items.reduce((sum: number, item) => sum + Number(item.qty || 0), 0);
        const unitPrice = totalCost && totalQty ? totalCost / totalQty : Number(data.cost_each) || 0;

        items.forEach((item) => {
            const itemId = Number(item.id);
            const qty = Number(item.qty);
            if (itemId && qty) {
                logsToPersist.push(ItemLog.create({
                    timestamp: log.timestamp * 1000,
                    item_id: itemId,
                    uid: normalizeRawUid(item.uid),
                    quantity: type === "BUY" ? qty : -qty,
                    unit_price: unitPrice,
                    category,
                    torn_log_id: String(log.id),
                }));
            }
        });
    }

    if (logsToPersist.length > 0) {
        await deps.itemLogService.bulkPutLogs(logsToPersist);
    }
}

/**
 * Enhanced handler for Bazaar logs that explicitly supports UIDs.
 * Matches structure: { "buyer": 2665723, "items": [ { "id": 273, "uid": null, "qty": 58 } ], ... }
 */
export async function handleBazaarLog(log: NormalizedLog, deps: HandlerDependencies): Promise<void> {
    const existing = await deps.itemLogService.getLogByTornLogId(String(log.id));
    if (existing) return;

    const data = log.data || {};
    const typeId = log.typeId;

    if (typeId !== 1225 && typeId !== 1226) return;
    const type: "BUY" | "SELL" = typeId === 1225 ? "BUY" : "SELL";

    const totalCost = Number(data.cost_total) || Number(data.cost);
    const logsToPersist: ItemLog[] = [];

    const items = (data.items || data.item) as Array<{
        id?: number | string;
        qty?: number | string;
        uid?: number | string;
    }>;

    if (!Array.isArray(items)) return;

    const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const unitPrice = totalCost && totalQty ? totalCost / totalQty : Number(data.cost_each) || 0;

    items.forEach((item) => {
        const itemId = Number(item.id);
        const qty = Number(item.qty);
        if (itemId && qty) {
            logsToPersist.push(ItemLog.create({
                timestamp: log.timestamp * 1000,
                item_id: itemId,
                uid: normalizeRawUid(item.uid),
                quantity: type === "BUY" ? qty : -qty,
                unit_price: unitPrice,
                category: "normal",
                torn_log_id: String(log.id),
            }));
        }
    });

    if (logsToPersist.length > 0) {
        await deps.itemLogService.bulkPutLogs(logsToPersist);
    }
}

// --- Points Market Handlers ---

export async function handlePointLog(log: NormalizedLog, deps: HandlerDependencies): Promise<void> {
    const existing = await deps.itemLogService.getLogByTornLogId(String(log.id));
    if (existing) return;

    const data = log.data || {};
    const typeId = log.typeId;

    let type: "BUY" | "SELL" | undefined;
    if (typeId === 5010) type = "BUY";
    else if (typeId === 5011) type = "SELL";

    if (!type) return;

    const quantity = Number(data.quantity) || Number(data.points);
    const totalCost = Number(data.cost_total);
    const unitPrice = totalCost && quantity ? totalCost / quantity : Number(data.cost_each) || 0;

    if (quantity) {
        await deps.itemLogService.addItemLog({
            timestamp: log.timestamp * 1000,
            item_id: ItemList.POINTS,
            quantity: type === "BUY" ? quantity : -quantity,
            unit_price: unitPrice,
            category: "normal",
            torn_log_id: String(log.id),
        });
    }
}

// --- Museum Handlers ---

export async function handleMuseumLog(log: NormalizedLog, deps: HandlerDependencies): Promise<void> {
    // Museum service handles its own deduplication/existence checks usually, 
    // but we can check here for safety.
    const existing = await deps.itemLogService.getLogByTornLogId(String(log.id));
    if (existing) return;

    const data = log.data || {};
    // Expecting structure: { "set": "Plushie Set", "quantity": 10, ... }

    const times = Number(data.quantity) || Number(data.sets) || Number(data.amount) || 0;
    const typeStr = String(data.set || data.set_type || "").toLowerCase();

    if (!times || !typeStr) return;

    let subType: ItemLogWrapperMuseumSubType | undefined = undefined;
    if (typeStr.includes("plushie")) subType = "plushie-set";
    else if (typeStr.includes("flower")) subType = "exotic-flower-set";
    else if (typeStr.includes("vairocana")) subType = "vairocana-buddha";
    else if (typeStr.includes("ganesha")) subType = "ganesha-sculpture";
    else if (typeStr.includes("shabti")) subType = "shabti-sculpture";
    else if (typeStr.includes("arrowhead")) subType = "arrowhead-set";
    else if (typeStr.includes("coin")) subType = "medieval-coin-set";
    else if (typeStr.includes("scripts")) subType = "companion-scripts";
    else if (typeStr.includes("senet")) subType = "senet-game-set";
    else if (typeStr.includes("amulet")) subType = "egyptian-amulet";

    if (subType) {
        await deps.museumService.exchangeSet(subType, times, deps.itemLogService, log.timestamp * 1000);
    }
}

// --- Mug Handlers ---

export async function handleMugLog(log: NormalizedLog, deps: HandlerDependencies): Promise<void> {
    // Per user request: skip for now.
    return Promise.resolve();
}

// --- City Find Handlers ---

export async function handleCityFindLog(log: NormalizedLog, deps: HandlerDependencies): Promise<void> {
    const existing = await deps.itemLogService.getLogByTornLogId(String(log.id));
    if (existing) return;

    const data = log.data || {};
    // Sample: { "item": 528 }
    const itemId = Number(data.item);

    if (itemId) {
        await deps.itemLogService.addItemLog({
            timestamp: log.timestamp * 1000,
            item_id: itemId,
            uid: normalizeRawUid(data.uid),
            quantity: 1, // Usually 1 for city finds
            unit_price: 0,
            category: "city-finds",
            torn_log_id: String(log.id),
        });
    }
}

// --- Shop Handlers ---

export async function handleShopBuyLog(log: NormalizedLog, deps: HandlerDependencies): Promise<void> {
    const existing = await deps.itemLogService.getLogByTornLogId(String(log.id));
    if (existing) return;

    const data = log.data || {};
    // Sample: { "item": 97, "quantity": 100, "cost_total": 500, ... }
    const itemId = Number(data.item);
    const amount = Number(data.quantity);
    const total = Number(data.cost_total);
    const unitPrice = total && amount ? total / amount : Number(data.cost_each) || 0;

    if (itemId && amount) {
        await deps.itemLogService.addItemLog({
            timestamp: log.timestamp * 1000,
            item_id: itemId,
            uid: normalizeRawUid(data.uid),
            quantity: amount,
            unit_price: unitPrice,
            category: "city-shop",
            torn_log_id: String(log.id),
        });
    }
}

export async function handleItemShopSell(log: NormalizedLog, deps: HandlerDependencies): Promise<void> {
    const existing = await deps.itemLogService.getLogByTornLogId(String(log.id));
    if (existing) return;

    const data = log.data || {};
    // Sample: { "item": 40, "quantity": 1, "value_each": 20, "total_value": 20, "color": "green" }
    const itemId = Number(data.item);
    const amount = Number(data.quantity);
    const total = Number(data.total_value);
    const unitPrice = total && amount ? total / amount : Number(data.value_each) || 0;

    if (itemId && amount) {
        await deps.itemLogService.addItemLog({
            timestamp: log.timestamp * 1000,
            item_id: itemId,
            uid: normalizeRawUid(data.uid),
            quantity: -amount,
            unit_price: unitPrice,
            category: "normal",
            torn_log_id: String(log.id),
        });
    }
}

// --- Crime Handlers ---

export async function handleCrimeLog(log: NormalizedLog, deps: HandlerDependencies): Promise<void> {
    const existing = await deps.itemLogService.getLogByTornLogId(String(log.id));
    if (existing) return;

    const data = log.data || {};
    // Sample: { "items_gained": { "634": 1 }, ... }
    const itemsGained = data.items_gained;

    if (itemsGained && typeof itemsGained === "object") {
        const logsToPersist: ItemLog[] = [];

        Object.entries(itemsGained).forEach(([itemIdStr, quantity]) => {
            const itemId = Number(itemIdStr);
            const amount = Number(quantity);

            if (itemId && amount) {
                logsToPersist.push(ItemLog.create({
                    timestamp: log.timestamp * 1000,
                    item_id: itemId,
                    quantity: amount,
                    unit_price: 0,
                    category: "crimes",
                    torn_log_id: String(log.id),
                }));
            }
        });

        if (logsToPersist.length > 0) {
            await deps.itemLogService.bulkPutLogs(logsToPersist);
        }
    }
}

export async function handleCrimeSuccessItemGain(log: NormalizedLog, deps: HandlerDependencies): Promise<void> {
    const existing = await deps.itemLogService.getLogByTornLogId(String(log.id));
    if (existing) return;

    const data = log.data || {};
    // Sample: { "crime": 17, "nerve": 4, "item_gained": 35, "color": "green" }
    const itemId = Number(data.item_gained);
    const amount = Number(data.quantity || 1);

    if (itemId) {
        await deps.itemLogService.addItemLog({
            timestamp: log.timestamp * 1000,
            item_id: itemId,
            uid: normalizeRawUid(data.uid),
            quantity: amount,
            unit_price: 0,
            category: "crimes",
            torn_log_id: String(log.id),
        });
    }
}

// --- Dump Handlers ---

export async function handleDumpLog(log: NormalizedLog, deps: HandlerDependencies): Promise<void> {
    const existing = await deps.itemLogService.getLogByTornLogId(String(log.id));
    if (existing) return;

    const data = log.data || {};
    const typeId = log.typeId;
    // 1401: Dump find (item in)
    // 1400: Dump add (item out)
    const itemId = Number(data.item);
    const quantity = Number(data.quantity || 1);

    if (itemId) {
        await deps.itemLogService.addItemLog({
            timestamp: log.timestamp * 1000,
            item_id: itemId,
            uid: normalizeRawUid(data.uid),
            quantity: typeId === 1400 ? -quantity : quantity,
            unit_price: 0,
            category: "dump",
            torn_log_id: String(log.id),
        });
    }
}

export async function handleChristmasTownItems(log: NormalizedLog, deps: HandlerDependencies): Promise<void> {
    const existing = await deps.itemLogService.getLogByTornLogId(String(log.id));
    if (existing) return;

    const data = log.data || {};
    // Sample: { "minigame": "visited Santa", "items": { "527": 1, "528": 1 }, "color": "green" }
    const items = data.items;

    if (items && typeof items === "object") {
        const logsToPersist: ItemLog[] = [];

        Object.entries(items).forEach(([itemIdStr, quantity]) => {
            const itemId = Number(itemIdStr);
            const amount = Number(quantity);

            if (itemId && amount) {
                logsToPersist.push(ItemLog.create({
                    timestamp: log.timestamp * 1000,
                    item_id: itemId,
                    quantity: amount,
                    unit_price: 0,
                    category: "christmas-town",
                    torn_log_id: String(log.id),
                }));
            }
        });

        if (logsToPersist.length > 0) {
            await deps.itemLogService.bulkPutLogs(logsToPersist);
        }
    }
}

// --- Initialization ---
type LogAttribute = {
    description: string;
    handler: LogHandlerFn;
    uidSupported: boolean;
};

const logs: Record<number, LogAttribute> = {
    1103: { description: "Item market buy (old)", handler: handleItemMarketLog, uidSupported: true },
    1104: { description: "Item market sell (old)", handler: handleItemMarketLog, uidSupported: true },
    1112: { description: "Bazaar buy", handler: handleBazaarOrMarketLog, uidSupported: false },
    1113: { description: "Bazaar sell", handler: handleBazaarOrMarketLog, uidSupported: false },
    1220: { description: "Item market buy (legacy)", handler: handleBazaarOrMarketLog, uidSupported: false },
    1221: { description: "Item market sell (legacy)", handler: handleBazaarOrMarketLog, uidSupported: false },
    1225: { description: "Bazaar buy", handler: handleBazaarLog, uidSupported: true },
    1226: { description: "Bazaar sell", handler: handleBazaarLog, uidSupported: true },
    4201: { description: "Item bought abroad", handler: handleBazaarOrMarketLog, uidSupported: false },
    5010: { description: "Point market buy", handler: handlePointLog, uidSupported: false },
    5011: { description: "Point market sell", handler: handlePointLog, uidSupported: false },
    7000: { description: "Museum set exchange", handler: handleMuseumLog, uidSupported: false },
    8156: { description: "Mugged (skipped)", handler: handleMugLog, uidSupported: false },
    7011: { description: "City item find", handler: handleCityFindLog, uidSupported: false },
    4200: { description: "Shop item buy", handler: handleShopBuyLog, uidSupported: false },
    4210: { description: "Shop item sell", handler: handleItemShopSell, uidSupported: false },
    9020: { description: "Crime item gain (multiple)", handler: handleCrimeLog, uidSupported: false },
    5725: { description: "Crime item gain (single)", handler: handleCrimeSuccessItemGain, uidSupported: false },
    1400: { description: "Dump item add", handler: handleDumpLog, uidSupported: false },
    1401: { description: "Dump item find", handler: handleDumpLog, uidSupported: false },
    8938: { description: "Christmas Town items", handler: handleChristmasTownItems, uidSupported: false },
};

export function initializeDefaultHandlers() {
    Object.entries(logs).forEach(([typeId, attr]) => {
        defaultLogRegistry.register(Number(typeId), attr.handler, {
            uidSupported: attr.uidSupported,
            description: attr.description,
        });
    });
}
