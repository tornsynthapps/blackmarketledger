"use client";

import { setApiKey, setUserId } from "./api-keys";

const TORN_V2_API_BASE = "https://api.torn.com/v2";
const TORN_BASIC_USER_URL = `${TORN_V2_API_BASE}/user/?selections=basic&key=`;

/**
 * Fetches the Torn User ID for a given API key using the v2 API.
 */
export async function fetchTornUserId(apiKey: string): Promise<string> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error("API key is required");
  }

  const response = await fetch(
    `${TORN_BASIC_USER_URL}${encodeURIComponent(trimmedKey)}`,
  );
  const data = await response.json();

  if (!response.ok || data?.error) {
    const message =
      data?.error?.error || data?.error || "Failed to validate Torn API key";
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
    typeof rawUserId === "number" || typeof rawUserId === "string"
      ? String(rawUserId)
      : "";

  if (!userId) {
    throw new Error(
      "Could not determine Torn user ID from the provided API key.",
    );
  }

  return userId;
}

/**
 * Validates a Weav3r API key, fetches the corresponding User ID,
 * and persists both to local storage.
 */
export async function saveWeaverConfig(apiKey: string): Promise<string> {
  const trimmedKey = apiKey.trim();
  
  if (!trimmedKey) {
    setApiKey("");
    setUserId("");
    return "";
  }

  try {
    const userId = await fetchTornUserId(trimmedKey);
    setApiKey(trimmedKey);
    setUserId(userId);
    return userId;
  } catch (error) {
    console.error("Failed to save Weav3r config:", error);
    throw error;
  }
}
