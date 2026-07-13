import { supabase } from '../../services/supabase';

/**
 * Password-recovery Supabase calls, kept out of the page for the same reason as
 * {@link ./auth-service} — the UI never touches the client directly and the flow
 * stays unit-testable by mocking this module.
 *
 * The web client is configured with the implicit flow and `detectSessionInUrl:
 * false` (see packages/supabase), so the recovery token arrives in the URL hash
 * (`#access_token=...&refresh_token=...&type=recovery`) and is NOT auto-consumed.
 * We parse it here and establish the short-lived recovery session by hand.
 */
export type RecoveryInit = 'ready' | 'error' | 'none';

/**
 * Reads the recovery token from the given URL hash and, when present, sets the
 * recovery session so {@link updatePassword} can change the password.
 * - `ready`: a recovery session is active;
 * - `error`: the link carried an error (expired/used) or the session failed;
 * - `none`: no recovery token — the caller should offer to request a new link.
 *
 * The hash is passed in (captured synchronously by the caller) so stripping it
 * from the address bar can happen before this async work runs.
 */
export async function establishRecoverySession(hash: string): Promise<RecoveryInit> {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(raw);

  // Supabase redirects an expired/used link back with `error`/`error_code`.
  if (params.get('error') || params.get('error_code')) {
    return 'error';
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (params.get('type') !== 'recovery' || !accessToken || !refreshToken) {
    return 'none';
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return error ? 'error' : 'ready';
}

/**
 * Sends the recovery e-mail. The link returns the user to
 * `${origin}/reset-password`. Callers must NOT reveal whether the address
 * exists (US17-CA2), so the UI always shows the same confirmation.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

/**
 * Sets the new password on the active recovery session, then signs out so the
 * user re-authenticates with the new credentials. Throws on failure (expired
 * link or a password that violates the project's policy).
 */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    throw error;
  }
  await supabase.auth.signOut();
}
