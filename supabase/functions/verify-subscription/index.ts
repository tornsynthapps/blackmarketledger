import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders, jsonResponse } from "../_shared/drive.ts";

type TornBasicResponse = {
  profile?: {
    id?: number;
    name?: string;
    username?: string;
  };
};

const TRIAL_DAYS = 21;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { apiKey, action = "check" } = await req.json();
    if (!apiKey || typeof apiKey !== "string") {
      return jsonResponse({ error: "Missing apiKey" }, 400);
    }

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
      return jsonResponse({ error: "Invalid Torn API key" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    if (action === "claim_trial") {
      const validUntil = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

      const { error: upsertError } = await supabase
        .from("extension_subscriptions")
        .upsert({
          torn_user_id: userId,
          username: username,
          valid_until: validUntil,
        }, {
          onConflict: 'torn_user_id',
        });

      if (upsertError) {
        return jsonResponse({ error: "Failed to claim trial: " + upsertError.message }, 500);
      }

      return jsonResponse({
        userId,
        username,
        subscriptionValid: true,
        validUntil,
        isTrialClaimed: true,
        eligibleForTrial: false,
      });
    }

    const { data, error } = await supabase
      .from("extension_subscriptions")
      .select("valid_until")
      .eq("torn_user_id", userId)
      .maybeSingle();

    if (error) {
      return jsonResponse({ error: "Database lookup failed" }, 500);
    }

    const validUntil = data?.valid_until ?? null;
    const subscriptionValid = Boolean(
      validUntil && new Date(validUntil).getTime() > Date.now(),
    );

    const eligibleForTrial = !data || !subscriptionValid;

    return jsonResponse({
      userId,
      username,
      subscriptionValid,
      validUntil,
      eligibleForTrial,
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unexpected server error" },
      500,
    );
  }
});
