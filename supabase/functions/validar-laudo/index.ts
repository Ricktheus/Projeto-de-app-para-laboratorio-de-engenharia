/**
 * GET /functions/v1/validar-laudo?codigo=<codigo_verificacao> — PUBLIC, no JWT
 * (SPEC §5.5 / F-S009-2 / US19).
 *
 * The single anonymous, read-only surface: given a QR verification code it
 * returns the CURRENT version of the laudo (identity + MPa/FCM per age +
 * authenticity), never evidence photos or internal data. Uses service_role to
 * read across RLS but exposes only the whitelisted fields (data.ts).
 *
 * Sad path:
 *   404 LAUDO_NAO_ENCONTRADO — "Laudo não encontrado / não autêntico."
 *   429 (rate limit por IP)  — "Limite de tentativas atingido. Tente novamente mais tarde."
 *
 * Rate limit: `[PREMISSA]` 30 req/min/IP (SPEC §7.1), best-effort per-instance.
 */
import { FixedWindowRateLimiter, MESSAGES, validarLaudoQuerySchema } from '@concreto/shared';

import { errorResponse, handlePreflight, jsonResponse } from '../_shared/http.ts';
import { serviceClient } from '../_shared/supabase.ts';
import { loadValidacao } from './data.ts';

/** Per-instance IP limiter (SPEC §7.1: 30 req/min/IP). */
const ipLimiter = new FixedWindowRateLimiter();

/** Hardening headers for the anonymous surface (SPEC §7.1). */
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};

/** Best-effort client IP from the proxy headers (first hop of X-Forwarded-For). */
function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]!.trim();
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}

function withSecurity(response: Response): Response {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const preflight = handlePreflight(req);
  if (preflight) {
    return preflight;
  }

  if (req.method !== 'GET') {
    return withSecurity(errorResponse(405, 'METODO_INVALIDO', MESSAGES.http.serverError));
  }

  // ----- Rate limit per IP (429).
  if (!ipLimiter.hit(clientIp(req)).allowed) {
    return withSecurity(errorResponse(429, 'RATE_LIMIT', MESSAGES.http.rateLimit));
  }

  // ----- Read + validate the code from the query string.
  const url = new URL(req.url);
  const parsed = validarLaudoQuerySchema.safeParse({ codigo: url.searchParams.get('codigo') });
  if (!parsed.success) {
    return withSecurity(
      errorResponse(404, 'LAUDO_NAO_ENCONTRADO', MESSAGES.domain.LAUDO_NAO_ENCONTRADO),
    );
  }

  try {
    const result = await loadValidacao(serviceClient(), parsed.data.codigo);
    if (result.kind === 'not_found') {
      return withSecurity(
        errorResponse(404, 'LAUDO_NAO_ENCONTRADO', MESSAGES.domain.LAUDO_NAO_ENCONTRADO),
      );
    }
    return withSecurity(jsonResponse(result.body, 200));
  } catch (error) {
    console.error('[validar-laudo] falha inesperada:', error);
    return withSecurity(errorResponse(500, 'ERRO_INTERNO', MESSAGES.http.serverError));
  }
});
