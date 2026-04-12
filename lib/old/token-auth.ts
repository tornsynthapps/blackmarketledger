"use client";

const TOKEN_KEY = "bml_token";
const USER_ID_KEY = "bml_user_id";
const USERNAME_KEY = "bml_username";
const VALID_UNTIL_KEY = "bml_valid_until";

export interface StoredAuth {
    userId: string;
    username: string;
    secretToken: string;
    validUntil: string | null;
}

export function saveAuth(auth: StoredAuth): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(TOKEN_KEY, auth.secretToken);
        localStorage.setItem(USER_ID_KEY, auth.userId);
        localStorage.setItem(USERNAME_KEY, auth.username);
        if (auth.validUntil) {
            localStorage.setItem(VALID_UNTIL_KEY, auth.validUntil);
        } else {
            localStorage.removeItem(VALID_UNTIL_KEY);
        }
    } catch (error) {
        console.error("Failed to save auth:", error);
    }
}

export function getToken(): string {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function getUserId(): string {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(USER_ID_KEY) ?? "";
}

export function getUsername(): string {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(USERNAME_KEY) ?? "";
}

export function getValidUntil(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(VALID_UNTIL_KEY);
}

export function getStoredAuth(): StoredAuth | null {
    const token = getToken();
    const userId = getUserId();
    const username = getUsername();
    const validUntil = getValidUntil();

    if (!token || !userId) {
        return null;
    }

    return {
        userId,
        username,
        secretToken: token,
        validUntil,
    };
}

export function clearAuth(): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_ID_KEY);
        localStorage.removeItem(USERNAME_KEY);
        localStorage.removeItem(VALID_UNTIL_KEY);
    } catch (error) {
        console.error("Failed to clear auth:", error);
    }
}

export function isAuthenticated(): boolean {
    const auth = getStoredAuth();
    if (!auth) return false;

    if (auth.validUntil) {
        return new Date(auth.validUntil).getTime() > Date.now();
    }

    return true;
}

export function isSubscriptionValid(): boolean {
    const validUntil = getValidUntil();
    if (!validUntil) return false;
    return new Date(validUntil).getTime() > Date.now();
}
