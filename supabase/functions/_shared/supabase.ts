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

/** Reads a user's role via the service client (bypasses RLS), or null. */
export async function getUserRole(service: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await service.from('usuarios').select('role').eq('id', userId).maybeSingle();
  return (data as { role?: string } | null)?.role ?? null;
}

/** Whether the user is one of the two engineering roles (eng_lab / eng_escritorio). */
export async function isEngineer(service: SupabaseClient, userId: string): Promise<boolean> {
  const role = await getUserRole(service, userId);
  return role === 'eng_lab' || role === 'eng_escritorio';
}

/** Whether the user is an admin (the two partner engineers, `is_admin = true`). */
export async function isAdmin(service: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await service.from('usuarios').select('is_admin').eq('id', userId).maybeSingle();
  return (data as { is_admin?: boolean } | null)?.is_admin === true;
}
