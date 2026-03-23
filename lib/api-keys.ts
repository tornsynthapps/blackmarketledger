export const CONFIG_KEY = "torn_invest_tracker_config";
export const CONNECTION_TOKEN_KEY = "connectionToken";

interface ApiKeysCache {
  apiKey: string | null;
  userId: string | null;
  driveApiKey: string | null;
  tornApiKeyFull: string | null;
  tornApiRateLimit: number;
  weav3rApiRateLimit: number;
}

let apiKeysCache: ApiKeysCache | null = null;
let cacheInitialized = false;

const DEFAULT_RATE_LIMIT = 60;

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`localStorage.getItem failed for "${key}":`, e);
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error(`localStorage.setItem failed for "${key}":`, e);
  }
}

function parseConfigFromStorage(): ApiKeysCache | null {
  const stored = safeGetItem(CONFIG_KEY);
  if (!stored) return null;

  try {
    const config = JSON.parse(stored);
    return {
      apiKey: config.apiKey || null,
      userId: config.userId || null,
      driveApiKey: config.driveApiKey || null,
      tornApiKeyFull: config.tornApiKeyFull || null,
      tornApiRateLimit: config.tornApiRateLimit ?? DEFAULT_RATE_LIMIT,
      weav3rApiRateLimit: config.weav3rApiRateLimit ?? DEFAULT_RATE_LIMIT,
    };
  } catch (e) {
    console.warn("Failed to parse config from localStorage:", e);
    return null;
  }
}

function ensureCache(): ApiKeysCache {
  if (!cacheInitialized) {
    apiKeysCache = parseConfigFromStorage();
    cacheInitialized = true;
  }
  return (
    apiKeysCache || {
      apiKey: null,
      userId: null,
      driveApiKey: null,
      tornApiKeyFull: null,
      tornApiRateLimit: DEFAULT_RATE_LIMIT,
      weav3rApiRateLimit: DEFAULT_RATE_LIMIT,
    }
  );
}

export function getApiKey(): string {
  return ensureCache().apiKey || "";
}

export function getUserId(): string {
  return ensureCache().userId || "";
}

export function getDriveApiKey(): string {
  return ensureCache().driveApiKey || "";
}

export function getTornApiKeyFull(): string {
  return ensureCache().tornApiKeyFull || "";
}

export function getTornApiRateLimit(): number {
  return ensureCache().tornApiRateLimit;
}

export function getWeav3rApiRateLimit(): number {
  return ensureCache().weav3rApiRateLimit;
}

export function getConnectionToken(): string {
  const token = safeGetItem(CONNECTION_TOKEN_KEY);
  return token || "";
}

export function setApiKey(value: string): void {
  const cache = ensureCache();
  cache.apiKey = value;
  saveToStorage(cache);
}

export function setUserId(value: string): void {
  const cache = ensureCache();
  cache.userId = value;
  saveToStorage(cache);
}

export function setDriveApiKey(value: string): void {
  const cache = ensureCache();
  cache.driveApiKey = value;
  saveToStorage(cache);
}

export function setTornApiKeyFull(value: string): void {
  const cache = ensureCache();
  cache.tornApiKeyFull = value;
  saveToStorage(cache);
}

export function setTornApiRateLimit(value: number): void {
  const cache = ensureCache();
  cache.tornApiRateLimit = value;
  saveToStorage(cache);
}

export function setWeav3rApiRateLimit(value: number): void {
  const cache = ensureCache();
  cache.weav3rApiRateLimit = value;
  saveToStorage(cache);
}

export function setConnectionToken(value: string): void {
  safeSetItem(CONNECTION_TOKEN_KEY, value);
}

function saveToStorage(cache: ApiKeysCache): void {
  const stored = safeGetItem(CONFIG_KEY);
  let existingConfig: Record<string, unknown> = {};

  if (stored) {
    try {
      existingConfig = JSON.parse(stored);
    } catch {
      // Ignore parse errors
    }
  }

  const mergedConfig = {
    ...existingConfig,
    apiKey: cache.apiKey,
    userId: cache.userId,
    driveApiKey: cache.driveApiKey,
    tornApiKeyFull: cache.tornApiKeyFull,
    tornApiRateLimit: cache.tornApiRateLimit,
    weav3rApiRateLimit: cache.weav3rApiRateLimit,
  };

  safeSetItem(CONFIG_KEY, JSON.stringify(mergedConfig));
  dispatchApiKeysUpdate();
}

export function invalidateApiKeysCache(): void {
  cacheInitialized = false;
  apiKeysCache = null;
}

export function refreshApiKeysFromStorage(): void {
  apiKeysCache = parseConfigFromStorage();
  cacheInitialized = true;
  dispatchApiKeysUpdate();
}

function dispatchApiKeysUpdate(): void {
  try {
    window.dispatchEvent(new CustomEvent("api-keys-updated"));
  } catch {
    // Ignore dispatch errors
  }
}

export function getAllApiKeys(): {
  apiKey: string;
  userId: string;
  driveApiKey: string;
  tornApiKeyFull: string;
} {
  const cache = ensureCache();
  return {
    apiKey: cache.apiKey || "",
    userId: cache.userId || "",
    driveApiKey: cache.driveApiKey || "",
    tornApiKeyFull: cache.tornApiKeyFull || "",
  };
}
