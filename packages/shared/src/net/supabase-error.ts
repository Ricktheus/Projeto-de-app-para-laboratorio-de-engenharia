/**
 * Maps a Supabase / PostgREST error to the exact Portuguese message the UI must
 * show (SPEC §3.0 catalog + S004 feature copy). Both apps route write failures
 * through here so the copy and the HTTP-status mapping never drift (DRY / SOLID:
 * the presentation rule lives once, in the domain package).
 *
 * The input is typed against a minimal structural shape rather than the
 * supabase-js `PostgrestError`, so `packages/shared` stays free of a runtime
 * dependency on supabase-js.
 */
import { MESSAGES, messageForHttpStatus } from '../messages/messages';

/** The subset of a Supabase/PostgREST error this mapper reads. */
export interface SupabaseErrorLike {
  /** Postgres SQLSTATE or PostgREST code (e.g. '23505', '42501', 'PGRST116'). */
  readonly code?: string | null;
  /** Free-text message; may carry the violated constraint name. */
  readonly message?: string | null;
  /** Postgres error detail. */
  readonly details?: string | null;
  /** HTTP status, when the caller captured it. */
  readonly status?: number | null;
}

/** Postgres unique-violation SQLSTATE. */
const UNIQUE_VIOLATION = '23505';
/** Postgres insufficient-privilege SQLSTATE (RLS WITH CHECK denial). */
const INSUFFICIENT_PRIVILEGE = '42501';
/** The UNIQUE(cliente_id, sigla) constraint on `obras` (SPEC §4.2). */
const OBRA_SIGLA_CONSTRAINT = 'uq_obra_sigla_por_cliente';

function mentionsObraSigla(error: SupabaseErrorLike): boolean {
  const haystack = `${error.message ?? ''} ${error.details ?? ''}`;
  return haystack.includes(OBRA_SIGLA_CONSTRAINT) || haystack.includes('sigla');
}

/**
 * Resolves the user-facing message for a failed Supabase call.
 *
 * Precedence:
 *  1. `obras` sigla unique-violation ⇒ "Já existe uma obra com esta sigla…" (US20-CA3).
 *  2. Any other unique-violation ⇒ generic 409 conflict copy.
 *  3. RLS/permission denial (42501) ⇒ 403 "Você não tem permissão…".
 *  4. Explicit HTTP status ⇒ §3.0 status table.
 *  5. Fallback ⇒ generic server error.
 */
export function messageForSupabaseError(error: SupabaseErrorLike): string {
  const code = error.code ?? undefined;

  if (code === UNIQUE_VIOLATION) {
    return mentionsObraSigla(error)
      ? MESSAGES.feature.obraSiglaDuplicada
      : MESSAGES.http.conflict;
  }
  if (code === INSUFFICIENT_PRIVILEGE) {
    return MESSAGES.http.forbidden;
  }
  if (typeof error.status === 'number' && error.status > 0) {
    return messageForHttpStatus(error.status);
  }
  return MESSAGES.http.serverError;
}

/** `true` when the error is the `obras` sigla-per-client unique violation. */
export function isObraSiglaConflict(error: SupabaseErrorLike): boolean {
  return error.code === UNIQUE_VIOLATION && mentionsObraSigla(error);
}
