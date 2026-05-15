import { NormalizedLog } from "../objects/TornLog";
import { 
    ItemLog,
    ItemLogCategories 
} from "../objects/ItemLog";
import { ItemLogWrapperMuseumSubType } from "../objects/ItemLogWrapper";
import { ItemList } from "../objects/Item";
import {
    pickNumber,
    pickString,
    defaultLogRegistry,
    HandlerDependencies
} from "./LogParserRegistry";

// --- Bazaar & Item Market Handlers ---

export async function handleBazaarOrMarketLog(log: NormalizedLog, deps: HandlerDependencies): Promise<void> {
    const existing = await deps.itemLogService.getLogByTornLogId(String(log.id));
    if (existing) return;

    const data = log.data || {};
    const typeId = log.typeId;
    
    let type: "BUY" | "SELL" | undefined;
    let category: ItemLogCategories = "normal";
    const logsToPersist: ItemLog[] = [];

    if (typeId === 1112 || typeId === 1225) {
        type = "BUY";
    } else if (typeId === 1113 || typeId === 1226) {
        type = "SELL";
    } else if (typeId === 4201) {
        type = "BUY";
        category = "abroad";
    }

    if (!type) return;

    if (typeId === 4201) {
        const itemId = Number(data.item);
        const amount = Number(data.quantity);
        const total = Number(data.cost_total);
        const unitPrice = total && amount ? total / amount : Number(data.cost_each) || 0;
        
        if (itemId && amount) {
             logsToPersist.push(ItemLog.create({
                timestamp: log.timestamp * 1000,
                item_id: itemId,
                quantity: amount,
                unit_price: unitPrice,
                category,
                torn_log_id: String(log.id),
            }));
        }
    } else {
        const items = data.items;
        if (!Array.isArray(items)) return;

        const totalCost = Number(data.cost_total);
        const totalQty = items.reduce((sum: number, item: any) => sum + Number(item.qty || 0), 0);
        const unitPrice = totalCost && totalQty ? totalCost / totalQty : Number(data.cost_each) || 0;
        
        items.forEach((item: any) => {
            const itemId = Number(item.id);
            const qty = Number(item.qty);
            if (itemId && qty) {
                logsToPersist.push(ItemLog.create({
                    timestamp: log.timestamp * 1000,
                    item_id: itemId,
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

    const quantity = Number(data.points);
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
            quantity: amount,
            unit_price: unitPrice,
            category: "city-shop",
            torn_log_id: String(log.id),
        });
    }
}

// --- Initialization ---

export function initializeDefaultHandlers() {
    // Register Market & Bazaar logs
    defaultLogRegistry.register([1112, 1113, 1225, 1226, 4201], handleBazaarOrMarketLog);

    // Register Point Market logs
    defaultLogRegistry.register([5010, 5011], handlePointLog);

    // Register Museum logs
    defaultLogRegistry.register(7000, handleMuseumLog);

    // Register Mug logs
    defaultLogRegistry.register(8156, handleMugLog);

    // Register City Finds
    defaultLogRegistry.register(7011, handleCityFindLog);

    // Register Shop Buys
    defaultLogRegistry.register(4200, handleShopBuyLog);
}

