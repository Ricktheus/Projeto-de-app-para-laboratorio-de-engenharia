import { describe, expect, it } from 'vitest';

import type { OcrNotaFiscalResponse } from '../schemas/edge-functions';

import { applyManualEdit, buildOcrFormState, missingRequiredFields } from './ocr-form';

const fullResponse: OcrNotaFiscalResponse = {
  fields: {
    nf_numero: { value: '123456', confidence: 0.98 },
    fck_projeto: { value: 30, confidence: 0.91 },
    volume_m3: { value: 8, confidence: 0.88 },
    concreteira: { value: 'Tarcal', confidence: 0.95 },
    data_concretagem: { value: '2026-05-20', confidence: 0.7 },
  },
  lowConfidenceFields: ['data_concretagem'],
};

describe('buildOcrFormState', () => {
  it('prefills values and highlights only low-confidence fields (US01-CA2)', () => {
    const state = buildOcrFormState(fullResponse);
    expect(state.nf_numero).toEqual({ value: '123456', highlight: false });
    expect(state.data_concretagem).toEqual({ value: '2026-05-20', highlight: true });
  });

  it('highlights fields the OCR did not read (empty/missing)', () => {
    const state = buildOcrFormState({
      fields: { nf_numero: { value: '999', confidence: 0.99 } },
      lowConfidenceFields: [],
    });
    expect(state.nf_numero.highlight).toBe(false);
    expect(state.fck_projeto).toEqual({ value: null, highlight: true });
    expect(state.concreteira.highlight).toBe(true);
  });
});

describe('applyManualEdit', () => {
  it('lets the manual value prevail and clears the highlight (US02-CA1)', () => {
    const state = buildOcrFormState(fullResponse);
    const next = applyManualEdit(state, 'data_concretagem', '2026-05-21');
    expect(next.data_concretagem).toEqual({ value: '2026-05-21', highlight: false });
    // Original state is not mutated.
    expect(state.data_concretagem.highlight).toBe(true);
  });
});

describe('missingRequiredFields', () => {
  it('is empty when all required fields are filled', () => {
    expect(missingRequiredFields(buildOcrFormState(fullResponse))).toEqual([]);
  });

  it('lists required fields still empty at save time (US01-CA3)', () => {
    const state = buildOcrFormState({
      fields: { concreteira: { value: 'Tarcal', confidence: 0.99 } },
      lowConfidenceFields: [],
    });
    expect(missingRequiredFields(state)).toEqual(['nf_numero', 'fck_projeto', 'volume_m3']);
  });
});
