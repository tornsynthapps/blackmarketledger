"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ParsedLog, normalizeItemName } from "@/lib/old/parser";
import {
    AnyTrackedTransaction,
    buildTransactionsFromParsedLogs,
    calculateInventoryFromTransactions,
    InventoryItemStats,
    isMugTransaction,
    migrateLegacyTransactions,
} from "@/lib/old/interfaces/transactions";
import { sendToExtension, CostBasisPayload } from "@/lib/old/bmlconnect";
import * as idb from "@/lib/old/idb";
import { setGlobalSyncStatus } from "@/lib/old/syncStatus";
import { loadGoogleDriveData, writeGoogleDriveData } from "@/lib/old/drive-api";
import {
    AutoPilotImportRecord,
    AutoPilotTradeLink,
    PendingAutoPilotTrade,
    SyncCursor,
    TornTradeDetail,
    Weav3rReceipt,
    getTornItems,
    refreshApiRateLimiters,
} from "@/lib/old/torn-api";
import {
    refreshApiKeysFromStorage,
    getApiKey as extGetApiKey,
    getUserId as extGetUserId,
    getDriveApiKey as extGetDriveApiKey,
    getTornApiKeyFull as extGetTornApiKeyFull,
    getTornApiRateLimit as extGetTornApiRateLimit,
    getWeav3rApiRateLimit as extGetWeav3rApiRateLimit,
    setApiKey as extSetApiKey,
    setUserId as extSetUserId,
    setDriveApiKey as extSetDriveApiKey,
    setTornApiKeyFull as extSetTornApiKeyFull,
    setTornApiRateLimit as extSetTornApiRateLimit,
    setWeav3rApiRateLimit as extSetWeav3rApiRateLimit,
} from "@/lib/old/api-keys";
import { DualCursor, createDualCursor } from "@/lib/old/cursor";

const STORAGE_KEY = "torn_invest_tracker_logs";
const CONFIG_KEY = "torn_invest_tracker_config";
const DRIVE_CACHE_READY_KEY = "bml_drive_cache_ready";
const DRIVE_CACHE_SYNCED_AT_KEY = "bml_drive_cache_synced_at";
const DRIVE_BOOTSTRAP_DONE_KEY = "bml_drive_bootstrap_done";
const DRIVE_SYNC_MAX_AGE_MS = 10 * 60 * 1000;
const AUTO_PILOT_DRIVE_FILE = "blackmarket-ledger-autopilot.json";
const TORN_BASIC_USER_URL = "https://api.torn.com/v2/user/?selections=basic&key=";
const JOURNAL_CONFIG_UPDATED_EVENT = "bml:journal-config-updated";
const BML_EXTENSION_REQUEST_EVENT = "BML_EXTENSION_REQUEST";
const BML_EXTENSION_RESPONSE_EVENT = "BML_EXTENSION_RESPONSE";

/**
 * Sends data to userscript directly (no health check).
 * @param data (object): Data to send to userscript
 * @returns Promise<boolean>: True if successful, false otherwise
 */
async function sendToUserscript(data: { inventory?: Record<string, number> }): Promise<boolean> {
    const messageId = crypto.randomUUID();

    return new Promise((resolve) => {
        const timeoutMs = 5000;
        let resolved = false;

        const cleanup = () => {
            window.removeEventListener("message", handler);
            window.clearTimeout(timeoutId);
        };

        const handler = (event: MessageEvent) => {
            if (event.data?.type !== BML_EXTENSION_RESPONSE_EVENT) return;
            if (event.data?.id !== messageId) return;

            const response = event.data.response;
            if (response?.success && response?.data?.saved) {
                resolved = true;
                cleanup();
                resolve(true);
            } else {
                resolved = true;
                cleanup();
                resolve(false);
            }
        };

        const timeoutId = window.setTimeout(() => {
            if (!resolved) {
                cleanup();
                resolve(false);
            }
        }, timeoutMs);

        window.addEventListener("message", handler);

        window.postMessage(
            {
                type: BML_EXTENSION_REQUEST_EVENT,
                id: messageId,
                message: {
                    type: "SAVE_DATA",
                    payload: { data },
                },
            },
            "*"
        );
    });
}

/**
 * Broadcasts cost-basis inventory to listeners (userscript).
 * @param inventory (InventoryItemStats[]): Calculated inventory from transactions
 */
function broadcastCostBasisUpdate(inventory: InventoryItemStats[]) {
    const inventoryMap: Record<string, number> = {};
    inventory.forEach((stats) => {
        if (!stats.itemName) return;
        const totalStock = stats.stock + stats.abroadStock;
        if (totalStock > 0) {
            const avgCost = (stats.totalCost + stats.abroadTotalCost) / totalStock;
            if (avgCost > 0) {
                inventoryMap[stats.itemName.toLowerCase()] = Math.ceil(avgCost);
            }
        }
    });

    window.postMessage(
        {
            type: BML_EXTENSION_REQUEST_EVENT,
            message: {
                type: "COST_BASIS_UPDATE",
                payload: { inventory: inventoryMap } as CostBasisPayload,
            },
        },
        "*"
    );
}

