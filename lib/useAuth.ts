"use client";

import { useSyncExternalStore } from "react";
import {
    getAllApiKeys,
    subscribeToApiKeys,
    getApiKey,
    getUserId,
    getDriveApiKey,
    getTornApiKeyFull,
    getTornApiRateLimit,
    getWeav3rApiRateLimit,
} from "./api-keys";

export function useAuth() {
    const weav3rApiKey = useSyncExternalStore(subscribeToApiKeys, getApiKey, () => "");

    const weav3rUserId = useSyncExternalStore(subscribeToApiKeys, getUserId, () => "");

    const driveApiKey = useSyncExternalStore(subscribeToApiKeys, getDriveApiKey, () => "");

    const tornApiKeyFull = useSyncExternalStore(subscribeToApiKeys, getTornApiKeyFull, () => "");

    const tornApiRateLimit = useSyncExternalStore(
        subscribeToApiKeys,
        getTornApiRateLimit,
        () => 60
    );

    const weav3rApiRateLimit = useSyncExternalStore(
        subscribeToApiKeys,
        getWeav3rApiRateLimit,
        () => 60
    );

    return {
        weav3rApiKey,
        weav3rUserId,
        driveApiKey,
        tornApiKeyFull,
        tornApiRateLimit,
        weav3rApiRateLimit,
    };
}
