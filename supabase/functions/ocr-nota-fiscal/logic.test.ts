/**
 * Deno tests for the pure OCR logic (SPEC §7.2: "3 tentativas OK; 4ª ⇒ 429").
 * Run with: deno test supabase/functions/ocr-nota-fiscal/logic.test.ts
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import {
  assembleOcrResponse,
  DEFAULT_OCR_MAX_ATTEMPTS,
  shouldRejectForRateLimit,
} from './logic.ts';

Deno.test('rate limit: first 3 attempts pass, the 4th is rejected (US01-CA5)', () => {
  const max = DEFAULT_OCR_MAX_ATTEMPTS; // 3
  assertEquals(shouldRejectForRateLimit(0, max), false); // 1st
  assertEquals(shouldRejectForRateLimit(1, max), false); // 2nd
  assertEquals(shouldRejectForRateLimit(2, max), false); // 3rd
  assertEquals(shouldRejectForRateLimit(3, max), true); // 4th ⇒ 429
});

Deno.test('assembleOcrResponse flags low-confidence and missing fields', () => {
  const result = assembleOcrResponse(
    {
      nf_numero: { value: '123456', confidence: 0.98 },
      fck_projeto: { value: 30, confidence: 0.91 },
      volume_m3: { value: 8, confidence: 0.88 },
      concreteira: { value: 'Tarcal', confidence: 0.95 },
      data_concretagem: { value: '2026-05-20', confidence: 0.7 },
    },
    0.75,
  );
  assertEquals(result.fields.nf_numero, { value: '123456', confidence: 0.98 });
  // data_concretagem is below 0.75 ⇒ listed for review.
  assertEquals(result.lowConfidenceFields, ['data_concretagem']);
});

Deno.test('assembleOcrResponse coerces numbers and drops unreadable fields', () => {
  const result = assembleOcrResponse(
    {
      nf_numero: { value: '999', confidence: 0.99 },
      fck_projeto: { value: '25,0', confidence: 0.9 }, // comma decimal
      volume_m3: { value: null, confidence: 0 }, // unreadable
    },
    0.75,
  );
  assertEquals(result.fields.fck_projeto?.value, 25);
  // volume_m3 (missing) + concreteira + data_concretagem (absent) all need review.
  assertEquals(result.lowConfidenceFields.includes('volume_m3'), true);
  assertEquals(result.lowConfidenceFields.includes('concreteira'), true);
});
