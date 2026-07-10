/**
 * OCR → concretagem-form derivation (US01 / US02-CA1). Pure functions the mobile
 * app uses to (a) prefill the form from the Edge Function response and (b) decide
 * which fields must be highlighted in yellow for manual review. Keeping this in
 * `packages/shared` means the "which fields need review" rule is defined once and
 * covered by tests (DRY).
 */
import type { OcrNotaFiscalResponse } from '../schemas/edge-functions.ts';

/** The five fields the OCR extracts from the NF (SPEC §5.1). */
export const OCR_FIELDS = [
  'nf_numero',
  'fck_projeto',
  'volume_m3',
  'concreteira',
  'data_concretagem',
] as const;
export type OcrField = (typeof OCR_FIELDS)[number];

/** The three fields that are mandatory to save the concretagem (US01-CA3). */
export const OCR_REQUIRED_FIELDS = ['nf_numero', 'fck_projeto', 'volume_m3'] as const;
export type OcrRequiredField = (typeof OCR_REQUIRED_FIELDS)[number];

/** One prefilled field: its extracted value plus whether it needs review. */
export interface OcrFormField {
  /** Extracted value, or `null` when the OCR did not read the field. */
  readonly value: string | number | null;
  /**
   * `true` when the field must be highlighted in yellow (US01-CA2): the OCR
   * returned it below the confidence threshold, OR it came back empty/missing.
   */
  readonly highlight: boolean;
}

export type OcrFormState = Readonly<Record<OcrField, OcrFormField>>;

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * Builds the initial form state from an OCR response. A field is highlighted
 * when it is listed in `lowConfidenceFields` OR when its value is empty/missing
 * — both cases require manual review before saving (US01-CA2).
 */
export function buildOcrFormState(response: OcrNotaFiscalResponse): OcrFormState {
  const lowConfidence = new Set(response.lowConfidenceFields);
  const fields = response.fields;

  const state = {} as Record<OcrField, OcrFormField>;
  for (const field of OCR_FIELDS) {
    const extracted = fields[field]?.value ?? null;
    state[field] = {
      value: extracted,
      highlight: isEmpty(extracted) || lowConfidence.has(field),
    };
  }
  return state;
}

/**
 * Applies a manual edit to a field: the manual value prevails and the field
 * loses its yellow highlight (US02-CA1). Returns a new state (never mutates).
 */
export function applyManualEdit(
  state: OcrFormState,
  field: OcrField,
  value: string | number | null,
): OcrFormState {
  return { ...state, [field]: { value, highlight: false } };
}

/**
 * Lists the required fields still empty at save time. A non-empty result must
 * BLOCK the save with the message "Preencha os campos obrigatórios destacados."
 * (US01-CA3) and keep those fields highlighted.
 */
export function missingRequiredFields(state: OcrFormState): OcrRequiredField[] {
  return OCR_REQUIRED_FIELDS.filter((field) => isEmpty(state[field].value));
}