declare global {
    interface Window {
        chrome: any;
    }
}

export interface SyncState {
    isSyncing: boolean;
    message: string;
}

interface JournalConfig {
    skipNegativeStock?: boolean;
    // Legacy single cursor - kept for migration
    autoPilotCursor?: SyncCursor | null;
    // New dual cursor system
    autoPilotTradeCursor?: SyncCursor | null;
    autoPilotItemCursor?: SyncCursor | null;
    autoPilotStartTime?: number | null;
    autoPilotLastSyncAt?: number | null;
    autoPilotTradeCache?: TornTradeDetail[];
    autoPilotReceiptCache?: Weav3rReceipt[];
    autoPilotTradeLinks?: AutoPilotTradeLink[];
    autoPilotTrashedReceiptIds?: string[];
    autoPilotManuallyAddedTradeIds?: string[];
    autoPilotPendingTrades?: PendingAutoPilotTrade[];
    autoPilotPendingTrade?: PendingAutoPilotTrade | null;
    autoPilotRecentImports?: AutoPilotImportRecord[];
}

type AutoPilotDriveState = Pick<
    JournalConfig,
    | "autoPilotCursor"
    | "autoPilotTradeCursor"
    | "autoPilotItemCursor"
    | "autoPilotStartTime"
    | "autoPilotLastSyncAt"
    | "autoPilotTradeCache"
    | "autoPilotReceiptCache"
    | "autoPilotTradeLinks"
    | "autoPilotTrashedReceiptIds"
    | "autoPilotManuallyAddedTradeIds"
    | "autoPilotPendingTrades"
    | "autoPilotRecentImports"
>;

function isLegacyDriveStoredPayload(value: unknown): value is {
    transactions: AnyTrackedTransaction[];
    autoPilotState?: AutoPilotDriveState;
} {
    return (
        Boolean(value) &&
        typeof value === "object" &&
        Array.isArray((value as { transactions: AnyTrackedTransaction[] }).transactions)
    );
}

