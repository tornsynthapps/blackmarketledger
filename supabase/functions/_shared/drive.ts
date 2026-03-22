// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export type VerifiedUser = {
  apiKey: string;
  userId: number;
  username: string | null;
  subscriptionValid: boolean;
  validUntil: string | null;
};

type TornBasicResponse = {
  profile?: {
    id?: number;
    name?: string;
    username?: string;
  };
};

export type DriveConfigRow = {
  torn_api_key: string;
  torn_user_id: number;
  google_api_key: string;
  access_token: string | null;
  refresh_token: string | null;
  token_type: string | null;
  scopes: string[] | null;
  expires_at: string | null;
  connected_at: string | null;
  updated_at: string | null;
  last_synced_at: string | null;
  drive_file_id: string | null;
};

const DEFAULT_DRIVE_FILE_NAME = "bml_sync_data.json";

function resolveDriveFileName(file?: string) {
  return file?.trim() || DEFAULT_DRIVE_FILE_NAME;
}

export function createSupabaseAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

export async function resolveTornUserFromApiKey(apiKey: string) {
  const tornRes = await fetch("https://api.torn.com/v2/user/basic?striptags=true", {
    method: "GET",
    headers: {
      Authorization: `ApiKey ${apiKey}`,
      accept: "application/json",
    },
  });

  const tornPayload = (await tornRes.json()) as TornBasicResponse;
  const userId = tornPayload?.profile?.id;
  const username =
    tornPayload?.profile?.name || tornPayload?.profile?.username || null;

  if (!tornRes.ok || !userId) {
    throw new Error("Invalid Torn API key");
  }

  return {
    apiKey,
    userId,
    username,
  };
}

export async function verifyUserFromApiKey(apiKey: string): Promise<VerifiedUser> {
  const identity = await resolveTornUserFromApiKey(apiKey);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("extension_subscriptions")
    .select("torn_user_id, username, valid_until")
    .eq("torn_user_id", identity.userId)
    .maybeSingle();

  if (error) {
    throw new Error("Database lookup failed");
  }

  if (!data?.torn_user_id) {
    throw new Error("API key is not registered for BML Connect");
  }

  const validUntil = data?.valid_until ?? null;
  return {
    ...identity,
    subscriptionValid: Boolean(
      validUntil && new Date(validUntil).getTime() > Date.now(),
    ),
    validUntil,
  };
}

export async function getDriveConfigByApiKey(apiKey: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("google_sync_configs")
    .select("*")
    .eq("torn_api_key", apiKey)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load Google Drive configuration");
  }

  return data as DriveConfigRow | null;
}

export async function getDriveConfigByUserId(userId: number) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("google_sync_configs")
    .select("*")
    .eq("torn_user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load Google Drive configuration");
  }

  return data as DriveConfigRow | null;
}

export async function refreshDriveAccessToken(config: DriveConfigRow) {
  if (!config.refresh_token) {
    throw new Error("Missing Google refresh token");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      refresh_token: config.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(
      payload.error_description || payload.error || "Google token refresh failed",
    );
  }

  const expiresAt = new Date(Date.now() + Number(payload.expires_in || 3600) * 1000)
    .toISOString();

  const nextConfig = {
    ...config,
    access_token: payload.access_token,
    token_type: payload.token_type || config.token_type,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  };

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("google_sync_configs")
    .update({
      access_token: nextConfig.access_token,
      token_type: nextConfig.token_type,
      expires_at: nextConfig.expires_at,
      updated_at: nextConfig.updated_at,
    })
    .eq("torn_api_key", config.torn_api_key);

  if (error) {
    throw new Error("Failed to persist refreshed Google token");
  }

  return nextConfig;
}

export async function ensureDriveAccessToken(config: DriveConfigRow) {
  const expiresAt = config.expires_at ? new Date(config.expires_at).getTime() : 0;
  const needsRefresh =
    !config.access_token || !expiresAt || expiresAt < Date.now() + 60_000;

  if (!needsRefresh) {
    return config;
  }

  return refreshDriveAccessToken(config);
}

async function driveRequest(
  config: DriveConfigRow,
  input: { path: string; init?: RequestInit; query?: Record<string, string> },
) {
  const url = new URL(`https://www.googleapis.com/${input.path}`);

  for (const [key, value] of Object.entries(input.query || {})) {
    url.searchParams.set(key, value);
  }

  return fetch(url, {
    ...input.init,
    headers: {
      Authorization: `Bearer ${config.access_token}`,
      ...(input.init?.headers || {}),
    },
  });
}

export async function findDriveFile(config: DriveConfigRow, file?: string) {
  const fileName = resolveDriveFileName(file);
  const query =
    `name='${fileName.replace(/'/g, "\\'")}' and 'appDataFolder' in parents and trashed=false`;
  const response = await driveRequest(config, {
    path: "drive/v3/files",
    query: {
      spaces: "appDataFolder",
      q: query,
      fields: "files(id,name,modifiedTime)",
    },
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Failed to inspect Drive appData");
  }

  return payload.files?.[0] ?? null;
}

export async function readDriveData(config: DriveConfigRow, file?: string) {
  const existingFile = await findDriveFile(config, file);
  if (!existingFile) {
    return { data: [], hasData: false, fileId: null };
  }

  const response = await driveRequest(config, {
    path: `drive/v3/files/${existingFile.id}`,
    query: { alt: "media" },
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(raw || "Failed to read Drive data");
  }

  const parsed = raw ? JSON.parse(raw) : [];
  return {
    data: parsed,
    hasData: true,
    fileId: existingFile.id as string,
  };
}

export async function writeDriveData(config: DriveConfigRow, data: unknown, file?: string) {
  const fileName = resolveDriveFileName(file);
  const existing = await findDriveFile(config, file);
  const boundary = "bml_sync_boundary";
  const metadata = existing
    ? { name: fileName }
    : { name: fileName, parents: ["appDataFolder"] };

  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(data),
    `--${boundary}--`,
  ].join("\r\n");

  const response = await driveRequest(config, {
    path: existing
      ? `upload/drive/v3/files/${existing.id}`
      : "upload/drive/v3/files",
    query: { uploadType: "multipart" },
    init: {
      method: existing ? "PATCH" : "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Failed to write Drive data");
  }

  return payload.id as string;
}

export async function deleteDriveData(config: DriveConfigRow, file?: string) {
  const existingFile = await findDriveFile(config, file);
  if (!existingFile) return false;

  const response = await driveRequest(config, {
    path: `drive/v3/files/${existingFile.id}`,
    init: { method: "DELETE" },
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || "Failed to delete Drive data");
  }

  return true;
}

export async function persistDriveMetadata(
  apiKey: string,
  values: Partial<DriveConfigRow>,
) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("google_sync_configs")
    .update(values)
    .eq("torn_api_key", apiKey);

  if (error) {
    throw new Error("Failed to persist Google Drive metadata");
  }
}

export function toDriveStatus(config: DriveConfigRow | null, hasData = false) {
  return {
    connected: Boolean(config?.refresh_token),
    hasData,
    email: null,
    scopes: config?.scopes || [],
    connectedAt: config?.connected_at || null,
    lastSyncedAt: config?.last_synced_at || null,
  };
}
