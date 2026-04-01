import { LocalStorageInterface } from "./interfaces/localstorage";

export const CONFIG_KEY = "torn_invest_tracker_config";
export const CONNECTION_TOKEN_KEY = "connectionToken";

// Migration function to move legacy config into LocalStorageInterface
export function refreshApiKeysFromStorage(): void {
  if (typeof window === "undefined") return;
  // Try to migrate from legacy config if it exists
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      const config = JSON.parse(stored);
      
      if (config.apiKey && !LocalStorageInterface.getWeav3rAPIKey()) {
        LocalStorageInterface.setWeav3rAPIKey(config.apiKey);
      }
      if (config.userId && !LocalStorageInterface.getWeav3rUserId()) {
        LocalStorageInterface.setWeav3rUserId(config.userId);
      }
      if (config.driveApiKey && !LocalStorageInterface.getDriveAPIKey()) {
        LocalStorageInterface.setDriveAPIKey(config.driveApiKey);
      }
      if (config.tornApiKeyFull && !LocalStorageInterface.getTornFullAPIKey()) {
        LocalStorageInterface.setTornFullAPIKey(config.tornApiKeyFull);
      }
      if (config.tornApiRateLimit !== undefined) {
        LocalStorageInterface.setTornApiRateLimit(config.tornApiRateLimit);
      }
      if (config.weav3rApiRateLimit !== undefined) {
        LocalStorageInterface.setWeav3rApiRateLimit(config.weav3rApiRateLimit);
      }
    }
  } catch (e) {
    console.warn("Failed to parse config from localStorage:", e);
  }

  dispatchApiKeysUpdate();
}

export function subscribeToApiKeys(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("api-keys-updated", listener);
  return () => window.removeEventListener("api-keys-updated", listener);
}

function dispatchApiKeysUpdate(): void {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("api-keys-updated"));
    }
  } catch {
    // Ignore dispatch errors
  }
}

export function getApiKey(): string {
  return LocalStorageInterface.getWeav3rAPIKey();
}

export function getUserId(): string {
  return LocalStorageInterface.getWeav3rUserId();
}

export function getDriveApiKey(): string {
  return LocalStorageInterface.getDriveAPIKey();
}

export function getTornApiKeyFull(): string {
  return LocalStorageInterface.getTornFullAPIKey();
}

export function getTornApiRateLimit(): number {
  return LocalStorageInterface.getTornApiRateLimit();
}

export function getWeav3rApiRateLimit(): number {
  return LocalStorageInterface.getWeav3rApiRateLimit();
}

export function getConnectionToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(CONNECTION_TOKEN_KEY) || "";
}

export function setApiKey(value: string): void {
  LocalStorageInterface.setWeav3rAPIKey(value);
  dispatchApiKeysUpdate();
}

export function setUserId(value: string): void {
  LocalStorageInterface.setWeav3rUserId(value);
  dispatchApiKeysUpdate();
}

export function setDriveApiKey(value: string): void {
  LocalStorageInterface.setDriveAPIKey(value);
  dispatchApiKeysUpdate();
}

export function setTornApiKeyFull(value: string): void {
  LocalStorageInterface.setTornFullAPIKey(value);
  dispatchApiKeysUpdate();
}

export function setTornApiRateLimit(value: number): void {
  LocalStorageInterface.setTornApiRateLimit(value);
  dispatchApiKeysUpdate();
}

export function setWeav3rApiRateLimit(value: number): void {
  LocalStorageInterface.setWeav3rApiRateLimit(value);
  dispatchApiKeysUpdate();
}

export function setConnectionToken(value: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(CONNECTION_TOKEN_KEY, value);
  }
}

export function invalidateApiKeysCache(): void {
  // No-op since we use direct LocalStorage reads now
}

export function getAllApiKeys(): {
  apiKey: string;
  userId: string;
  driveApiKey: string;
  tornApiKeyFull: string;
} {
  return {
    apiKey: LocalStorageInterface.getWeav3rAPIKey(),
    userId: LocalStorageInterface.getWeav3rUserId(),
    driveApiKey: LocalStorageInterface.getDriveAPIKey(),
    tornApiKeyFull: LocalStorageInterface.getTornFullAPIKey(),
  };
}
