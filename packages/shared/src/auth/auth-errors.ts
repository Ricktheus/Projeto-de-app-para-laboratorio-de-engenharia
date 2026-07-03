/**
 * Supabase Auth error → stable auth code mapping (F-S003-1 sad path).
 *
 * The UI never shows a raw Supabase/GoTrue message (SPEC §1.4). It maps the
 * error to one of these codes and resolves the exact Portuguese copy from the
 * `MESSAGES.auth` catalog. Security rule (US17-CA2): wrong e-mail and wrong
 * password collapse to the SAME generic message so the response never reveals
 * whether an e-mail exists.
 */

/** Stable, localized-later auth outcome codes. */
export type AuthErrorCode = 'invalidCredentials' | 'tooManyAttempts' | 'sessionExpired' | 'generic';

/**
 * Minimal structural shape of a Supabase Auth error. Declared locally so
 * `packages/shared` stays free of a `@supabase/supabase-js` dependency.
 */
export interface AuthErrorLike {
  message?: string;
  status?: number;
  code?: string;
}

/**
 * Maps a Supabase Auth error to a stable {@link AuthErrorCode}.
 *
 * - `429` (or a GoTrue rate-limit code) ⇒ `tooManyAttempts`.
 * - `401` ⇒ `sessionExpired` (session/JWT no longer valid).
 * - anything else on a sign-in attempt ⇒ `invalidCredentials` (never leaks
 *   whether the e-mail exists).
 */
export function mapSupabaseAuthError(error: AuthErrorLike | null | undefined): AuthErrorCode {
  if (!error) {
    return 'generic';
  }

  const status = error.status;
  const code = error.code?.toLowerCase() ?? '';

  if (status === 429 || code.includes('rate') || code.includes('over_')) {
    return 'tooManyAttempts';
  }
  if (status === 401) {
    return 'sessionExpired';
  }
  return 'invalidCredentials';
}
