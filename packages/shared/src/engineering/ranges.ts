/**
 * Engineering sanity ranges (PRD §7.4). These are NON-blocking guards: a value
 * outside its range raises a warning/confirmation in the UI but never stops the
 * record from being saved (the field decision belongs to the engineer/partner).
 *
 * Note: the official MPa calculation always uses the NOMINAL diameter, so a
 * typo in a MEASURED value does not corrupt the result — these ranges merely
 * protect the traceability record.
 */

/** How the UI should react when a value falls outside its range. */
export type RangeSeverity = 'aviso' | 'confirmacao';

export interface EngineeringRange {
  /** Inclusive lower bound of the expected range. */
  readonly min: number;
  /** Inclusive upper bound of the expected range. */
  readonly max: number;
  /** UI reaction when the value is out of range. */
  readonly severity: RangeSeverity;
  /** Portuguese advisory shown to the user when out of range. */
  readonly message: string;
}

/** The full §7.4 range table, keyed by domain field. */
export const ENGINEERING_RANGES = {
  slumpMedidoMm: {
    min: 0,
    max: 260,
    severity: 'aviso',
    message: 'Slump fora da faixa usual (0 a 260 mm). Confira o valor.',
  },
  fckProjetoMpa: {
    min: 10,
    max: 100,
    severity: 'aviso',
    message: 'FCK fora da faixa usual (10 a 100 MPa). Confira o valor.',
  },
  diametroMedidoMm: {
    min: 90,
    max: 160,
    severity: 'confirmacao',
    message: 'Confirme o diâmetro medido (esperado entre 90 e 160 mm). Possível erro de digitação.',
  },
  alturaMedidaMm: {
    min: 180,
    max: 320,
    severity: 'confirmacao',
    message: 'Confirme a altura medida (esperada entre 180 e 320 mm). Possível erro de digitação.',
  },
  cargaRupturaKgf: {
    min: 1000,
    max: 100000,
    severity: 'aviso',
    message: 'Carga fora da faixa típica (1.000 a 100.000 kgf). Você digitou em kN?',
  },
  volumeM3: {
    min: 0.1,
    max: 20,
    severity: 'aviso',
    message: 'Volume fora da faixa usual (0,1 a 20 m³). Confira o valor.',
  },
} as const satisfies Record<string, EngineeringRange>;

/** Names of the fields covered by {@link ENGINEERING_RANGES}. */
export type EngineeringRangeKey = keyof typeof ENGINEERING_RANGES;

export interface RangeCheckResult {
  /** `true` when the value is within the expected range. */
  ok: boolean;
  /** Present only when out of range. */
  severity?: RangeSeverity;
  /** Present only when out of range — Portuguese advisory for the UI. */
  message?: string;
}

/**
 * Checks a value against its expected engineering range. Never throws — returns
 * a result the UI turns into a non-blocking warning/confirmation.
 */
export function checkRange(key: EngineeringRangeKey, value: number): RangeCheckResult {
  const range = ENGINEERING_RANGES[key];
  if (value >= range.min && value <= range.max) {
    return { ok: true };
  }
  return { ok: false, severity: range.severity, message: range.message };
}

export interface SlumpToleranceInput {
  /** Measured slump (mm). */
  slumpMedidoMm: number;
  /** Design slump target (mm). */
  slumpProjetoMm: number;
  /** Allowed deviation around the target (mm). */
  slumpToleranciaMm: number;
}

/**
 * Validates the measured slump against the design slump ± tolerance (PRD §7.4 /
 * NBR NM 67). Out of tolerance is a non-blocking warning that also becomes a
 * textual caveat in the report.
 */
export function checkSlumpTolerance({
  slumpMedidoMm,
  slumpProjetoMm,
  slumpToleranciaMm,
}: SlumpToleranceInput): RangeCheckResult {
  const lower = slumpProjetoMm - slumpToleranciaMm;
  const upper = slumpProjetoMm + slumpToleranciaMm;
  if (slumpMedidoMm >= lower && slumpMedidoMm <= upper) {
    return { ok: true };
  }
  return {
    ok: false,
    severity: 'aviso',
    message: `Slump fora da tolerância de projeto (${lower} a ${upper} mm). Ressalva será incluída no laudo.`,
  };
}