function isAutoPilotDriveState(value: unknown): value is AutoPilotDriveState {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function resolveTornUserId(apiKey: string) {
    const response = await fetch(`${TORN_BASIC_USER_URL}${encodeURIComponent(apiKey)}`);
    const data = await response.json();

    if (!response.ok || data?.error) {
        const message = data?.error?.error || data?.error || "Failed to validate Torn API key";
        throw new Error(message);
    }

    const rawUserId =
        data?.profile?.id ??
        data?.profile?.player_id ??
        data?.player_id ??
        data?.playerID ??
        data?.user_id ??
        data?.userId;
    const userId =
        typeof rawUserId === "number" || typeof rawUserId === "string" ? String(rawUserId) : "";

    if (!userId) {
        throw new Error("Could not determine Torn user ID from the provided API key.");
    }

    return userId;
}

function isLegacyTransactionRecord(transaction: unknown) {
    return (
        Boolean(transaction) &&
        typeof transaction === "object" &&
        "date" in (transaction as Record<string, unknown>) &&
        "type" in (transaction as Record<string, unknown>)
    );
}

function isLegacyTransactionArray(
    value: unknown
): value is import("@/lib/old/parser").Transaction[] {
    return Array.isArray(value) && value.some((entry) => isLegacyTransactionRecord(entry));
}

export function useJournal() {
    const [transactions, setTransactions] = useState<AnyTrackedTransaction[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [needsMigration, setNeedsMigration] = useState(false);
    const [hasBMLDB, setHasBMLDB] = useState(false);
    const [weav3rApiKey, setWeav3rApiKey] = useState(() => extGetApiKey());
    const [weav3rUserId, setWeav3rUserId] = useState(() => extGetUserId());
    const [driveApiKey, setDriveApiKey] = useState(() => extGetDriveApiKey());
    const [tornApiKeyFull, setTornApiKeyFull] = useState(() => extGetTornApiKeyFull());
    const [tornApiRateLimit, setTornApiRateLimit] = useState(() => extGetTornApiRateLimit());
    const [weav3rApiRateLimit, setWeav3rApiRateLimit] = useState(() => extGetWeav3rApiRateLimit());
    const [skipNegativeStock, setSkipNegativeStock] = useState(false);
    // Legacy cursor - kept for migration
    const [autoPilotCursor, setAutoPilotCursor] = useState<SyncCursor | null>(null);
    // New dual cursor system - only these are needed for Auto-Pilot
    const [autoPilotTradeCursor, setAutoPilotTradeCursor] = useState<SyncCursor | null>(null);
    const [autoPilotItemCursor, setAutoPilotItemCursor] = useState<SyncCursor | null>(null);
    const [autoPilotLastSyncAt, setAutoPilotLastSyncAt] = useState<number | null>(null);
    const [syncState, setSyncState] = useState<SyncState>({
        isSyncing: false,
        message: "",
    });
    const syncCounterRef = useRef(0);
    const transactionsRef = useRef<AnyTrackedTransaction[]>([]);
    const itemIdByNameRef = useRef<Map<string, number>>(new Map());
    const bootstrapStartedRef = useRef(false);

    /**
     * Returns the active DB name based on the current storage preference.
     */
    const getActiveDB = useCallback((): idb.DBName => {
        const pref = localStorage.getItem("bml_storage_pref");
        return pref === "drive" ? "GoogleCacheLogsDB" : "LogsDB";
    }, []);

    const getOtherDB = useCallback((): idb.DBName => {
        const pref = localStorage.getItem("bml_storage_pref");
        return pref === "drive" ? "LogsDB" : "GoogleCacheLogsDB";
    }, []);

    const checkBMLDB = useCallback(async () => {
        const exists = await idb.dbExists("BMLDB");
        setHasBMLDB(exists);
        return exists;
    }, []);

    const getBMLDataCount = useCallback(async () => {
        const txns = await idb.getLegacyTransactions("BMLDB");
        return txns.length;
    }, []);

    const beginSync = useCallback((message: string) => {
        syncCounterRef.current += 1;
        const nextState = { isSyncing: true, message };
        setSyncState(nextState);
        setGlobalSyncStatus(nextState);
    }, []);

    const endSync = useCallback(() => {
        syncCounterRef.current = Math.max(0, syncCounterRef.current - 1);
        if (syncCounterRef.current === 0) {
            const nextState = { isSyncing: false, message: "" };
            setSyncState(nextState);
            setGlobalSyncStatus(nextState);
        }
    }, []);

    const runSyncTask = useCallback(
        async <T>(message: string, task: () => Promise<T>) => {
            beginSync(message);
            try {
                return await task();
            } finally {
                endSync();
            }
        },
        [beginSync, endSync]
    );

    const readCachedTransactions = useCallback(async (dbName: idb.DBName) => {
        try {
            return await idb.getAllTransactions<AnyTrackedTransaction>(dbName);
        } catch (error) {
            console.error(`IndexedDB read failed for ${dbName}`, error);
            return [];
        }
    }, []);

    const persistTransactionsCache = useCallback(
        async (dbName: idb.DBName, newLogs: AnyTrackedTransaction[]) => {
            try {
                await idb.saveTransactions(dbName, newLogs);
            } catch (error) {
                console.error(`IndexedDB write failed for ${dbName}`, error);
            }
        },
        []
    );

    const readConfigCache = useCallback(async () => {
        try {
            return (
                (await idb.get<string>("LogsDB", CONFIG_KEY)) || localStorage.getItem(CONFIG_KEY)
            );
        } catch (error) {
            return localStorage.getItem(CONFIG_KEY);
        }
    }, []);

    const persistConfigCache = useCallback(async (value: string) => {
        try {
            await idb.set("LogsDB", CONFIG_KEY, value);
        } catch (error) {
            console.error("Failed to save config to LogsDB", error);
        }
        localStorage.setItem(CONFIG_KEY, value);
        refreshApiKeysFromStorage();
        window.dispatchEvent(new CustomEvent(JOURNAL_CONFIG_UPDATED_EVENT, { detail: value }));
    }, []);

    const ensureItemDictionary = useCallback(async (apiKey?: string | null) => {
        const key = (apiKey ?? extGetTornApiKeyFull()).trim();
        if (!key) {
            return itemIdByNameRef.current;
        }

        if (itemIdByNameRef.current.size > 0) {
            return itemIdByNameRef.current;
        }

        try {
            const itemsMap = await getTornItems(key);
            const byName = new Map<string, number>();
            itemsMap.forEach((name, id) => {
                byName.set(normalizeItemName(name), id);
            });
            itemIdByNameRef.current = byName;
        } catch (error) {
            console.error("Failed to load Torn item dictionary", error);
        }

        return itemIdByNameRef.current;
    }, []);

    const migrateTransactionsIfNeeded = useCallback(
        async (loaded: AnyTrackedTransaction[]) => {
            if (!isLegacyTransactionArray(loaded)) {
                return { transactions: loaded, migrated: false };
            }

            const itemResolver = await ensureItemDictionary();
            const result = migrateLegacyTransactions(loaded, itemResolver);
            if (result.issues.length > 0) {
                console.warn("Legacy transaction migration issues", result.issues);
            }
            return { transactions: result.transactions, migrated: true };
        },
        [ensureItemDictionary]
    );

    const performBMLMigration = useCallback(
        async (type: "overwrite" | "none") => {
            if (type === "overwrite") {
                const bmlTxns = await idb.getLegacyTransactions("BMLDB");
                if (bmlTxns.length > 0) {
                    const activeDB = getActiveDB();
                    const migrated = await migrateTransactionsIfNeeded(bmlTxns);
                    await idb.saveTransactions(activeDB, migrated.transactions);
                    setTransactions(migrated.transactions);
                }
            }

            await idb.deleteDatabase("BMLDB");
            setHasBMLDB(false);
        },
        [getActiveDB, migrateTransactionsIfNeeded]
    );

    // Migration helper: convert legacy single cursor to dual cursors
    const migrateLegacyCursor = useCallback(
        (
            legacyCursor: SyncCursor | null | undefined
        ): { tradeCursor: SyncCursor | null; itemCursor: SyncCursor | null } => {
            if (!legacyCursor || !legacyCursor.lastTimestamp) {
                return { tradeCursor: null, itemCursor: null };
            }
            // Migrate legacy cursor to both trade and item cursors
            return {
                tradeCursor: { ...legacyCursor },
                itemCursor: { ...legacyCursor },
            };
        },
        []
    );

    const applyConfig = useCallback(
        (parsedConfig: JournalConfig | null) => {
            if (!parsedConfig) return;
            setWeav3rApiKey(extGetApiKey());
            setWeav3rUserId(extGetUserId());
            setDriveApiKey(extGetDriveApiKey());
            setSkipNegativeStock(parsedConfig.skipNegativeStock || false);
            setTornApiKeyFull(extGetTornApiKeyFull());
            setTornApiRateLimit(extGetTornApiRateLimit());
            setWeav3rApiRateLimit(extGetWeav3rApiRateLimit());

            // Handle legacy cursor migration
            if (parsedConfig.autoPilotCursor && !parsedConfig.autoPilotTradeCursor) {
                // Legacy migration: single cursor -> dual cursors
                const migrated = migrateLegacyCursor(parsedConfig.autoPilotCursor);
                setAutoPilotTradeCursor(migrated.tradeCursor);
                setAutoPilotItemCursor(migrated.itemCursor);
            } else {
                // New dual cursor system
                setAutoPilotTradeCursor(parsedConfig.autoPilotTradeCursor || null);
                setAutoPilotItemCursor(parsedConfig.autoPilotItemCursor || null);
            }
            // Keep legacy cursor for backwards compatibility
            setAutoPilotCursor(parsedConfig.autoPilotCursor || null);
            setAutoPilotLastSyncAt(parsedConfig.autoPilotLastSyncAt ?? null);
        },
        [migrateLegacyCursor]
    );

    const buildConfigSnapshot = useCallback(
        (overrides: Partial<JournalConfig> = {}): JournalConfig => ({
            skipNegativeStock,
            autoPilotCursor,
            autoPilotTradeCursor,
            autoPilotItemCursor,
            autoPilotLastSyncAt,
            ...overrides,
        }),
        [
            skipNegativeStock,
            autoPilotCursor,
            autoPilotTradeCursor,
            autoPilotItemCursor,
            autoPilotLastSyncAt,
        ]
    );

    const pickDriveAutoPilotState = useCallback(
        (config: JournalConfig): AutoPilotDriveState => ({
            autoPilotCursor: config.autoPilotCursor ?? null,
            autoPilotTradeCursor: config.autoPilotTradeCursor ?? null,
            autoPilotItemCursor: config.autoPilotItemCursor ?? null,
            autoPilotLastSyncAt: config.autoPilotLastSyncAt ?? null,
        }),
        []
    );

    const persistMergedConfig = useCallback(
        async (overrides: Partial<JournalConfig> = {}) => {
            await persistConfigCache(JSON.stringify(buildConfigSnapshot(overrides)));
        },
        [buildConfigSnapshot, persistConfigCache]
    );

    const markDriveSyncComplete = useCallback(() => {
        localStorage.setItem(DRIVE_CACHE_SYNCED_AT_KEY, new Date().toISOString());
        sessionStorage.setItem(DRIVE_BOOTSTRAP_DONE_KEY, "true");
    }, []);

    const isDriveCacheFresh = useCallback((cachedTransactions: AnyTrackedTransaction[]) => {
        const bootstrapDone = sessionStorage.getItem(DRIVE_BOOTSTRAP_DONE_KEY) === "true";
        const lastSyncedAt = localStorage.getItem(DRIVE_CACHE_SYNCED_AT_KEY);

        if (!bootstrapDone || !lastSyncedAt) {
            return false;
        }

        const syncedAtMs = new Date(lastSyncedAt).getTime();
        if (!Number.isFinite(syncedAtMs)) {
            return false;
        }

        if (Date.now() - syncedAtMs > DRIVE_SYNC_MAX_AGE_MS) {
            return false;
        }

        return cachedTransactions.length > 0;
    }, []);

    const fetchDriveTransactionsByKey = useCallback(
        async (apiKey: string, configSnapshot?: JournalConfig | null) => {
            if (!apiKey) {
                throw new Error("Google Drive sync key is not configured.");
            }

            const ledgerResponse = await loadGoogleDriveData(apiKey);
            let autoPilotResponse: Awaited<ReturnType<typeof loadGoogleDriveData>> | null = null;

            try {
                autoPilotResponse = await loadGoogleDriveData(apiKey, AUTO_PILOT_DRIVE_FILE);
            } catch (error) {
                autoPilotResponse = null;
            }

            if (!ledgerResponse.success) {
                throw new Error("Failed to download Drive data");
            }

            const driveTransactions = isLegacyDriveStoredPayload(ledgerResponse.data)
                ? ledgerResponse.data.transactions
                : Array.isArray(ledgerResponse.data)
                  ? ledgerResponse.data
                  : [];
            const migratedDriveTransactions = await migrateTransactionsIfNeeded(driveTransactions);

            const remoteAutoPilotState =
                autoPilotResponse && isAutoPilotDriveState(autoPilotResponse.data)
                    ? autoPilotResponse.data
                    : isLegacyDriveStoredPayload(ledgerResponse.data) &&
                        ledgerResponse.data.autoPilotState
                      ? ledgerResponse.data.autoPilotState
                      : null;

            // Apply remote auto-pilot state if it exists
            // This ensures dual-cursor syncs properly across devices via Google Drive
            if (remoteAutoPilotState) {
                const updatedConfig = {
                    ...buildConfigSnapshot(),
                    ...remoteAutoPilotState,
                };
                applyConfig(updatedConfig);
                await persistConfigCache(JSON.stringify(updatedConfig));
            }

            await persistTransactionsCache(
                "GoogleCacheLogsDB",
                migratedDriveTransactions.transactions
            );
            if (migratedDriveTransactions.migrated) {
                const response = await writeGoogleDriveData(
                    apiKey,
                    migratedDriveTransactions.transactions
                );
                if (!response.success) {
                    console.error("Failed to write migrated Drive transactions back");
                }
            }
            markDriveSyncComplete();
            return migratedDriveTransactions.transactions;
        },
        [
            applyConfig,
            buildConfigSnapshot,
            markDriveSyncComplete,
            migrateTransactionsIfNeeded,
            persistTransactionsCache,
        ]
    );

    const fetchDriveTransactions = useCallback(async () => {
        return fetchDriveTransactionsByKey(driveApiKey);
    }, [driveApiKey, fetchDriveTransactionsByKey]);

    const refreshDriveCache = useCallback(async () => {
        const driveTransactions = await runSyncTask(
            "Sync in progress: downloading latest data from Google Drive...",
            fetchDriveTransactions
        );
        setTransactions(driveTransactions);
        return driveTransactions;
    }, [fetchDriveTransactions, runSyncTask]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!syncCounterRef.current) return;
            event.preventDefault();
            event.returnValue = "Ledger sync is still running. Leaving now may interrupt the sync.";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") {
            setIsLoaded(true);
            return;
        }
        if (bootstrapStartedRef.current) {
            return;
        }
        bootstrapStartedRef.current = true;

        const init = async () => {
            let loadedTransactions: AnyTrackedTransaction[] = [];
            let parsedConfig: JournalConfig | null = null;
            let backgroundDriveRefresh: Promise<void> | null = null;
            try {
                const cachedConfig = await readConfigCache();
                if (cachedConfig) {
                    try {
                        parsedConfig = JSON.parse(cachedConfig);
                    } catch (e) {
                        console.error("Failed to parse config", e);
                    }
                }

                const storagePref = localStorage.getItem("bml_storage_pref");
                refreshApiKeysFromStorage();

                if (storagePref === "extension") {
                    try {
                        const res = await sendToExtension<AnyTrackedTransaction[]>({
                            type: "EXTENSION_DB_LOAD",
                        });
                        if (res && res.success && Array.isArray(res.data)) {
                            loadedTransactions = res.data;
                        }
                    } catch (e) {
                        console.error("Failed to load from extension", e);
                    }
                } else if (storagePref === "drive") {
                    const cachedTransactions = await readCachedTransactions("GoogleCacheLogsDB");
                    const configuredDriveApiKey = extGetDriveApiKey();
                    if (isDriveCacheFresh(cachedTransactions)) {
                        loadedTransactions = cachedTransactions;
                    } else {
                        loadedTransactions = cachedTransactions;
                        backgroundDriveRefresh = runSyncTask(
                            "Sync in progress: downloading latest data from Google Drive...",
                            () => fetchDriveTransactionsByKey(configuredDriveApiKey, parsedConfig)
                        )
                            .then((fresh: AnyTrackedTransaction[]) => setTransactions(fresh))
                            .catch((e: Error) =>
                                console.error("Background Drive refresh failed", e)
                            );
                    }
                } else {
                    loadedTransactions = await readCachedTransactions("LogsDB");

                    if (
                        loadedTransactions.length === 0 &&
                        localStorage.getItem("bml_db_version") !== "2"
                    ) {
                        const legacyData = localStorage.getItem(STORAGE_KEY);
                        if (legacyData) {
                            try {
                                loadedTransactions = JSON.parse(legacyData);
                                await persistTransactionsCache("LogsDB", loadedTransactions);
                                localStorage.setItem("bml_db_version", "2");
                            } catch (e) {
                                console.error("Legacy migration failed", e);
                            }
                        }
                    }
                }

                const migrationResult = await migrateTransactionsIfNeeded(loadedTransactions);
                loadedTransactions = migrationResult.transactions;
                if (migrationResult.migrated) {
                    const storagePref = localStorage.getItem("bml_storage_pref");
                    const dbName = storagePref === "drive" ? "GoogleCacheLogsDB" : "LogsDB";
                    await persistTransactionsCache(dbName, loadedTransactions);
                    if (storagePref === "extension") {
                        await sendToExtension({
                            type: "EXTENSION_DB_SAVE",
                            payload: { logs: loadedTransactions },
                        }).catch((error: Error) => {
                            console.error("Failed to persist migrated extension data", error);
                        });
                    } else if (storagePref === "drive" && configuredDriveApiKey) {
                        await writeGoogleDriveData(configuredDriveApiKey, loadedTransactions).catch(
                            (error: Error) => {
                                console.error("Failed to persist migrated Drive data", error);
                            }
                        );
                    }
                }

                transactionsRef.current = loadedTransactions;
                setTransactions(loadedTransactions);
                await checkBMLDB();

                applyConfig(parsedConfig);
            } catch (error) {
                console.error("Journal bootstrap failed", error);
            } finally {
                setIsLoaded(true);
                void backgroundDriveRefresh;
            }
        };

        init();
    }, [
        applyConfig,
        fetchDriveTransactionsByKey,
        isDriveCacheFresh,
        migrateTransactionsIfNeeded,
        persistTransactionsCache,
        readCachedTransactions,
        readConfigCache,
        runSyncTask,
    ]);

    useEffect(() => {
        transactionsRef.current = transactions;
    }, [transactions]);

    useEffect(() => {
        const handleConfigUpdated = (event: Event) => {
            const customEvent = event as CustomEvent<string | undefined>;
            const rawConfig = customEvent.detail;
            if (!rawConfig) return;

            try {
                applyConfig(JSON.parse(rawConfig) as JournalConfig);
            } catch (error) {
                console.error("Failed to apply live config update", error);
            }
        };

        window.addEventListener(JOURNAL_CONFIG_UPDATED_EVENT, handleConfigUpdated);
        return () => window.removeEventListener(JOURNAL_CONFIG_UPDATED_EVENT, handleConfigUpdated);
    }, [applyConfig]);

    const saveTransactions = useCallback(
        (newLogs: AnyTrackedTransaction[]) => {
            transactionsRef.current = newLogs;
            setTransactions(newLogs);
            const storagePref = localStorage.getItem("bml_storage_pref");

            if (storagePref === "extension") {
                sendToExtension({
                    type: "EXTENSION_DB_SAVE",
                    payload: { logs: newLogs },
                }).catch((err: Error) => {
                    console.error("Failed to save to extension DB", err);
                });
                persistTransactionsCache("LogsDB", newLogs).catch(console.error);
            } else if (storagePref === "drive") {
                persistTransactionsCache("GoogleCacheLogsDB", newLogs).catch(console.error);

                if (!driveApiKey) return;

                runSyncTask(
                    "Sync in progress: uploading latest data to Google Drive...",
                    async () => {
                        const response = await writeGoogleDriveData(driveApiKey, newLogs);
                        if (!response.success) {
                            throw new Error("Failed to sync to Google Drive");
                        }
                        markDriveSyncComplete();
                    }
                ).catch((err: Error) => console.error("Failed to sync to Google Drive", err));
            } else {
                persistTransactionsCache("LogsDB", newLogs).catch(console.error);
            }

            const inventory = calculateInventoryFromTransactions(newLogs);
            const inventoryMap: Record<string, number> = {};
            inventory.forEach((stats) => {
                if (!stats.itemName) return;
                const totalStock = stats.stock + stats.abroadStock;
                if (totalStock > 0) {
                    const avgCost = (stats.totalCost + stats.abroadTotalCost) / totalStock;
                    if (avgCost > 0) {
                        inventoryMap[stats.itemName.toLowerCase()] = Math.ceil(avgCost);
                    }
                }
            });

            sendToUserscript({ inventory: inventoryMap }).catch((err) => {
                console.warn("Failed to sync to userscript:", err);
            });
        },
        [driveApiKey, markDriveSyncComplete, persistTransactionsCache, runSyncTask]
    );

    const mergeTransactions = useCallback(
        (incoming: AnyTrackedTransaction[]) => {
            setTransactions((prev) => {
                const merged = [...prev];
                const existingIds = new Set(prev.map((t) => t.id));

                incoming.forEach((t) => {
                    if (!existingIds.has(t.id)) {
                        merged.push(t);
                        existingIds.add(t.id);
                    }
                });

                merged.sort((a, b) => a.date - b.date);
                transactionsRef.current = merged;
                saveTransactions(merged);
                return merged;
            });
        },
        [saveTransactions]
    );

    const saveWeaverConfig = useCallback(async (apiKey: string) => {
        const trimmedApiKey = apiKey.trim();

        if (trimmedApiKey) {
            const userId = await resolveTornUserId(trimmedApiKey);
            extSetApiKey(trimmedApiKey);
            extSetUserId(userId);
            setWeav3rApiKey(trimmedApiKey);
            setWeav3rUserId(userId);
            return userId;
        } else {
            extSetApiKey("");
            extSetUserId("");
            setWeav3rApiKey("");
            setWeav3rUserId("");
            return "";
        }
    }, []);

    const saveTornApiKeyFull = useCallback(async (apiKey: string) => {
        const trimmedApiKey = apiKey.trim();
        extSetTornApiKeyFull(trimmedApiKey);
        setTornApiKeyFull(trimmedApiKey);
    }, []);

    const saveDriveApiKey = useCallback(async (apiKey: string) => {
        extSetDriveApiKey(apiKey);
        setDriveApiKey(apiKey);
    }, []);

    const updateSkipNegativeStock = useCallback(
        async (value: boolean) => {
            setSkipNegativeStock(value);
            await persistMergedConfig({ skipNegativeStock: value });
        },
        [persistMergedConfig]
    );

    const updateTornApiRateLimit = useCallback(async (value: number) => {
        const clamped = Math.max(10, Math.min(80, value));
        extSetTornApiRateLimit(clamped);
        setTornApiRateLimit(clamped);
        refreshApiRateLimiters();
    }, []);

    const updateWeav3rApiRateLimit = useCallback(async (value: number) => {
        const clamped = Math.max(10, Math.min(80, value));
        extSetWeav3rApiRateLimit(clamped);
        setWeav3rApiRateLimit(clamped);
        refreshApiRateLimiters();
    }, []);

    const addLogs = useCallback(
        async (
            parsedLogs: ParsedLog[],
            options?: { skipNegativeStock?: boolean; onTrace?: (event: string, data: any) => void }
        ) => {
            const storagePref = localStorage.getItem("bml_storage_pref");
            const baseTransactions =
                storagePref === "drive"
                    ? await runSyncTask("Syncing...", fetchDriveTransactions)
                    : transactionsRef.current;
            const itemResolver = await ensureItemDictionary();
            const nextTransactions = buildTransactionsFromParsedLogs(
                baseTransactions,
                parsedLogs,
                itemResolver,
                options?.onTrace
            );
            saveTransactions(nextTransactions);
        },
        [
            ensureItemDictionary,
            fetchDriveTransactions,
            runSyncTask,
            saveTransactions,
            skipNegativeStock,
        ]
    );

    const saveAutoPilotState = useCallback(
        async (patch: Partial<JournalConfig>) => {
            if (Object.prototype.hasOwnProperty.call(patch, "autoPilotCursor")) {
                setAutoPilotCursor(patch.autoPilotCursor ?? null);
            }
            if (Object.prototype.hasOwnProperty.call(patch, "autoPilotTradeCursor")) {
                setAutoPilotTradeCursor(patch.autoPilotTradeCursor ?? null);
            }
            if (Object.prototype.hasOwnProperty.call(patch, "autoPilotItemCursor")) {
                setAutoPilotItemCursor(patch.autoPilotItemCursor ?? null);
            }
            if (Object.prototype.hasOwnProperty.call(patch, "autoPilotLastSyncAt")) {
                setAutoPilotLastSyncAt(patch.autoPilotLastSyncAt ?? null);
            }
            await persistMergedConfig(patch);
            const storagePref = localStorage.getItem("bml_storage_pref");
            if (storagePref === "drive" && driveApiKey) {
                await runSyncTask(
                    "Sync in progress: uploading Auto-Pilot state to Google Drive...",
                    async () => {
                        const response = await writeGoogleDriveData(
                            driveApiKey,
                            pickDriveAutoPilotState(buildConfigSnapshot(patch)),
                            AUTO_PILOT_DRIVE_FILE
                        );
                        if (!response.success) {
                            throw new Error("Failed to sync Auto-Pilot state to Google Drive");
                        }
                        markDriveSyncComplete();
                    }
                );
            }
        },
        [
            buildConfigSnapshot,
            driveApiKey,
            markDriveSyncComplete,
            persistMergedConfig,
            pickDriveAutoPilotState,
            runSyncTask,
        ]
    );

    const clearLogs = useCallback(() => {
        localStorage.removeItem(DRIVE_CACHE_READY_KEY);
        localStorage.removeItem(DRIVE_CACHE_SYNCED_AT_KEY);
        saveTransactions([]);
    }, [saveTransactions]);

    const deleteLog = useCallback(
        (id: string) => {
            saveTransactions(transactions.filter((t) => t.id !== id));
        },
        [saveTransactions, transactions]
    );

    /**
     * Delete multiple transactions by their IDs in a single operation.
     * @param ids (string[]): Array of transaction IDs to delete
     */
    const deleteLogs = useCallback(
        (ids: string[]) => {
            const idSet = new Set(ids);
            saveTransactions(transactions.filter((t) => !idSet.has(t.id)));
        },
        [saveTransactions, transactions]
    );

    const restoreData = useCallback(
        async (data: AnyTrackedTransaction[], merge: boolean = false) => {
            const migrated = await migrateTransactionsIfNeeded(data);
            if (merge) {
                saveTransactions([...transactions, ...migrated.transactions]);
            } else {
                saveTransactions(migrated.transactions);
            }
        },
        [migrateTransactionsIfNeeded, saveTransactions, transactions]
    );

    const editLog = useCallback(
        (id: string, updates: Partial<AnyTrackedTransaction>) => {
            saveTransactions(
                transactions.map((t) =>
                    t.id === id ? ({ ...t, ...updates } as AnyTrackedTransaction) : t
                )
            );
        },
        [saveTransactions, transactions]
    );

    const renameItem = useCallback(
        (oldName: string, newName: string) => {
            if (!newName.trim()) return;
            const normalizedNewName = newName.trim();
            saveTransactions(
                transactions.map((t) => {
                    if ("itemName" in t && t.itemName === oldName) {
                        return { ...t, itemName: normalizedNewName } as AnyTrackedTransaction;
                    }
                    return t;
                })
            );
        },
        [saveTransactions, transactions]
    );

    const switchStorageLocation = useCallback(
        async (newLocation: "browser" | "drive", migrationType: "merge" | "overwrite" | "none") => {
            const sourceDB = newLocation === "drive" ? "LogsDB" : "GoogleCacheLogsDB";
            const targetDB = newLocation === "drive" ? "GoogleCacheLogsDB" : "LogsDB";

            let targetData: AnyTrackedTransaction[] = [];

            if (migrationType !== "none") {
                const sourceData = await readCachedTransactions(sourceDB);
                if (migrationType === "overwrite") {
                    targetData = sourceData;
                } else if (migrationType === "merge") {
                    const existingTarget = await readCachedTransactions(targetDB);
                    const ids = new Set(existingTarget.map((t) => t.id));
                    targetData = [...existingTarget];
                    sourceData.forEach((t) => {
                        if (!ids.has(t.id)) {
                            targetData.push(t);
                            ids.add(t.id);
                        }
                    });
                    targetData.sort((a, b) => {
                        const left = "date" in a ? a.date : a.timestamp;
                        const right = "date" in b ? b.date : b.timestamp;
                        return left - right;
                    });
                }

                await persistTransactionsCache(targetDB, targetData);
                if (newLocation === "drive" && driveApiKey) {
                    await runSyncTask("Uploading migrated data...", async () => {
                        await writeGoogleDriveData(driveApiKey, targetData);
                        markDriveSyncComplete();
                    });
                }
            } else {
                targetData = await readCachedTransactions(targetDB);
            }

            localStorage.setItem("bml_storage_pref", newLocation);
            setTransactions(targetData);
        },
        [
            driveApiKey,
            markDriveSyncComplete,
            persistTransactionsCache,
            readCachedTransactions,
            runSyncTask,
        ]
    );

    const inventory = calculateInventoryFromTransactions(transactions);
    let totalMugLoss = 0;
    transactions.forEach((transaction) => {
        if (isMugTransaction(transaction)) {
            totalMugLoss += transaction.amount;
            return;
        }

        if ("type" in transaction && transaction.type === "MUG") {
            totalMugLoss += transaction.amount;
        }
    });
    let totalItemRealizedProfit = 0;
    let totalInventoryValue = 0;
    let totalAbroadRealizedProfit = 0;
    let totalAbroadInventoryValue = 0;
    let totalConsumptionRealizedProfit = 0;
    inventory.forEach((stats) => {
        totalItemRealizedProfit += stats.realizedProfit;
        totalInventoryValue += Math.max(0, stats.totalCost);
        totalAbroadRealizedProfit += stats.abroadRealizedProfit;
        totalAbroadInventoryValue += Math.max(0, stats.abroadTotalCost);
        totalConsumptionRealizedProfit += stats.consumptionRealizedProfit ?? 0;
    });

    return {
        isLoaded,
        transactions,
        addLogs,
        clearLogs,
        deleteLog,
        deleteLogs,
        restoreData,
        editLog,
        renameItem,
        inventory,
        calculateInventory: calculateInventoryFromTransactions,
        totalMugLoss,
        totalItemRealizedProfit,
        totalInventoryValue,
        totalConsumptionRealizedProfit,
        netTotalProfit:
            totalItemRealizedProfit +
            totalAbroadRealizedProfit +
            totalConsumptionRealizedProfit -
            totalMugLoss,
        weav3rApiKey,
        weav3rUserId,
        driveApiKey,
        tornApiKeyFull,
        tornApiRateLimit,
        weav3rApiRateLimit,
        skipNegativeStock,
        updateSkipNegativeStock,
        updateTornApiRateLimit,
        updateWeav3rApiRateLimit,
        saveWeaverConfig,
        saveTornApiKeyFull,
        saveDriveApiKey,
        autoPilotCursor,
        autoPilotTradeCursor,
        autoPilotItemCursor,
        autoPilotLastSyncAt,
        saveAutoPilotState,
        needsMigration,
        hasBMLDB,
        getBMLDataCount,
        performBMLMigration,
        performMigration: () => window.location.reload(),
        mergeTransactions,
        refreshDriveCache,
        syncState,
        switchStorageLocation,
        readCachedTransactions,
        driveCacheSyncedAt:
            typeof window !== "undefined" ? localStorage.getItem(DRIVE_CACHE_SYNCED_AT_KEY) : null,
        saveTransactions,
    };
}
