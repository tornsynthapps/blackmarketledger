import { BaseService } from "./BaseService";
import { ItemLogService } from "./ItemLogService";
import { TradeService } from "./TradeService";
import { ReceiptService } from "./ReceiptService";
import { MuseumService } from "./MuseumService";
import { SystemConfigRegistry } from "../objects/SystemConfig";
import { TronWrapper } from "../old/torn-wrapper";
import { getTornApiKeyFull, getUserId } from "../old/api-keys";
import { LocalStorageInterface } from "../old/interfaces/localstorage";
import { MetadataInterface } from "../old/interfaces/metadata";
import { SyncCursor, ParsedLog } from "../old/torn-api";
import { TornAPI, T3BAPI } from "../old/game/api";
import { ItemLog, ItemLogCategories } from "../objects/ItemLog";
import { ItemLogWrapperMuseumSubType } from "../objects/ItemLogWrapper";
import { ItemList } from "../objects/Item";
import { TornAPIClient } from "../tornAPI";
import { TornTrade, Weav3rReceipt } from "../old/game/trade";

import { tornRateLimiter, weav3rRateLimiter } from "../old/rate-limiter";

export type SyncStepId = "logs" | "metadata" | "trades" | "receipts" | "linking";

export interface SyncStepStatus {
    id: SyncStepId;
    label: string;
    status: "pending" | "in-progress" | "complete" | "failed";
    progress: string;
    error?: string;
}

export interface SyncState {
    isActive: boolean;
    currentStepIndex: number;
    steps: SyncStepStatus[];
    targetTimestamp: number;
    originTimestamp: number;
}

export class SyncService extends BaseService {
    protected get SERVICE_NAME(): string {
        return "SyncService";
    }

    private readonly itemLogService: ItemLogService;
    private readonly tradeService: TradeService;
    private readonly receiptService: ReceiptService;
    private readonly museumService: MuseumService;
    private readonly systemConfigRegistry: SystemConfigRegistry;

    constructor() {
        super();
        this.itemLogService = new ItemLogService();
        this.tradeService = new TradeService();
        this.receiptService = new ReceiptService();
        this.museumService = new MuseumService();
        this.systemConfigRegistry = new SystemConfigRegistry();
    }

    /**
     * Retrieves the current persistent sync state.
     */
    public async getSyncState(): Promise<SyncState> {
        const state = await this.systemConfigRegistry.get("current_sync_state");
        if (state) return state;

        // Default initial state
        return {
            isActive: false,
            currentStepIndex: 0,
            steps: [
                { id: "logs", label: "Ingesting Logs", status: "pending", progress: "" },
                { id: "metadata", label: "Fetching Metadata", status: "pending", progress: "" },
                { id: "trades", label: "Populating Trades", status: "pending", progress: "" },
                { id: "receipts", label: "Populating Receipts", status: "pending", progress: "" },
                { id: "linking", label: "Linking Records", status: "pending", progress: "" },
            ],
            targetTimestamp: 0,
            originTimestamp: 0,
        };
    }

    /**
     * Persists the sync state to the registry.
     */
    public async saveSyncState(state: SyncState): Promise<void> {
        await this.systemConfigRegistry.set("current_sync_state", state);
    }

    /**
     * Retrieves the configured sync window duration in days.
     * Defaults to 7 days if not set.
     */
    public async getSyncWindowDays(): Promise<number> {
        return (await this.systemConfigRegistry.get("sync_window_days")) || 7;
    }

    /**
     * Updates the sync window duration.
     * @param days (number): Number of days per sync cycle.
     */
    public async setSyncWindowDays(days: number): Promise<void> {
        await this.systemConfigRegistry.set("sync_window_days", days);
    }

