import {
  DEFAULT_PROJECTION_FACTORS,
  DEFAULT_PROJECTION_FACTORS_LOW,
  type ProjectionFactorMap,
} from '../constants/projection.ts';
import { DomainError } from '../errors.ts';

import { roundMpa } from './rounding.ts';

export interface EstimateF28Input {
  /** Measured strength (MPa) at the early age. */
  fIdade: number;
  /** Curing age of that measurement, in days (e.g. 7 or 14). */
  idadeDias: number;
  /**
   * Age → factor map. Injected by the infra layer, which reads it from
   * `app_settings` (keys `projection_factor_7d`/`projection_factor_14d`).
   * Defaults to {@link DEFAULT_PROJECTION_FACTORS} (7d = 0.70, 14d = 0.90).
   */
  fatores?: ProjectionFactorMap;
}

/**
 * Estimates the 28-day strength from an early-age (7/14d) result:
 *
 * `f28 = fIdade / fator(idadeDias)`
 *
 * The factors are the same for every cement type (PRD §6.2). If the age has no
 * configured factor, the projection is intentionally NOT made and `null` is
 * returned (the caller must not project).
 *
 * @returns estimated 28-day strength (MPa, 2 decimals), or `null` when the age
 *   has no configured factor.
 * @throws {DomainError} `FATOR_PROJECAO_INVALIDO` when a configured factor is
 *   non-positive (misconfiguration).
 */
export function estimateF28({
  fIdade,
  idadeDias,
  fatores = DEFAULT_PROJECTION_FACTORS,
}: EstimateF28Input): number | null {
  const factor = fatores[idadeDias];
  if (factor === undefined) {
    return null;
  }
  if (!(factor > 0)) {
    throw new DomainError('FATOR_PROJECAO_INVALIDO');
  }

  return roundMpa(fIdade / factor);
}

/** An estimated 28-day strength range (both bounds in MPa, 2 decimals). */
export interface F28Range {
  /** Conservative bound — uses the higher (default) factor. */
  min: number;
  /** Optimistic bound — uses the lower factor. */
  max: number;
}

export interface EstimateF28RangeInput extends EstimateF28Input {
  /**
   * Lower-bound factors (7d = 0.65, 14d = 0.85 by default) used to compute the
   * optimistic end of the range.
   */
  fatoresLow?: ProjectionFactorMap;
}

/**
 * Optional variant of {@link estimateF28} that returns a projection RANGE
 * (min–max) using both the default and the lower-bound factors (PRD §6.2).
 *
 * @returns `{ min, max }`, or `null` when either factor is missing for the age.
 */
export function estimateF28Range({
  fIdade,
  idadeDias,
  fatores = DEFAULT_PROJECTION_FACTORS,
  fatoresLow = DEFAULT_PROJECTION_FACTORS_LOW,
}: EstimateF28RangeInput): F28Range | null {
  const min = estimateF28({ fIdade, idadeDias, fatores });
  const max = estimateF28({ fIdade, idadeDias, fatores: fatoresLow });
  if (min === null || max === null) {
    return null;
  }
  return { min, max };
}
