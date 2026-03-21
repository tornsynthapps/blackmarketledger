"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Transaction, ParsedLog, FLOWER_SET, PLUSHIE_SET } from '@/lib/parser';
import { calculateInventory, buildTransactionsWithLogs } from '@/lib/transactionBuilder';
import { sendToExtension } from '@/lib/bmlconnect';
import * as idb from '@/lib/idb';
import { setGlobalSyncStatus } from '@/lib/syncStatus';
import { loadGoogleDriveData, writeGoogleDriveData } from '@/lib/drive-api';
import { AutoPilotImportRecord, AutoPilotTradeLink, PendingAutoPilotTrade, SyncCursor, TornTradeDetail, Weav3rReceipt } from '@/lib/torn-api';
import { DualCursor, createDualCursor } from '@/lib/cursor';

const STORAGE_KEY = 'torn_invest_tracker_logs';
const CONFIG_KEY = 'torn_invest_tracker_config';
const DRIVE_CACHE_READY_KEY = 'bml_drive_cache_ready';
const DRIVE_CACHE_SYNCED_AT_KEY = 'bml_drive_cache_synced_at';
const DRIVE_BOOTSTRAP_DONE_KEY = 'bml_drive_bootstrap_done';
const DRIVE_SYNC_MAX_AGE_MS = 10 * 60 * 1000;
const AUTO_PILOT_DRIVE_FILE = "blackmarket-ledger-autopilot.json";
const TORN_BASIC_USER_URL = "https://api.torn.com/v2/user/?selections=basic&key=";
const JOURNAL_CONFIG_UPDATED_EVENT = "bml:journal-config-updated";

declare global {
    interface Window {
        chrome: any;
    }
}

export interface InventoryItemStats {
    stock: number;
    totalCost: number;
    realizedProfit: number;
    abroadStock: number;
    abroadTotalCost: number;
    abroadRealizedProfit: number;
}

export interface SyncState {
    isSyncing: boolean;
    message: string;
}

interface JournalConfig {
    apiKey?: string;
    userId?: string;
    driveApiKey?: string;
    skipNegativeStock?: boolean;
    tornApiKeyFull?: string;
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

type AutoPilotDriveState = Pick<JournalConfig,
    "autoPilotCursor" |
    "autoPilotTradeCursor" |
    "autoPilotItemCursor" |
    "autoPilotStartTime" |
    "autoPilotLastSyncAt" |
    "autoPilotTradeCache" |
    "autoPilotReceiptCache" |
    "autoPilotTradeLinks" |
    "autoPilotTrashedReceiptIds" |
    "autoPilotManuallyAddedTradeIds" |
    "autoPilotPendingTrades" |
    "autoPilotRecentImports"
>;

function isLegacyDriveStoredPayload(value: unknown): value is { transactions: Transaction[]; autoPilotState?: AutoPilotDriveState } {
    return Boolean(value) && typeof value === "object" && Array.isArray((value as { transactions: Transaction[] }).transactions);
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
    const userId = typeof rawUserId === "number" || typeof rawUserId === "string"
        ? String(rawUserId)
        : "";

    if (!userId) {
        throw new Error("Could not determine Torn user ID from the provided API key.");
    }

    return userId;
}

export function useJournal() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [needsMigration, setNeedsMigration] = useState(false);
    const [hasBMLDB, setHasBMLDB] = useState(false);
    const [weav3rApiKey, setWeav3rApiKey] = useState("");
    const [weav3rUserId, setWeav3rUserId] = useState("");
    const [driveApiKey, setDriveApiKey] = useState("");
    const [tornApiKeyFull, setTornApiKeyFull] = useState("");
    const [skipNegativeStock, setSkipNegativeStock] = useState(false);
    // Legacy cursor - kept for migration
    const [autoPilotCursor, setAutoPilotCursor] = useState<SyncCursor | null>(null);
    // New dual cursor system
    const [autoPilotTradeCursor, setAutoPilotTradeCursor] = useState<SyncCursor | null>(null);
    const [autoPilotItemCursor, setAutoPilotItemCursor] = useState<SyncCursor | null>(null);
    const [autoPilotStartTime, setAutoPilotStartTime] = useState<number | null>(null);
    const [autoPilotLastSyncAt, setAutoPilotLastSyncAt] = useState<number | null>(null);
    const [autoPilotTradeCache, setAutoPilotTradeCache] = useState<TornTradeDetail[]>([]);
    const [autoPilotReceiptCache, setAutoPilotReceiptCache] = useState<Weav3rReceipt[]>([]);
    const [autoPilotTradeLinks, setAutoPilotTradeLinks] = useState<AutoPilotTradeLink[]>([]);
    const [autoPilotTrashedReceiptIds, setAutoPilotTrashedReceiptIds] = useState<string[]>([]);
    const [autoPilotManuallyAddedTradeIds, setAutoPilotManuallyAddedTradeIds] = useState<string[]>([]);
    const [autoPilotPendingTrades, setAutoPilotPendingTrades] = useState<PendingAutoPilotTrade[]>([]);
    const [autoPilotRecentImports, setAutoPilotRecentImports] = useState<AutoPilotImportRecord[]>([]);
    const [syncState, setSyncState] = useState<SyncState>({ isSyncing: false, message: "" });
    const syncCounterRef = useRef(0);
    const transactionsRef = useRef<Transaction[]>([]);
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

