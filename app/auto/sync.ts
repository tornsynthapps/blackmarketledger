import {
    SyncCursor,
    buildImportRecord,
    createParsedLogsFromNewReceipt,
    NormalizedLog,
    AutoPilotImportRecord,
} from "@/lib/old/torn-api";
import { TronWrapper } from "@/lib/old/torn-wrapper";
import { TornTrade, Weav3rReceipt } from "@/lib/old/game/trade";
import { T3BAPI, TornAPI } from "@/lib/old/game/api";
import { DBInterface } from "@/lib/old/interfaces/db";
import { getImportSourceType } from "./getImportSourceType";
import { runMuseumPricelistSyncCheck } from "@/lib/museum-sync";

interface SyncLogsParams {
    wrapper: TronWrapper;
    itemCursor: SyncCursor;
    tradeCursor: SyncCursor;
    batchRecords: AutoPilotImportRecord[];
    onTrace: (event: string, data: any) => Promise<void>;
    addLogs: (logs: NormalizedLog[], options: any) => Promise<void>;
    saveAutoPilotState: (state: any) => Promise<void>;
    setStatusMessage: (message: string) => void;
}

interface SyncLogsResult {
    nextItemCursor: SyncCursor;
    newItemCursor: SyncCursor;
    itemParsedLogs: NormalizedLog[];
    itemLogs: any[];
}

export async function syncLogs(params: SyncLogsParams): Promise<SyncLogsResult> {
    const {
        wrapper,
        itemCursor,
        tradeCursor,
        batchRecords,
        onTrace,
        addLogs,
        saveAutoPilotState,
        setStatusMessage,
    } = params;

    setStatusMessage(
        `Fetching item logs up to trade cursor (${new Date(tradeCursor.lastTimestamp * 1000).toLocaleString()})...`
    );

    await onTrace("item_sync_start", {
        itemCursor,
        tradeCursor,
        targetTimestamp: tradeCursor.lastTimestamp,
    });

    const itemResult = await wrapper.getNewLogs(
        {
            lastTimestamp: itemCursor.lastTimestamp,
            lastLogId: itemCursor.lastLogId,
        },
        tradeCursor.lastTimestamp
    );

    const { logs: itemLogs, parsedLogs: itemParsedLogs, nextCursor: newItemCursor } = itemResult;

    const sortedItemLogs = [...itemLogs].sort((a, b) => a.timestamp - b.timestamp);
    const sortedItemParsedLogs = [...itemParsedLogs].sort((a, b) => a.timestamp - b.timestamp);

    await onTrace("item_fetch_result", {
        itemCount: itemLogs.length,
        parsedCount: itemParsedLogs.length,
        newItemCursor,
        sorted: true,
    });

    for (const log of sortedItemLogs) {
        await onTrace("log_detail", log);
        batchRecords.push(
            buildImportRecord({
                id: `log:${log.id}`,
                timestamp: log.timestamp,
                title: log.title || log.category || "Torn log",
                status: "imported",
                sourceType: getImportSourceType(log),
                tornLogId: String(log.id),
            })
        );
    }

    for (const parsedLog of sortedItemParsedLogs) {
        await onTrace("item_added", {
            import_type: "item_log",
            ...parsedLog,
        });
    }

    if (sortedItemParsedLogs.length) {
        setStatusMessage(`Importing ${sortedItemParsedLogs.length} item logs into your ledger...`);
        await addLogs(sortedItemParsedLogs, { skipNegativeStock: false, onTrace });
        runMuseumPricelistSyncCheck();
        await onTrace("item_import_result", {
            count: sortedItemParsedLogs.length,
            success: true,
        });
    } else {
        await onTrace("item_import_result", {
            count: 0,
            success: true,
        });
    }

    const nextItemCursor = newItemCursor;

    await saveAutoPilotState({
        autoPilotCursor: nextItemCursor,
        autoPilotTradeCursor: nextItemCursor,
        autoPilotItemCursor: nextItemCursor,
        autoPilotLastSyncAt: Date.now(),
    });

    setStatusMessage("Item sync completed.");
    await onTrace("item_sync_complete", {
        nextItemCursor,
        nextTradeCursor: nextItemCursor,
    });

    return {
        nextItemCursor,
        newItemCursor,
        itemParsedLogs,
        itemLogs,
    };
}

interface SyncTradesParams {
    wrapper: TronWrapper;
    tradeCursor: SyncCursor;
    itemCursor: SyncCursor;
    weav3rUserId: string;
    batchRecords: AutoPilotImportRecord[];
    onTrace: (event: string, data: any) => Promise<void>;
    addLogs: (logs: NormalizedLog[], options: any) => Promise<void>;
    setStatusMessage: (message: string) => void;
    setTrades: React.Dispatch<React.SetStateAction<TornTrade[]>>;
    setReceipts: React.Dispatch<React.SetStateAction<Weav3rReceipt[]>>;
    saveAutoPilotState: (state: any) => Promise<void>;
}

interface SyncTradesResult {
    newtornTrades: TornTrade[];
    neweav3rReceipts: Weav3rReceipt[];
    newAllNewParsedLogs: NormalizedLog[];
    newUnlinkedTrades: TornTrade[];
    newUnlinkedReceipts: Weav3rReceipt[];
    nextTradeCursor: SyncCursor;
    toTimestamp: number;
}

