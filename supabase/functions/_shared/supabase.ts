/**
 * Supabase client factories for Edge Functions.
 *
 * `service_role` NEVER reaches the browser (SPEC §7.1) — it only lives in the
 * function's environment. The user-scoped client forwards the caller's JWT so
 * `auth.getUser()` resolves the acting user for authorization checks.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return value;
}

/** Admin client (service_role) — bypasses RLS. Use only where strictly needed. */
export function serviceClient(): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Client bound to the caller's JWT — subject to RLS, resolves the caller. */
export function userClient(authHeader: string): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Resolves the authenticated caller from the Authorization header, or null. */
export async function resolveCaller(
  authHeader: string | null,
): Promise<{ id: string; email?: string } | null> {
  if (!authHeader) {
    return null;
  }
  const { data, error } = await userClient(authHeader).auth.getUser();
  if (error || !data.user) {
    return null;
  }
  return { id: data.user.id, email: data.user.email ?? undefined };
}
