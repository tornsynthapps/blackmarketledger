// @ts-nocheck
import {
  corsHeaders,
  createSupabaseAdminClient,
  deleteDriveData,
  ensureDriveAccessToken,
  getDriveConfigByApiKey,
  jsonResponse,
  persistDriveMetadata,
  readDriveData,
  toDriveStatus,
  verifyUserFromApiKey,
  writeDriveData,
} from "../_shared/drive.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { apiKey, action, data, file } = await req.json();
    if (!apiKey || !action) {
      return jsonResponse({ error: "Missing apiKey or action" }, 400);
    }

    await verifyUserFromApiKey(apiKey);
    const config = await getDriveConfigByApiKey(apiKey);

    if (!config?.refresh_token) {
      return jsonResponse({ error: "Google Drive not connected for this user" }, 404);
    }

    const activeConfig = await ensureDriveAccessToken(config);

    if (action === "status") {
      const readResult = await readDriveData(activeConfig, file);
      if (!file && readResult.fileId !== activeConfig.drive_file_id) {
        await persistDriveMetadata(apiKey, { drive_file_id: readResult.fileId });
      }

      return jsonResponse({
        success: true,
        data: toDriveStatus(activeConfig, readResult.hasData),
      });
    }

    if (action === "read") {
      const readResult = await readDriveData(activeConfig, file);
      if (!file && readResult.fileId !== activeConfig.drive_file_id) {
        await persistDriveMetadata(apiKey, { drive_file_id: readResult.fileId });
      }

      return jsonResponse({
        success: true,
        data: readResult.data,
        meta: {
          connection: toDriveStatus(activeConfig, readResult.hasData),
        },
      });
    }

    if (action === "write") {
      const fileId = await writeDriveData(activeConfig, data ?? [], file);
      const now = new Date().toISOString();

      if (!file) {
        await persistDriveMetadata(apiKey, {
          drive_file_id: fileId,
          last_synced_at: now,
          updated_at: now,
        });
      } else {
        await persistDriveMetadata(apiKey, {
          last_synced_at: now,
          updated_at: now,
        });
      }

      return jsonResponse({
        success: true,
        data: toDriveStatus(
          {
            ...activeConfig,
            drive_file_id: !file ? fileId : activeConfig.drive_file_id,
            last_synced_at: now,
            updated_at: now,
          },
          true,
        ),
      });
    }

    if (action === "delete") {
      await deleteDriveData(activeConfig, file);

      if (!file) {
        await persistDriveMetadata(apiKey, {
          drive_file_id: null,
          last_synced_at: null,
          updated_at: new Date().toISOString(),
        });
      } else {
        await persistDriveMetadata(apiKey, {
          updated_at: new Date().toISOString(),
        });
      }

      return jsonResponse({
        success: true,
        data: toDriveStatus(
          {
            ...activeConfig,
            drive_file_id: !file ? null : activeConfig.drive_file_id,
            last_synced_at: !file ? null : activeConfig.last_synced_at,
          },
          false,
        ),
      });
    }

    if (action === "disconnect") {
      const supabase = createSupabaseAdminClient();
      await supabase.from("google_auth_states").delete().eq("torn_api_key", apiKey);
      await supabase.from("google_sync_configs").delete().eq("torn_api_key", apiKey);

      return jsonResponse({
        success: true,
        data: {
          connected: false,
          hasData: false,
          email: null,
          scopes: [],
          connectedAt: null,
          lastSyncedAt: null,
        },
      });
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      500,
    );
  }
});
