/**
 * Cloudflare Worker for Torn Subscription Verification
 * 
 * Required Secrets:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key (to bypass RLS)
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
      const { apiKey } = await request.json();
      if (!apiKey || typeof apiKey !== "string") {
        return new Response(JSON.stringify({ error: "Missing apiKey" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 1. Resolve Torn User Identity
      const tornRes = await fetch("https://api.torn.com/v2/user/basic?striptags=true", {
        headers: {
          "Authorization": `ApiKey ${apiKey}`,
          "Accept": "application/json",
        },
      });

      const tornPayload = await tornRes.json();
      const userId = tornPayload?.profile?.id;
      const username = tornPayload?.profile?.name || tornPayload?.profile?.username || null;

      if (!tornRes.ok || !userId) {
        return new Response(JSON.stringify({ error: "Invalid Torn API key" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 2. Check Supabase for Subscription
      const supabaseUrl = env.SUPABASE_URL;
      const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

      const subRes = await fetch(`${supabaseUrl}/rest/v1/extension_subscriptions?torn_user_id=eq.${userId}&select=valid_until`, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Accept": "application/json",
        },
      });

      if (!subRes.ok) {
        const errorText = await subRes.text();
        console.error("Supabase error:", errorText);
        throw new Error(`Database query failed: ${subRes.status}`);
      }

      const subData = await subRes.json();
      console.log(`Query result for user ${userId}:`, JSON.stringify(subData));

      const subscription = subData?.[0] || null;

      const validUntil = subscription?.valid_until ?? null;
      const subscriptionValid = Boolean(
        validUntil && new Date(validUntil).getTime() > Date.now()
      );

      return new Response(JSON.stringify({
        userId,
        username,
        subscriptionValid,
        validUntil,
        // Include some debug info if not valid
        _debug: subscriptionValid ? undefined : {
          found: !!subscription,
          validUntil: validUntil,
          now: new Date().toISOString()
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected server error"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  },
};