    const performBMLMigration = useCallback(async (type: 'overwrite' | 'none') => {
        if (type === 'overwrite') {
            const bmlTxns = await idb.getLegacyTransactions("BMLDB");
            if (bmlTxns.length > 0) {
                const activeDB = getActiveDB();
                await idb.saveTransactions(activeDB, bmlTxns);
                setTransactions(bmlTxns);
            }
        }
        
        await idb.deleteDatabase("BMLDB");
        setHasBMLDB(false);
    }, [getActiveDB]);

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

    const runSyncTask = useCallback(async <T,>(message: string, task: () => Promise<T>) => {
        beginSync(message);
        try {
            return await task();
        } finally {
            endSync();
        }
    }, [beginSync, endSync]);

    const readCachedTransactions = useCallback(async (dbName: idb.DBName) => {
        try {
            return await idb.getAllTransactions<Transaction>(dbName);
        } catch (error) {
            console.error(`IndexedDB read failed for ${dbName}`, error);
            return [];
        }
    }, []);

    const persistTransactionsCache = useCallback(async (dbName: idb.DBName, newLogs: Transaction[]) => {
        try {
            await idb.saveTransactions(dbName, newLogs);
        } catch (error) {
            console.error(`IndexedDB write failed for ${dbName}`, error);
        }
    }, []);

