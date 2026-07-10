import { DomainError } from '../errors.ts';

import { roundKgf, roundMpa } from './rounding.ts';

/** kgf → newton conversion constant (standard gravity, exact). */
export const KGF_TO_NEWTON = 9.80665;

export interface CalcMpaInput {
  /** Rupture load in kilogram-force (kgf). Stored/recorded as a whole number. */
  cargaKgf: number;
  /**
   * NOMINAL mold diameter in millimetres (e.g. 100 for 100×200, 150 for
   * 150×300). This is the basis of the official area — NEVER the measured
   * diameter (PRD §7.1).
   */
  dNominalMm: number;
}

/**
 * Cross-section area (mm²) of a cylindrical specimen from its nominal diameter.
 *
 * `area = π × d² / 4`
 */
export function nominalAreaMm2(dNominalMm: number): number {
  if (!(dNominalMm > 0)) {
    throw new DomainError('DIAMETRO_INVALIDO');
  }
  return (Math.PI * dNominalMm ** 2) / 4;
}

/**
 * Converts a rupture load (kgf) into compressive strength (MPa) using the
 * NOMINAL specimen diameter — the official formula validated against the
 * reference report (PRD §7.1):
 *
 * `MPa = (cargaKgf × 9.80665) / (π × dNominalMm² / 4)`
 *
 * The load is treated as an integer (KGF is whole) and the result is rounded to
 * 2 decimal places (PRD §7.3).
 *
 * @throws {DomainError} `CARGA_INVALIDA` when `cargaKgf <= 0`.
 * @throws {DomainError} `DIAMETRO_INVALIDO` when `dNominalMm <= 0`.
 */
export function calcMpa({ cargaKgf, dNominalMm }: CalcMpaInput): number {
  if (!(cargaKgf > 0)) {
    throw new DomainError('CARGA_INVALIDA');
  }
  if (!(dNominalMm > 0)) {
    throw new DomainError('DIAMETRO_INVALIDO');
  }

  const cargaN = roundKgf(cargaKgf) * KGF_TO_NEWTON;
  const areaMm2 = nominalAreaMm2(dNominalMm);

  return roundMpa(cargaN / areaMm2);
}
