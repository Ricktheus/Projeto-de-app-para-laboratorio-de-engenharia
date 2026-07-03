import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

export interface SupabaseClientConfig {
  /** Project URL, e.g. https://<project>.supabase.co */
  url: string;
  /** Public anon key. NEVER pass the service_role key here. */
  anonKey: string;
}

/**
 * Single typed factory for the app-facing (anon) Supabase client.
 *
 * Apps (mobile/web) inject the public anon key; authorization is enforced
 * server-side by RLS (see supabase/migrations/0005_rls.sql). The
 * `service_role` key must ONLY live in Edge Function environment variables
 * and is intentionally not accepted by this factory (SPEC §7.1).
 */
export function createSupabaseClient(config: SupabaseClientConfig): SupabaseClient<Database> {
  return createClient<Database>(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

export type TypedSupabaseClient = SupabaseClient<Database>;