    const readConfigCache = useCallback(async () => {
        try {
            return (await idb.get<string>("LogsDB", CONFIG_KEY)) || localStorage.getItem(CONFIG_KEY);
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
        window.dispatchEvent(new CustomEvent(JOURNAL_CONFIG_UPDATED_EVENT, { detail: value }));
    }, []);

    // Migration helper: convert legacy single cursor to dual cursors
    const migrateLegacyCursor = useCallback((legacyCursor: SyncCursor | null | undefined): { tradeCursor: SyncCursor | null; itemCursor: SyncCursor | null } => {
        if (!legacyCursor || !legacyCursor.lastTimestamp) {
            return { tradeCursor: null, itemCursor: null };
        }
        // Migrate legacy cursor to both trade and item cursors
        return {
            tradeCursor: { ...legacyCursor },
            itemCursor: { ...legacyCursor },
        };
    }, []);

    const applyConfig = useCallback((parsedConfig: JournalConfig | null) => {
        if (!parsedConfig) return;
        setWeav3rApiKey(parsedConfig.apiKey || "");
        setWeav3rUserId(parsedConfig.userId || "");
        setDriveApiKey(parsedConfig.driveApiKey || "");
        setSkipNegativeStock(parsedConfig.skipNegativeStock || false);
        setTornApiKeyFull(parsedConfig.tornApiKeyFull || "");
        
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
        setAutoPilotStartTime(parsedConfig.autoPilotStartTime ?? null);
        setAutoPilotLastSyncAt(parsedConfig.autoPilotLastSyncAt ?? null);
        setAutoPilotTradeCache(Array.isArray(parsedConfig.autoPilotTradeCache) ? parsedConfig.autoPilotTradeCache : []);
        setAutoPilotReceiptCache(Array.isArray(parsedConfig.autoPilotReceiptCache) ? parsedConfig.autoPilotReceiptCache : []);
        setAutoPilotTradeLinks(Array.isArray(parsedConfig.autoPilotTradeLinks) ? parsedConfig.autoPilotTradeLinks : []);
        setAutoPilotTrashedReceiptIds(Array.isArray(parsedConfig.autoPilotTrashedReceiptIds) ? parsedConfig.autoPilotTrashedReceiptIds : []);
        setAutoPilotManuallyAddedTradeIds(Array.isArray(parsedConfig.autoPilotManuallyAddedTradeIds) ? parsedConfig.autoPilotManuallyAddedTradeIds : []);
        setAutoPilotPendingTrades(
            Array.isArray(parsedConfig.autoPilotPendingTrades)
                ? parsedConfig.autoPilotPendingTrades
                : parsedConfig.autoPilotPendingTrade
                    ? [parsedConfig.autoPilotPendingTrade]
                    : []
        );
        setAutoPilotRecentImports(Array.isArray(parsedConfig.autoPilotRecentImports) ? parsedConfig.autoPilotRecentImports : []);
    }, [migrateLegacyCursor]);

    const buildConfigSnapshot = useCallback((overrides: Partial<JournalConfig> = {}): JournalConfig => ({
        apiKey: weav3rApiKey,
        userId: weav3rUserId,
        driveApiKey,
        skipNegativeStock,
        tornApiKeyFull,
        autoPilotCursor,
        autoPilotTradeCursor,
        autoPilotItemCursor,
        autoPilotStartTime,
        autoPilotLastSyncAt,
        autoPilotTradeCache,
        autoPilotReceiptCache,
        autoPilotTradeLinks,
        autoPilotTrashedReceiptIds,
        autoPilotManuallyAddedTradeIds,
        autoPilotPendingTrades,
        autoPilotRecentImports,
        ...overrides
    }), [
        weav3rApiKey,
        weav3rUserId,
        driveApiKey,
        skipNegativeStock,
        tornApiKeyFull,
        autoPilotCursor,
        autoPilotTradeCursor,
        autoPilotItemCursor,
        autoPilotStartTime,
        autoPilotLastSyncAt,
        autoPilotTradeCache,
        autoPilotReceiptCache,
        autoPilotTradeLinks,
        autoPilotTrashedReceiptIds,
        autoPilotManuallyAddedTradeIds,
        autoPilotPendingTrades,
        autoPilotRecentImports
    ]);

    const pickDriveAutoPilotState = useCallback((config: JournalConfig): AutoPilotDriveState => ({
        autoPilotCursor: config.autoPilotCursor ?? null,
        autoPilotTradeCursor: config.autoPilotTradeCursor ?? null,
        autoPilotItemCursor: config.autoPilotItemCursor ?? null,
        autoPilotStartTime: config.autoPilotStartTime ?? null,
        autoPilotLastSyncAt: config.autoPilotLastSyncAt ?? null,
        autoPilotTradeCache: config.autoPilotTradeCache ?? [],
        autoPilotReceiptCache: config.autoPilotReceiptCache ?? [],
        autoPilotTradeLinks: config.autoPilotTradeLinks ?? [],
        autoPilotTrashedReceiptIds: config.autoPilotTrashedReceiptIds ?? [],
        autoPilotManuallyAddedTradeIds: config.autoPilotManuallyAddedTradeIds ?? [],
        autoPilotPendingTrades: config.autoPilotPendingTrades ?? [],
        autoPilotRecentImports: config.autoPilotRecentImports ?? [],
    }), []);

    const persistMergedConfig = useCallback(async (overrides: Partial<JournalConfig> = {}) => {
        await persistConfigCache(JSON.stringify(buildConfigSnapshot(overrides)));
    }, [buildConfigSnapshot, persistConfigCache]);

    const markDriveSyncComplete = useCallback(() => {
        localStorage.setItem(DRIVE_CACHE_SYNCED_AT_KEY, new Date().toISOString());
        sessionStorage.setItem(DRIVE_BOOTSTRAP_DONE_KEY, "true");
    }, []);

    const isDriveCacheFresh = useCallback((cachedTransactions: Transaction[]) => {
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

    const fetchDriveTransactionsByKey = useCallback(async (apiKey: string, configSnapshot?: JournalConfig | null) => {
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

        const remoteAutoPilotState =
            autoPilotResponse && isAutoPilotDriveState(autoPilotResponse.data)
                ? autoPilotResponse.data
                : isLegacyDriveStoredPayload(ledgerResponse.data) && ledgerResponse.data.autoPilotState
                    ? ledgerResponse.data.autoPilotState
                    : null;

        if (remoteAutoPilotState) {
            applyConfig({
                ...(configSnapshot || buildConfigSnapshot()),
                ...remoteAutoPilotState,
            });
        }

        await persistTransactionsCache("GoogleCacheLogsDB", driveTransactions);
        markDriveSyncComplete();
        return driveTransactions;
    }, [applyConfig, buildConfigSnapshot, markDriveSyncComplete, persistTransactionsCache]);

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
        if (bootstrapStartedRef.current) {
            return;
        }
        bootstrapStartedRef.current = true;

        const init = async () => {
            let loadedTransactions: Transaction[] = [];
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

                if (storagePref === 'extension') {
                    try {
                        const res = await sendToExtension<Transaction[]>({ type: "EXTENSION_DB_LOAD" });
                        if (res && res.success && Array.isArray(res.data)) {
                            loadedTransactions = res.data;
                        }
                    } catch (e) {
                        console.error("Failed to load from extension", e);
                    }
                } else if (storagePref === 'drive') {
                    const cachedTransactions = await readCachedTransactions("GoogleCacheLogsDB");
                    const configuredDriveApiKey = parsedConfig?.driveApiKey || "";
                    if (isDriveCacheFresh(cachedTransactions)) {
                        loadedTransactions = cachedTransactions;
                    } else {
                        loadedTransactions = cachedTransactions;
                        backgroundDriveRefresh = runSyncTask(
                            "Sync in progress: downloading latest data from Google Drive...",
                            () => fetchDriveTransactionsByKey(configuredDriveApiKey, parsedConfig)
                        )
                            .then((fresh: Transaction[]) => setTransactions(fresh))
                            .catch((e: Error) => console.error("Background Drive refresh failed", e));
                    }
                } else {
                    loadedTransactions = await readCachedTransactions("LogsDB");

                    if (loadedTransactions.length === 0 && localStorage.getItem("bml_db_version") !== "2") {
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
    }, [applyConfig, fetchDriveTransactionsByKey, isDriveCacheFresh, persistTransactionsCache, readCachedTransactions, readConfigCache, runSyncTask]);

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

    const saveTransactions = useCallback((newLogs: Transaction[]) => {
        transactionsRef.current = newLogs;
        setTransactions(newLogs);
        const storagePref = localStorage.getItem("bml_storage_pref");

        if (storagePref === 'extension') {
            sendToExtension({ type: 'EXTENSION_DB_SAVE', payload: { logs: newLogs } }).catch((err: Error) => {
                console.error("Failed to save to extension DB", err);
            });
            persistTransactionsCache("LogsDB", newLogs).catch(console.error);
        } else if (storagePref === 'drive') {
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
    }, [driveApiKey, markDriveSyncComplete, persistTransactionsCache, runSyncTask]);

    const mergeTransactions = useCallback((incoming: Transaction[]) => {
        setTransactions(prev => {
            const merged = [...prev];
            const existingIds = new Set(prev.map(t => t.id));

            incoming.forEach(t => {
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
    }, [saveTransactions]);

    const saveWeaverConfig = useCallback(async (apiKey: string) => {
        const trimmedApiKey = apiKey.trim();
        const cfg: JournalConfig = buildConfigSnapshot({ apiKey: trimmedApiKey, userId: "" });

        if (trimmedApiKey) {
            const userId = await resolveTornUserId(trimmedApiKey);
            cfg.userId = userId;
            setWeav3rApiKey(trimmedApiKey);
            setWeav3rUserId(userId);
        } else {
            setWeav3rApiKey("");
            setWeav3rUserId("");
        }

        await persistConfigCache(JSON.stringify(cfg));
        return cfg.userId;
    }, [buildConfigSnapshot, persistConfigCache]);

    const saveTornApiKeyFull = useCallback(async (apiKey: string) => {
        const trimmedApiKey = apiKey.trim();
        setTornApiKeyFull(trimmedApiKey);
        await persistMergedConfig({ tornApiKeyFull: trimmedApiKey });
    }, [persistMergedConfig]);

    const saveDriveApiKey = useCallback(async (apiKey: string) => {
        setDriveApiKey(apiKey);
        await persistMergedConfig({ driveApiKey: apiKey });
    }, [persistMergedConfig]);

    const updateSkipNegativeStock = useCallback(async (value: boolean) => {
        setSkipNegativeStock(value);
        await persistMergedConfig({ skipNegativeStock: value });
    }, [persistMergedConfig]);

    const addLogs = useCallback(async (parsedLogs: ParsedLog[], options?: { skipNegativeStock?: boolean }) => {
        const storagePref = localStorage.getItem("bml_storage_pref");
        const baseTransactions = storagePref === 'drive'
            ? await runSyncTask("Syncing...", fetchDriveTransactions)
            : transactionsRef.current;
        const nextTransactions = buildTransactionsWithLogs(
            baseTransactions,
            parsedLogs,
            options?.skipNegativeStock ?? skipNegativeStock
        );
        saveTransactions(nextTransactions);
    }, [fetchDriveTransactions, runSyncTask, saveTransactions, skipNegativeStock]);

    const saveAutoPilotState = useCallback(async (patch: Partial<JournalConfig>) => {
        if (Object.prototype.hasOwnProperty.call(patch, "autoPilotCursor")) {
            setAutoPilotCursor(patch.autoPilotCursor ?? null);
        }
        if (Object.prototype.hasOwnProperty.call(patch, "autoPilotTradeCursor")) {
            setAutoPilotTradeCursor(patch.autoPilotTradeCursor ?? null);
        }
        if (Object.prototype.hasOwnProperty.call(patch, "autoPilotItemCursor")) {
            setAutoPilotItemCursor(patch.autoPilotItemCursor ?? null);
        }
        if (Object.prototype.hasOwnProperty.call(patch, "autoPilotStartTime")) {
            setAutoPilotStartTime(patch.autoPilotStartTime ?? null);
        }
        if (Object.prototype.hasOwnProperty.call(patch, "autoPilotLastSyncAt")) {
            setAutoPilotLastSyncAt(patch.autoPilotLastSyncAt ?? null);
        }
        if (Object.prototype.hasOwnProperty.call(patch, "autoPilotTradeCache")) {
            setAutoPilotTradeCache(patch.autoPilotTradeCache || []);
        }
        if (Object.prototype.hasOwnProperty.call(patch, "autoPilotReceiptCache")) {
            setAutoPilotReceiptCache(patch.autoPilotReceiptCache || []);
        }
        if (Object.prototype.hasOwnProperty.call(patch, "autoPilotTradeLinks")) {
            setAutoPilotTradeLinks(patch.autoPilotTradeLinks || []);
        }
        if (Object.prototype.hasOwnProperty.call(patch, "autoPilotTrashedReceiptIds")) {
            setAutoPilotTrashedReceiptIds(patch.autoPilotTrashedReceiptIds || []);
        }
        if (Object.prototype.hasOwnProperty.call(patch, "autoPilotManuallyAddedTradeIds")) {
            setAutoPilotManuallyAddedTradeIds(patch.autoPilotManuallyAddedTradeIds || []);
        }
        if (Object.prototype.hasOwnProperty.call(patch, "autoPilotPendingTrades")) {
            setAutoPilotPendingTrades(patch.autoPilotPendingTrades || []);
        }
        if (Object.prototype.hasOwnProperty.call(patch, "autoPilotRecentImports")) {
            setAutoPilotRecentImports(patch.autoPilotRecentImports || []);
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
                        AUTO_PILOT_DRIVE_FILE,
                    );
                    if (!response.success) {
                        throw new Error("Failed to sync Auto-Pilot state to Google Drive");
                    }
                    markDriveSyncComplete();
                }
            );
        }
    }, [buildConfigSnapshot, driveApiKey, markDriveSyncComplete, persistMergedConfig, pickDriveAutoPilotState, runSyncTask]);

    const clearLogs = useCallback(() => {
        localStorage.removeItem(DRIVE_CACHE_READY_KEY);
        localStorage.removeItem(DRIVE_CACHE_SYNCED_AT_KEY);
        saveTransactions([]);
    }, [saveTransactions]);

    const deleteLog = useCallback((id: string) => {
        saveTransactions(transactions.filter(t => t.id !== id));
    }, [saveTransactions, transactions]);

    const restoreData = useCallback((data: Transaction[], merge: boolean = false) => {
        if (merge) {
            saveTransactions([...transactions, ...data]);
        } else {
            saveTransactions(data);
        }
    }, [saveTransactions, transactions]);

    const editLog = useCallback((id: string, updates: Partial<Transaction>) => {
        saveTransactions(transactions.map(t => t.id === id ? { ...t, ...updates } as Transaction : t));
    }, [saveTransactions, transactions]);

    const renameItem = useCallback((oldName: string, newName: string) => {
        if (!newName.trim()) return;
        const normalizedNewName = newName.trim();
        saveTransactions(transactions.map(t => {
            if (t.type === 'BUY' || t.type === 'SELL') {
                if (t.item === oldName) return { ...t, item: normalizedNewName } as Transaction;
            } else if (t.type === 'CONVERT') {
                if (t.fromItem === oldName || t.toItem === oldName) {
                    return {
                        ...t,
                        fromItem: t.fromItem === oldName ? normalizedNewName : t.fromItem,
                        toItem: t.toItem === oldName ? normalizedNewName : t.toItem
                    } as Transaction;
                }
            }
            return t;
        }));
    }, [saveTransactions, transactions]);

    const switchStorageLocation = useCallback(async (newLocation: 'browser' | 'drive', migrationType: 'merge' | 'overwrite' | 'none') => {
        const sourceDB = newLocation === 'drive' ? 'LogsDB' : 'GoogleCacheLogsDB';
        const targetDB = newLocation === 'drive' ? 'GoogleCacheLogsDB' : 'LogsDB';

        let targetData: Transaction[] = [];

        if (migrationType !== 'none') {
            const sourceData = await readCachedTransactions(sourceDB);
            if (migrationType === 'overwrite') {
                targetData = sourceData;
            } else if (migrationType === 'merge') {
                const existingTarget = await readCachedTransactions(targetDB);
                const ids = new Set(existingTarget.map(t => t.id));
                targetData = [...existingTarget];
                sourceData.forEach(t => {
                    if (!ids.has(t.id)) {
                        targetData.push(t);
                        ids.add(t.id);
                    }
                });
                targetData.sort((a, b) => a.date - b.date);
            }

            await persistTransactionsCache(targetDB, targetData);
            if (newLocation === 'drive' && driveApiKey) {
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
    }, [driveApiKey, markDriveSyncComplete, persistTransactionsCache, readCachedTransactions, runSyncTask]);

    const inventory = calculateInventory(transactions);
    let totalMugLoss = 0;
    transactions.forEach(t => { if (t.type === 'MUG') totalMugLoss += t.amount; });
    let totalItemRealizedProfit = 0;
    let totalInventoryValue = 0;
    let totalAbroadRealizedProfit = 0;
    let totalAbroadInventoryValue = 0;
    inventory.forEach(stats => {
        totalItemRealizedProfit += stats.realizedProfit;
        totalInventoryValue += Math.max(0, stats.totalCost);
        totalAbroadRealizedProfit += stats.abroadRealizedProfit;
        totalAbroadInventoryValue += Math.max(0, stats.abroadTotalCost);
    });

    return {
        isLoaded,
        transactions,
        addLogs,
        clearLogs,
        deleteLog,
        restoreData,
        editLog,
        renameItem,
        inventory,
        calculateInventory,
        totalMugLoss,
        totalItemRealizedProfit,
        totalInventoryValue,
        netTotalProfit: totalItemRealizedProfit - totalMugLoss,
        weav3rApiKey,
        weav3rUserId,
        driveApiKey,
        tornApiKeyFull,
        skipNegativeStock,
        updateSkipNegativeStock,
        saveWeaverConfig,
        saveTornApiKeyFull,
        saveDriveApiKey,
        autoPilotCursor,
        autoPilotTradeCursor,
        autoPilotItemCursor,
        autoPilotStartTime,
        autoPilotLastSyncAt,
        autoPilotTradeCache,
        autoPilotReceiptCache,
        autoPilotTradeLinks,
        autoPilotTrashedReceiptIds,
        autoPilotManuallyAddedTradeIds,
        autoPilotPendingTrades,
        autoPilotRecentImports,
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
        driveCacheSyncedAt: typeof window !== "undefined"
            ? localStorage.getItem(DRIVE_CACHE_SYNCED_AT_KEY)
            : null
    };
}