    /**
     * Resets and starts a fresh 5-step sync cycle.
     */
    public async startV2Sync(): Promise<SyncState> {
        const state = await this.getSyncState();
        
        const lastTimestamp = (await this.systemConfigRegistry.get("last_sync_timestamp")) || 0;
        const now = Math.floor(Date.now() / 1000);

        // Safety: If no cursor is set, default to 7 days ago to avoid fetching years of data
        // Actually, user explicitly asked to default to 0 earlier, but we still apply windowing.
        
        const windowDays = await this.getSyncWindowDays();
        const windowSeconds = windowDays * 24 * 60 * 60;

        // Limit sync window to configured duration
        const targetTimestamp = Math.min(now - 1, lastTimestamp + windowSeconds);

        state.isActive = true;
        state.currentStepIndex = 0;
        state.originTimestamp = lastTimestamp;
        state.targetTimestamp = targetTimestamp;
        
        // Reset steps
        state.steps.forEach(s => {
            s.status = "pending";
            s.progress = "";
            s.error = undefined;
        });

        await this.saveSyncState(state);
        this.logger.info(`Started V2 Sync Cycle. Origin: ${state.originTimestamp}, Target: ${state.targetTimestamp}`);
        return state;
    }
    /**
     * Resumes a previously interrupted or partially failed sync cycle.
     */
    public async resumeV2Sync(): Promise<SyncState> {
        const state = await this.getSyncState();

        // Find the first step that isn't complete
        const firstIncomplete = state.steps.findIndex(s => s.status !== "complete");

        if (firstIncomplete !== -1) {
            state.currentStepIndex = firstIncomplete;
            state.isActive = true;
            // Clear error for the step we are about to retry
            state.steps[firstIncomplete].status = "pending";
            state.steps[firstIncomplete].error = undefined;

            await this.saveSyncState(state);
            this.logger.info(`Resuming sync from step ${state.currentStepIndex + 1}: ${state.steps[firstIncomplete].id}`);
        } else {
            state.isActive = false;
            await this.saveSyncState(state);
        }

        return state;
    }

    /**
     * Executes the next pending/failed step in the sync cycle.
     * @returns (Promise<SyncState>): The updated state after step execution.
     */
    public async executeNextSyncStep(): Promise<SyncState> {
        const state = await this.getSyncState();
        if (!state.isActive || state.currentStepIndex >= state.steps.length) {
            state.isActive = false;
            await this.saveSyncState(state);
            return state;
        }

        const step = state.steps[state.currentStepIndex];
        step.status = "in-progress";
        await this.saveSyncState(state);

        try {
            switch (step.id) {
                case "logs":
                    this.logger.info("Executing step: Ingesting Logs");
                    await this.stepIngestLogs(state);
                    break;
                case "metadata":
                    this.logger.info("Executing step: Fetching Metadata");
                    await this.stepFetchMetadata(state);
                    break;
                case "trades":
                    this.logger.info("Executing step: Populating Trades");
                    await this.stepPopulateTrades(state);
                    break;
                case "receipts":
                    this.logger.info("Executing step: Populating Receipts");
                    await this.stepPopulateReceipts(state);
                    break;
                case "linking":
                    this.logger.info("Executing step: Linking Records");
                    await this.stepAutoLink(state);
                    break;
            }
            step.status = "complete";
            this.logger.info(`Step ${step.id} completed successfully.`);
        } catch (error: any) {
            this.logger.error(`Sync Step ${step.id} failed:`, error);
            step.status = "failed";
            step.error = error.message || "Unknown error";
            // We continue to the next step even if this one failed as requested
        }

        state.currentStepIndex++;
        if (state.currentStepIndex >= state.steps.length) {
            state.isActive = false;
        }

        await this.saveSyncState(state);
        return state;
    }

