/**
 * Pure OCR logic (no I/O) so it can be unit-tested without a DB or the OpenAI
 * API (SPEC §7.2 "OCR rate limit — Deno test"). The orchestrator (index.ts)
 * wires these decisions to Supabase and OpenAI.
 */
import { OCR_FIELDS, type OcrField, type OcrNotaFiscalResponse } from '@concreto/shared';

/** OCR request timeout (SPEC §5.1 / F-S004-4): 10 seconds. */
export const OCR_TIMEOUT_MS = 10_000;

/** Default max OCR attempts per concretagem when `app_settings` is unavailable. */
export const DEFAULT_OCR_MAX_ATTEMPTS = 3;

/** Default confidence threshold when `app_settings` is unavailable. */
export const DEFAULT_OCR_CONFIDENCE_MIN = 0.75;

/**
 * Rate-limit decision (SPEC §5.1): the Nth attempt is rejected once `attempts`
 * previously-recorded tries have reached `maxAttempts`. With max = 3, the 4th
 * attempt is rejected (US01-CA5).
 */
export function shouldRejectForRateLimit(attempts: number, maxAttempts: number): boolean {
  return attempts >= maxAttempts;
}

/** One raw field as returned by the vision model. */
export interface RawOcrField {
  value: unknown;
  confidence: unknown;
}
export type RawOcrFields = Partial<Record<OcrField, RawOcrField>>;

const NUMERIC_FIELDS = new Set<OcrField>(['fck_projeto', 'volume_m3']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function coerceValue(field: OcrField, value: unknown): string | number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (NUMERIC_FIELDS.has(field)) {
    const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (field === 'data_concretagem') {
    const s = String(value).trim();
    return ISO_DATE.test(s) ? s : null;
  }
  return String(value).trim();
}

function coerceConfidence(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.min(1, Math.max(0, n));
}

/**
 * Assembles the SPEC §5.1 response from the model's raw output. A field is
 * included in `fields` only when it coerces to a valid value; a field is listed
 * in `lowConfidenceFields` when it is empty/invalid OR its confidence is below
 * `minConfidence` (US01-CA2). The result matches `ocrNotaFiscalResponseSchema`.
 */
export function assembleOcrResponse(
  raw: RawOcrFields,
  minConfidence: number,
): OcrNotaFiscalResponse {
  const fields: OcrNotaFiscalResponse['fields'] = {};
  const lowConfidenceFields: string[] = [];

  for (const field of OCR_FIELDS) {
    const rawField = raw[field];
    const value = coerceValue(field, rawField?.value);
    const confidence = coerceConfidence(rawField?.confidence);

    if (value === null) {
      lowConfidenceFields.push(field);
      continue;
    }
    // Type is guaranteed by coerceValue: numeric fields are numbers, others strings.
    fields[field] = { value: value as never, confidence };
    if (confidence < minConfidence) {
      lowConfidenceFields.push(field);
    }
  }

  return { fields, lowConfidenceFields };
}