export async function syncTrades(params: SyncTradesParams): Promise<SyncTradesResult> {
    const {
        wrapper,
        tradeCursor,
        itemCursor,
        weav3rUserId,
        batchRecords,
        onTrace,
        addLogs,
        setStatusMessage,
        setTrades,
        setReceipts,
        saveAutoPilotState,
    } = params;

    const tradeStart = tradeCursor.lastTimestamp;
    const now = Math.floor(Date.now() / 1000);
    const toTimestamp = now - 1;

    setStatusMessage(`${"Fetching completed trades..."}`);

    await onTrace("trade_fetch_request", {
        startTimestamp: tradeStart,
        toTimestamp,
    });

    const newtornTrades: TornTrade[] = await TornAPI.getTornTrades(tradeStart, toTimestamp);

    await onTrace("trade_fetch_result", {
        count: newtornTrades.length,
        tradeIds: newtornTrades.map((t) => t.id),
    });

    for (const trade of newtornTrades) {
        await onTrace("trade_detail", trade.toInterface());
    }

    setStatusMessage(`${"Fetching receipts..."}`);

    await onTrace("receipt_fetch_request", {
        startTimestamp: tradeStart - 10 * 60 * 60,
        toTimestamp,
    });

    const neweav3rReceipts: Weav3rReceipt[] = await T3BAPI.getReceipts(
        tradeStart - 10 * 60 * 60,
        toTimestamp
    );

    await onTrace("receipt_fetch_result", {
        count: neweav3rReceipts.length,
        receiptIds: neweav3rReceipts.map((r) => r.id),
    });

    for (const receipt of neweav3rReceipts) {
        await onTrace("receipt_detail", receipt.toInterface());
    }

    const newAllNewParsedLogs: NormalizedLog[] = [];
    const linkedTrades: any[] = [];

    setStatusMessage(`${"Linking trades..."}`);

    await onTrace("linking_start", {
        tradesCount: newtornTrades.length,
        receiptsCount: neweav3rReceipts.length,
    });

    for (const trade of newtornTrades) {
        for (const receipt of neweav3rReceipts) {
            if (trade.compareAndLinkReceipt(receipt, weav3rUserId, onTrace)) {
                const parsedLogs = createParsedLogsFromNewReceipt(trade, receipt, weav3rUserId);

                for (const parsedLog of parsedLogs) {
                    await onTrace("item_added", {
                        import_type: "trade_linked",
                        tradeId: trade.id,
                        receiptId: receipt.id,
                        ...parsedLog,
                    });
                }

                newAllNewParsedLogs.push(...parsedLogs);
                linkedTrades.push({
                    tradeId: trade.id,
                    receiptId: receipt.id,
                    logCount: parsedLogs.length,
                    tradeDetails: trade.toInterface(),
                    receiptDetails: receipt.toInterface(),
                });
                break;
            }
        }
    }

    await onTrace("linking_result", {
        linkedCount: linkedTrades.length,
        linkedTrades,
    });

    DBInterface.migrationAddTrades(newtornTrades);
    DBInterface.migrationAddReceipts(neweav3rReceipts);

    const newUnlinkedTrades = newtornTrades.filter((trade) => !trade.isLinked());
    const newUnlinkedReceipts = neweav3rReceipts.filter((receipt) => !receipt.linkedTradeId);

    await onTrace("unlinked_summary", {
        unlinkedTradesCount: newUnlinkedTrades.length,
        unlinkedTradesIds: newUnlinkedTrades.map((t) => t.id),
        unlinkedReceiptsCount: newUnlinkedReceipts.length,
        unlinkedReceiptsIds: newUnlinkedReceipts.map((r) => r.id),
    });

    setStatusMessage(
        `Found ${newUnlinkedTrades.length} unlinked trades and ${newUnlinkedReceipts.length} unlinked receipts.`
    );
    setStatusMessage(`Found ${newAllNewParsedLogs.length} logs.`);

    if (newAllNewParsedLogs.length) {
        setStatusMessage(
            `Importing ${newAllNewParsedLogs.length} linked trades into your ledger...`
        );
        await addLogs(newAllNewParsedLogs, { skipNegativeStock: false, onTrace });
        runMuseumPricelistSyncCheck();
        await onTrace("trade_import_result", {
            count: newAllNewParsedLogs.length,
            success: true,
        });
    } else {
        await onTrace("trade_import_result", {
            count: 0,
            success: true,
        });
    }

    setTrades(DBInterface.migrationGetTrades());
    setReceipts(DBInterface.migrationGetReceipts());

    const nextTradeCursor = { lastTimestamp: toTimestamp, lastLogId: "" };

    if (nextTradeCursor) {
        await saveAutoPilotState({
            autoPilotCursor: nextTradeCursor,
            autoPilotTradeCursor: nextTradeCursor,
            autoPilotItemCursor: itemCursor,
            autoPilotLastSyncAt: Date.now(),
        });
    }

    return {
        newtornTrades,
        neweav3rReceipts,
        newAllNewParsedLogs,
        newUnlinkedTrades,
        newUnlinkedReceipts,
        nextTradeCursor,
        toTimestamp,
    };
}
