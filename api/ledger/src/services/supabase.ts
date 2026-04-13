import { createClient } from '@supabase/supabase-js';

export const getSupabaseClient = (env: any) => {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
};