    private async stepIngestLogs(state: SyncState): Promise<void> {
        this.logger.info(`Sync Step 1: Starting log ingestion until ${state.targetTimestamp}`);
        const apiKey = getTornApiKeyFull();
        const lastTimestamp = state.originTimestamp;
        const lastLogId = (await this.systemConfigRegistry.get("last_log_id")) || "";
        const cursor: SyncCursor = { lastTimestamp, lastLogId };

        const itemNames = await TornAPIClient.getItemNames();
        const nameToIdMap: Record<string, number> = {};
        Object.entries(itemNames).forEach(([id, name]) => {
            nameToIdMap[name.toLowerCase()] = parseInt(id, 10);
        });

        const wrapper = new TronWrapper(apiKey);
        const logResult = await wrapper.getNewLogs(cursor, state.targetTimestamp);
        
        this.logger.info(`Fetched ${logResult.parsedLogs.length} logs. Ingesting...`);
        
        let ingestCount = 0;
        const batchSize = 100;
        let logBatch: any[] = [];

        for (const parsed of logResult.parsedLogs) {
            if (parsed.type !== "SET_CONVERT") {
                const logData = await this.prepareParsedLog(parsed, nameToIdMap);
                if (logData) logBatch.push(logData);
            } else {
                // Flush batch before museum exchange to maintain relative order
                if (logBatch.length > 0) {
                    await this.itemLogService.bulkPutLogs(logBatch.map(l => ItemLog.create(l)));
                    logBatch = [];
                }
                await this.ingestSetConvertLog(parsed);
            }

            ingestCount++;
            if (ingestCount % batchSize === 0) {
                if (logBatch.length > 0) {
                    await this.itemLogService.bulkPutLogs(logBatch.map(l => ItemLog.create(l)));
                    logBatch = [];
                }
                state.steps[0].progress = `Ingesting ${ingestCount}/${logResult.parsedLogs.length} logs...`;
                await this.saveSyncState(state);
            }
        }

        // Final flush
        if (logBatch.length > 0) {
            await this.itemLogService.bulkPutLogs(logBatch.map(l => ItemLog.create(l)));
        }

        await this.systemConfigRegistry.set("last_sync_timestamp", logResult.nextCursor.lastTimestamp);
        await this.systemConfigRegistry.set("last_log_id", logResult.nextCursor.lastLogId);
        
        // Recalculate cost basis
        await this.itemLogService.updateCostBasis(lastTimestamp * 1000);
        
        state.steps[0].progress = `Ingested ${logResult.parsedLogs.length} logs.`;
    }

    private async stepFetchMetadata(state: SyncState): Promise<void> {
        const startSec = state.originTimestamp;
        const endSec = state.targetTimestamp;

        this.logger.info(`Sync Step 2: Fetching metadata between ${startSec} and ${endSec}`);

        // 1. Trades (Metadata only)
        const apiKey = getTornApiKeyFull();
        let tradeList: any[] = [];
        let currentFrom = startSec;
        const seenIds = new Set<string>();

        while (true) {
            const queryParams: Record<string, string> = {
                cat: "finished",
                from: String(currentFrom),
                to: String(endSec),
                limit: "100",
                sort: "ASC",
                key: apiKey,
            };
            
            const url = `https://api.torn.com/v2/user/trades?${new URLSearchParams(queryParams).toString()}`;

            await tornRateLimiter.acquire();
            const response = await fetch(url, { cache: "no-store" });
            const data = await response.json().catch(() => ({}));

            if (data?.error?.code === 5 || response.status === 429) {
                this.logger.warn("Torn API rate limit hit in stepFetchMetadata. Pausing 10s...");
                tornRateLimiter.pauseGlobal(10000);
                await new Promise(r => setTimeout(r, 10000));
                continue; // Retry this page
            }

            if (data?.error) {
                if (data.error.code === 17) break;
                throw new Error(data.error.error || "Torn API error during metadata fetch");
            }

            const page = Array.isArray(data?.trades) ? data.trades : [];
            const filtered = page
                .filter((trade: any) => Number(trade.timestamp) >= startSec)
                .filter((trade: any) => {
                    const tradeId = String(trade.id);
                    if (seenIds.has(tradeId)) return false;
                    seenIds.add(tradeId);
                    return true;
                });

            if (!filtered.length) break;

            tradeList = tradeList.concat(filtered);
            const last = filtered[filtered.length - 1];
            currentFrom = Number(last.timestamp) + 1;

            if (page.length < 100) break;
        }

        for (const t of tradeList) {
            await this.tradeService.createPartialTrade(Number(t.id), t.timestamp);
        }

        // 2. Receipts (Metadata only)
        const weav3rApiKey = LocalStorageInterface.getWeav3rAPIKey();
        const weav3rUserId = await MetadataInterface.getUserID();
        let receiptUrl: string | null = `https://weav3r.dev/api/trades/${weav3rUserId}?from=${startSec - 36000}&to=${endSec}&apiKey=${weav3rApiKey}`;
        let receiptCount = 0;

        while (receiptUrl) {
            await weav3rRateLimiter.acquire();
            const response = await fetch(receiptUrl, { cache: "no-store" });

            if (response.status === 429) {
                this.logger.warn("Weav3r API rate limit hit in stepFetchMetadata. Pausing 10s...");
                weav3rRateLimiter.pauseGlobal(10000);
                await new Promise(r => setTimeout(r, 10000));
                continue;
            }

            const data = await response.json();
            if (!data || !data.trades || !Array.isArray(data.trades)) break;

            for (const r of data.trades) {
                await this.receiptService.createPartialReceipt("weav3r", r.id, r.created_at);
                receiptCount++;
            }

            if (data.metadata?.next) {
                const nextUrlObj = new URL(data.metadata.next);
                nextUrlObj.searchParams.set("apiKey", weav3rApiKey);
                receiptUrl = nextUrlObj.toString();
            } else {
                receiptUrl = null;
            }
        }

        state.steps[1].progress = `Found ${tradeList.length} trades, ${receiptCount} receipts.`;
    }

