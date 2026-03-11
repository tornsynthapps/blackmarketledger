import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

type TornBasicResponse = {
  profile?: {
    id?: number;
    name?: string;
    username?: string;
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { apiKey } = await req.json();
    if (!apiKey || typeof apiKey !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing apiKey' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' }
      });
    }

    const tornRes = await fetch('https://api.torn.com/v2/user/basic?striptags=true', {
      method: 'GET',
      headers: {
        Authorization: `ApiKey ${apiKey}`,
        accept: 'application/json'
      }
    });

    const tornPayload = (await tornRes.json()) as TornBasicResponse;
    const userId = tornPayload?.profile?.id;
    const username = tornPayload?.profile?.name || tornPayload?.profile?.username || null;

    if (!tornRes.ok || !userId) {
      return new Response(JSON.stringify({ error: 'Invalid Torn API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'content-type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('extension_subscriptions')
      .select('valid_until')
      .eq('torn_user_id', userId)
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ error: 'Database lookup failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'content-type': 'application/json' }
      });
    }

    const validUntil = data?.valid_until ?? null;
    const subscriptionValid = Boolean(validUntil && new Date(validUntil).getTime() > Date.now());

    return new Response(
      JSON.stringify({
        userId,
        username,
        subscriptionValid,
        validUntil
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'content-type': 'application/json' }
      }
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Unexpected server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });
  }
});
