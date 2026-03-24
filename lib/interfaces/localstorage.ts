import { TornUser } from "../game/user";

export type StorageType = "browser" | "google-drive";

export class KeyNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "KeyNotFoundError";
    }
}

export class LocalStorageInterface {
    // Storage keys
    private static DEBUG_MODE_KEY = "debug_mode";
    private static STORAGE_TYPE_KEY = "storage_type";
    private static USER_KEY = "user_id";
    private static WEAV3R_API_KEY = "weav3r_api_key";
    private static DRIVE_SYNC_API_KEY = "torn_api_key";
    private static FULL_ACCESS_API_KEY = "torn_api_key_full";

    // Generic localStorage access
    static getItem(key: string): string | null {
        if (typeof window === "undefined") return null;
        return localStorage.getItem(key);
    }

    static setItem(key: string, value: string): void {
        if (typeof window === "undefined") return;
        localStorage.setItem(key, value);
    }

    // Debug mode
    static isDebugModeOn(): Boolean {
        return this.getItem(this.DEBUG_MODE_KEY) === "true";
    }

    static setDebugMode(value: Boolean): void {
        this.setItem(this.DEBUG_MODE_KEY, value.toString());
    }

    // Storage type (browser vs. google drive)
    static getStorageType(): StorageType {
        return (
            (this.getItem(this.STORAGE_TYPE_KEY) as StorageType) || "browser"
        );
    }

    static setStorageType(value: StorageType): void {
        if (value !== "browser" && value !== "google-drive") {
            throw new Error("Invalid storage type");
        }
        this.setItem(this.STORAGE_TYPE_KEY, value);
    }

    // User ID
    static getUser(): TornUser {
        if (!this.getItem(this.USER_KEY)) {
            throw new KeyNotFoundError("User ID not set");
        }
        const data = JSON.parse(this.getItem(this.USER_KEY) || "{}");
        return new TornUser(data.id, data.username);
    }

    static setUser(user: TornUser): void {
        this.setItem(this.USER_KEY, JSON.stringify(user));
    }

    // API Keys
    static getAnyAPIKey(): string {
        if (this.getItem(this.DRIVE_SYNC_API_KEY)) {
            return this.getItem(this.DRIVE_SYNC_API_KEY) as string;
        }
        if (this.getItem(this.FULL_ACCESS_API_KEY)) {
            return this.getItem(this.FULL_ACCESS_API_KEY) as string;
        }
        if (this.getItem(this.WEAV3R_API_KEY)) {
            return this.getItem(this.WEAV3R_API_KEY) as string;
        }
        throw new KeyNotFoundError("No API key found");
    }

    static getWeav3rAPIKey(): string {
        if (this.getItem(this.WEAV3R_API_KEY)) {
            return this.getItem(this.WEAV3R_API_KEY) as string;
        }
        throw new KeyNotFoundError("No Weav3r API key found");
    }

    static setWeav3rAPIKey(value: string): void {
        if (!value) throw new Error("Weav3r API key cannot be empty");
        this.setItem(this.WEAV3R_API_KEY, value);
    }

    static setDriveAPIKey(value: string): void {
        if (!value) throw new Error("Drive API key cannot be empty");
        this.setItem(this.DRIVE_SYNC_API_KEY, value);
    }

    static setTornFullAPIKey(value: string): void {
        if (!value) throw new Error("Torn Full API key cannot be empty");
        this.setItem(this.FULL_ACCESS_API_KEY, value);
    }
}
