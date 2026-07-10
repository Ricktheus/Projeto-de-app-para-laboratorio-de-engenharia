/**
 * fck verdict — an INDICATIVE, at-a-glance comparison of a rupture result
 * against the specified design strength (fck), for the press screen, the client
 * portal and the public validation page.
 *
 * ⚠️ This is a VISUAL aid, not a formal acceptance. The system does NOT perform
 * the statistical acceptance of NBR 12655 (the fck is a captured datum, PRD
 * §6.2); this helper only answers "is the strength at/above the specified fck?"
 * so the engineer can flag a possible reinforcement early — exactly the intent
 * of PRD §6.2 ("compara ao fck para sinalizar de imediato eventual necessidade
 * de reforço").
 *
 * For an EARLY age (a configured projection factor exists, e.g. 7/14d) the value
 * compared is the projected 28-day strength ({@link estimateF28}); for a final
 * age (no factor, e.g. 28/63d) the MEASURED strength is compared directly.
 */
import { DEFAULT_PROJECTION_FACTORS, type ProjectionFactorMap } from '../constants/projection.ts';

import { estimateF28 } from './projection.ts';
import { roundMpa } from './rounding.ts';

/** The indicative verdict of a result versus the specified fck. */
export type FckVeredito = 'conforme' | 'atencao' | 'abaixo' | 'indeterminado';

export interface FckVerdictInput {
  /** Measured strength at the specimen's age (MPa). */
  mpa: number | null | undefined;
  /** Age of the measurement, in days. */
  idadeDias: number;
  /** Specified design strength (fck) from the NF/project (MPa); `null` when unknown. */
  fckProjeto: number | null | undefined;
  /**
   * Age → projection-factor map. Defaults to {@link DEFAULT_PROJECTION_FACTORS}
   * (7d = 0.70, 14d = 0.90) — the same map used everywhere else.
   */
  fatores?: ProjectionFactorMap;
  /**
   * Width of the amber ("atenção") band just below fck, as a fraction of fck.
   * A value in `[fck·(1-margem), fck)` is `atencao`; below it is `abaixo`.
   * Default 0.05 (5%).
   */
  margem?: number;
}

export interface FckVerdictResult {
  veredito: FckVeredito;
  /**
   * The value compared against fck (MPa, 2 decimals): the measured strength at a
   * final age, or the estimated 28-day strength at an early age. `null` when the
   * verdict is `indeterminado`.
   */
  valorComparado: number | null;
  /** `true` when {@link valorComparado} is a projected 28-day strength (early age). */
  projetado: boolean;
  /** Echo of the fck used, or `null` when it was unknown. */
  fckProjeto: number | null;
}

/**
 * Classifies a rupture result against the specified fck. Never throws — an
 * unknown fck or a non-positive/absent MPa yields `indeterminado` so the UI can
 * simply omit the badge.
 */
export function fckVerdict({
  mpa,
  idadeDias,
  fckProjeto,
  fatores = DEFAULT_PROJECTION_FACTORS,
  margem = 0.05,
}: FckVerdictInput): FckVerdictResult {
  const fck = fckProjeto ?? null;
  if (mpa == null || !(mpa > 0) || fck === null || !(fck > 0)) {
    return { veredito: 'indeterminado', valorComparado: null, projetado: false, fckProjeto: fck };
  }

  // Early age with a configured factor ⇒ compare the PROJECTED 28d strength;
  // otherwise (final/target age) compare the MEASURED strength directly.
  const projected =
    fatores[idadeDias] !== undefined ? estimateF28({ fIdade: mpa, idadeDias, fatores }) : null;
  const projetado = projected !== null;
  const valorComparado = projetado ? projected : roundMpa(mpa);

  const veredito: FckVeredito =
    valorComparado >= fck
      ? 'conforme'
      : valorComparado >= fck * (1 - margem)
        ? 'atencao'
        : 'abaixo';

  return { veredito, valorComparado, projetado, fckProjeto: fck };
}

/** Short PT labels for each verdict (mobile + web share these). */
export const FCK_VEREDITO_LABELS: Readonly<Record<FckVeredito, string>> = {
  conforme: 'Conforme o fck',
  atencao: 'Atenção — próximo do fck',
  abaixo: 'Abaixo do fck — avaliar reforço',
  indeterminado: 'Sem fck para comparar',
};

/** Verdict → StatusPill tone, so the color reads identically on both apps. */
export const FCK_VEREDITO_TONES: Readonly<
  Record<FckVeredito, 'success' | 'warning' | 'danger' | 'neutral'>
> = {
  conforme: 'success',
  atencao: 'warning',
  abaixo: 'danger',
  indeterminado: 'neutral',
};