    private async stepPopulateTrades(state: SyncState): Promise<void> {
        const pending = await this.tradeService.getPendingTrades();
        this.logger.info(`Sync Step 3: Populating details for ${pending.length} trades`);
        let count = 0;
        for (const trade of pending) {
            state.steps[2].progress = `Populating ${count}/${pending.length}...`;
            await this.saveSyncState(state);
            
            try {
                await this.tradeService.populateTradeDetails(trade.id!);
                count++;
            } catch (error: any) {
                const isRateLimit = error.message?.includes("Rate limit") || error.message?.includes("429");
                if (isRateLimit) {
                    this.logger.warn("Rate limit hit during trade population. Pausing 10s...");
                    await new Promise(r => setTimeout(r, 10000));
                    throw error;
                }
                this.logger.error(`Trade ${trade.torn_id} population failed:`, error);
            }
        }
        state.steps[2].progress = `Populated ${count}/${pending.length} trades.`;
    }

    private async stepPopulateReceipts(state: SyncState): Promise<void> {
        const pending = await this.receiptService.getPendingReceipts();
        this.logger.info(`Sync Step 4: Populating details for ${pending.length} receipts`);
        let count = 0;
        for (const receipt of pending) {
            state.steps[3].progress = `Populating ${count}/${pending.length}...`;
            await this.saveSyncState(state);

            try {
                await this.receiptService.populateReceiptDetails(receipt.id!);
                count++;
            } catch (error: any) {
                const isRateLimit = error.message?.includes("Rate limit") || error.message?.includes("429");
                if (isRateLimit) {
                    this.logger.warn("Rate limit hit during receipt population. Pausing 10s...");
                    await new Promise(r => setTimeout(r, 10000));
                    throw error;
                }
                this.logger.error(`Receipt ${receipt.receipt_id_string} population failed:`, error);
            }
        }
        state.steps[3].progress = `Populated ${count}/${pending.length} receipts.`;
    }

    private async stepAutoLink(state: SyncState): Promise<void> {
        this.logger.info("Sync Step 5: Automatically linking records");
        const trades = await this.tradeService.getAllTrades();
        const unlinkedTrades = trades.filter(t => t.receipt_id === null && t.sync_status === "complete");
        const receipts = await this.receiptService.getAllReceipts();
        // Maintain a pool of unlinked receipts that can be removed once linked
        const unlinkedReceipts = receipts.filter(r => r.sync_status === "complete");

        const userId = getUserId() || "";
        let linkCount = 0;

        const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

        for (const trade of unlinkedTrades) {
            // Filter receipts to only those within 6 hours of the trade
            const potentialReceipts = unlinkedReceipts.filter(r => 
                Math.abs(r.created_at - trade.timestamp) <= SIX_HOURS_MS
            );

            if (potentialReceipts.length === 0) continue;

            const tradeItems = await this.tradeService.getTradeItems(trade.id!);
            
            // Find the trader (the person we traded with)
            const tradeDetail = tradeItems.find(ti => String(ti.user_id) !== String(userId));
            const traderId = tradeDetail ? tradeDetail.user_id : 0;

            const mockTornTrade = new TornTrade(
                String(trade.torn_id),
                String(trade.torn_id),
                trade.timestamp / 1000,
                "",
                trade.user_id,
                traderId,
                tradeItems.map(ti => ({
                    user_id: ti.user_id,
                    type: ti.type,
                    details: ti.type === "Money" ? { amount: ti.quantity } : { id: ti.item_id, amount: ti.quantity }
                }))
            );

            for (const receipt of potentialReceipts) {
                const receiptItems = await this.receiptService.getReceiptItems(receipt.id!);
                const mockReceipt = new Weav3rReceipt(
                    receipt.receipt_id_string,
                    receipt.receipt_id_string,
                    receipt.total_value,
                    receipt.created_at / 1000,
                    receipt.created_at / 1000,
                    receiptItems.map(ri => ({
                        item_id: ri.item_id,
                        item_name: ri.name,
                        quantity: ri.quantity,
                        price_used: ri.price,
                        total_value: ri.subtotal
                    }))
                );

                if (mockTornTrade.compareAndLinkReceipt(mockReceipt, userId)) {
                    await this.tradeService.linkReceiptToTrade(trade.id!, receipt.id!);
                    linkCount++;

                    // Remove the linked receipt from the unlinked pool to avoid redundant checks
                    const idx = unlinkedReceipts.indexOf(receipt);
                    if (idx !== -1) unlinkedReceipts.splice(idx, 1);

                    break;
                }
            }
        }

        state.steps[4].progress = `Linked ${linkCount} records.`;
    }

