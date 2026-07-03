import { createSupabaseClient } from '@concreto/supabase';

import { env } from '../lib/env';

/**
 * The single web Supabase client (anon key). Authorization is enforced by RLS;
 * this client never receives the service_role key (SPEC §7.1).
 */
export const supabase = createSupabaseClient({
  url: env.supabaseUrl,
  anonKey: env.supabaseAnonKey,
});
