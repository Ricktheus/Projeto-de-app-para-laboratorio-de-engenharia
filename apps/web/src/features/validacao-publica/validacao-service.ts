import { validarLaudoResponseSchema, type ValidarLaudoResponse } from '@concreto/shared';

import { env } from '../../lib/env';

/**
 * Result of a public validation lookup (F-S009-2 / US19). The 404/429 responses
 * are NOT thrown — they are legitimate outcomes the page renders with the exact
 * SPEC copy, so they are modeled as discriminated states instead of errors.
 */
export type ValidacaoResultado =
  | { status: 'encontrado'; laudo: ValidarLaudoResponse }
  | { status: 'nao_encontrado' }
  | { status: 'rate_limit' }
  | { status: 'erro' };

/**
 * Calls the PUBLIC `validar-laudo` endpoint (GET, no login). Sends only the anon
 * apikey — the visitor is unauthenticated. Never exposes evidence photos; the
 * function returns only the whitelisted fields (SPEC §5.5).
 */
export async function validarLaudoPublico(codigo: string): Promise<ValidacaoResultado> {
  const url = `${env.supabaseUrl.replace(/\/+$/, '')}/functions/v1/validar-laudo?codigo=${encodeURIComponent(
    codigo,
  )}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { apikey: env.supabaseAnonKey },
    });

    if (response.status === 404) {
      return { status: 'nao_encontrado' };
    }
    if (response.status === 429) {
      return { status: 'rate_limit' };
    }
    if (!response.ok) {
      return { status: 'erro' };
    }

    const parsed = validarLaudoResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      return { status: 'erro' };
    }
    return { status: 'encontrado', laudo: parsed.data };
  } catch {
    // Network / relay failure.
    return { status: 'erro' };
  }
}
