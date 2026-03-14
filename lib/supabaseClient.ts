import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Use implicit flow so Google's provider_token is included in the hash redirect.
    // With PKCE, the token exchange happens server-side at supabase.co and provider_token
    // is not forwarded to the client, making it impossible to store Drive tokens.
    flowType: 'implicit',
  },
});
