/**
 * POST /functions/v1/ocr-nota-fiscal (SPEC §5.1 / F-S004-4).
 *
 * Flow: auth → rate-limit (≤ 3 attempts per concretagem, `ocr_attempts`) →
 * GPT-4o-mini Vision (10s timeout) → assemble `{ fields, lowConfidenceFields }`
 * with the confidence threshold from `app_settings`. Errors use the exact §5.1
 * envelopes: 429 OCR_LIMITE, 504 OCR_TIMEOUT, 502 OCR_FALHA. The user ALWAYS
 * reviews the form before saving — this function only extracts.
 */
import {
  MESSAGES,
  ocrNotaFiscalRequestSchema,
  ocrNotaFiscalResponseSchema,
} from '@concreto/shared';

import { errorResponse, handlePreflight, jsonResponse } from '../_shared/http.ts';
import { resolveCaller, serviceClient } from '../_shared/supabase.ts';
import { extractFromImage, OcrProviderError, OcrTimeoutError } from './openai.ts';
import {
  assembleOcrResponse,
  DEFAULT_OCR_CONFIDENCE_MIN,
  DEFAULT_OCR_MAX_ATTEMPTS,
  shouldRejectForRateLimit,
} from './logic.ts';

/** Reads a numeric setting from `app_settings`, falling back to `fallback`. */
async function readNumberSetting(
  service: ReturnType<typeof serviceClient>,
  key: string,
  fallback: number,
): Promise<number> {
  const { data } = await service.from('app_settings').select('value').eq('key', key).maybeSingle();
  const n = Number(data?.value);
  return Number.isFinite(n) ? n : fallback;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const preflight = handlePreflight(req);
  if (preflight) {
    return preflight;
  }

  // ----- Auth (JWT required).
  const authHeader = req.headers.get('Authorization');
  const caller = await resolveCaller(authHeader);
  if (!caller) {
    return errorResponse(401, 'NAO_AUTENTICADO', MESSAGES.http.unauthorized);
  }

  // ----- Validate the request body.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, 'PAYLOAD_INVALIDO', MESSAGES.http.validation);
  }
  const parsed = ocrNotaFiscalRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, 'PAYLOAD_INVALIDO', MESSAGES.http.validation);
  }
  const { imageBase64, concretagemRef } = parsed.data;

  const service = serviceClient();

  // ----- Rate limit: max N attempts per concretagem (SPEC §5.1 / §7.1).
  const maxAttempts = await readNumberSetting(
    service,
    'ocr_max_attempts',
    DEFAULT_OCR_MAX_ATTEMPTS,
  );
  const { count } = await service
    .from('ocr_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('concretagem_ref', concretagemRef);

  if (shouldRejectForRateLimit(count ?? 0, maxAttempts)) {
    return errorResponse(429, 'OCR_LIMITE', MESSAGES.domain.OCR_LIMITE);
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    console.error('[ocr-nota-fiscal] OPENAI_API_KEY ausente');
    return errorResponse(502, 'OCR_FALHA', MESSAGES.domain.OCR_FALHA);
  }

  // ----- Call the vision model, recording the attempt either way.
  let success = false;
  try {
    const raw = await extractFromImage(imageBase64, apiKey);
    const minConfidence = await readNumberSetting(
      service,
      'ocr_confidence_min',
      DEFAULT_OCR_CONFIDENCE_MIN,
    );
    const response = ocrNotaFiscalResponseSchema.parse(assembleOcrResponse(raw, minConfidence));
    success = true;
    return jsonResponse(response, 200);
  } catch (error) {
    // US01-CA4: log the error; the client falls back to manual entry.
    console.error('[ocr-nota-fiscal] falha no OCR:', error);
    if (error instanceof OcrTimeoutError) {
      return errorResponse(504, 'OCR_TIMEOUT', MESSAGES.domain.OCR_TIMEOUT);
    }
    if (error instanceof OcrProviderError) {
      return errorResponse(502, 'OCR_FALHA', MESSAGES.domain.OCR_FALHA);
    }
    return errorResponse(502, 'OCR_FALHA', MESSAGES.domain.OCR_FALHA);
  } finally {
    await service
      .from('ocr_attempts')
      .insert({ concretagem_ref: concretagemRef, user_id: caller.id, success });
  }
});