    /**
     * Initializes the auto-pilot cursor to a specific timestamp.
     * @param timestampMs (number): The starting timestamp in milliseconds.
     */
    public async initializeAutoPilot(timestampMs: number): Promise<void> {
        this.logger.info(`Initializing auto-pilot cursor at ${new Date(timestampMs).toLocaleString()}`);
        await this.systemConfigRegistry.set("last_sync_timestamp", Math.floor(timestampMs / 1000));
        await this.systemConfigRegistry.set("last_log_id", "");
    }

    private async prepareParsedLog(parsed: ParsedLog, nameToIdMap: Record<string, number>): Promise<any | null> {
        const tornLogId = (parsed as any).tornLogId;
        if (tornLogId) {
            const existing = await this.itemLogService.getLogByTornLogId(tornLogId);
            if (existing) return null;
        }

        if ('item' in parsed) {
            const itemName = parsed.item.toLowerCase();
            const item_id = nameToIdMap[itemName];
            
            if (!item_id) {
                this.logger.warn(`Could not resolve item ID for name: "${parsed.item}"`);
                return null;
            }

            const category: ItemLogCategories = parsed.tag === "Abroad" ? "abroad" : "normal";
            let timestamp = parsed.loggedAt;
            if (!timestamp || !Number.isFinite(timestamp)) {
                const legacyDate = (parsed as any).date;
                timestamp = Number.isFinite(legacyDate) ? legacyDate * 1000 : Date.now();
            }
            
            return {
                timestamp,
                item_id,
                quantity: parsed.type === "BUY" ? parsed.amount : -parsed.amount,
                unit_price: parsed.price,
                category,
                torn_log_id: tornLogId,
            };
        }
        return null;
    }

    private async ingestSetConvertLog(parsed: any): Promise<void> {
        const setMap: Record<string, ItemLogWrapperMuseumSubType> = {
            "plushie": "plushie-set",
            "flower": "exotic-flower-set",
            "artifact": "vairocana-buddha", 
        };
        
        let subType = setMap[parsed.setType];
        
        // Dynamic detection for artifacts if possible
        if (parsed.setType === "artifact" && parsed.item) {
             const itemName = parsed.item.toLowerCase();
             if (itemName.includes("ganesha")) subType = "ganesha-sculpture";
             else if (itemName.includes("shabti")) subType = "shabti-sculpture";
        }

        let timestamp = parsed.loggedAt;
        if (!timestamp || !Number.isFinite(timestamp)) {
            const legacyDate = (parsed as any).date;
            timestamp = Number.isFinite(legacyDate) ? legacyDate * 1000 : Date.now();
        }
        
        if (subType) {
            await this.museumService.exchangeSet(subType, parsed.times, this.itemLogService, timestamp);
        }
    }

    public async getCursor(): Promise<SyncCursor> {
        const lastTimestamp = (await this.systemConfigRegistry.get("last_sync_timestamp")) || 0;
        const lastLogId = (await this.systemConfigRegistry.get("last_log_id")) || "";
        return { lastTimestamp, lastLogId };
    }
}
