/**
 * Molding-configuration domain (US02-CA2 / F-S004-5). Turns the partner's
 * free-form CP configuration (quantity + target age of each specimen) into the
 * flat list of specimens the `criar_concretagem_com_cps` RPC persists, and
 * decides which specimens are the mandatory 28-day ones.
 *
 * This module is the SINGLE source of truth for those rules. The SQL RPC (SPEC
 * §4.6) mirrors the same "2 highest target ages ⇒ mandatorio_28d" rule server-
 * side (authoritative enforcement), exactly as `enums.ts` mirrors the SQL enums.
 * The UI uses these pure helpers to PREVIEW the plan before saving; it never
 * reimplements the rule.
 */
import { addDaysIso, type DateInput } from '../lib/date.ts';

/** One row of the molding configuration: N specimens sharing a target age. */
export interface MoldingConfigItem {
  /** Target age in days (3 | 7 | 14 | 28 | 63 | 91 …). Free, must be >= 1. */
  readonly idadeAlvoDias: number;
  /** How many specimens to mold at this age. Must be >= 1. */
  readonly quantidade: number;
}

/** A single planned specimen (one CP row to be created). */
export interface CpPlanEntry {
  /** Target age in days. */
  readonly idadeAlvoDias: number;
  /** Planned rupture date = data_moldagem + idade_alvo_dias (ISO 'YYYY-MM-DD'). */
  readonly dataRupturaPlanejada: string;
  /** `true` for the 2 specimens of the highest target ages (SPEC §4.6). */
  readonly mandatorio28d: boolean;
}

/** How many specimens the "2 CPs de maior idade-alvo" rule marks as mandatory. */
export const MANDATORY_28D_COUNT = 2;

/**
 * Expands a molding configuration into the flat list of target ages, one entry
 * per specimen (a row with `quantidade = 3` becomes three ages). Order is
 * preserved. Throws {@link RangeError} for a non-positive/non-integer age or
 * quantity so an invalid config never reaches the RPC.
 */
export function expandMoldingConfig(items: readonly MoldingConfigItem[]): number[] {
  const ages: number[] = [];
  for (const item of items) {
    if (!Number.isInteger(item.idadeAlvoDias) || item.idadeAlvoDias < 1) {
      throw new RangeError('idadeAlvoDias deve ser um inteiro maior ou igual a 1.');
    }
    if (!Number.isInteger(item.quantidade) || item.quantidade < 1) {
      throw new RangeError('quantidade deve ser um inteiro maior ou igual a 1.');
    }
    for (let i = 0; i < item.quantidade; i += 1) {
      ages.push(item.idadeAlvoDias);
    }
  }
  return ages;
}

/**
 * Selects which specimens are the mandatory 28-day ones: the (up to)
 * {@link MANDATORY_28D_COUNT} specimens with the HIGHEST target ages. Ties are
 * broken by original order. Returns a boolean per specimen, aligned to `ages`.
 *
 * With fewer than {@link MANDATORY_28D_COUNT} specimens, all of them are marked
 * (there is nothing older to prefer).
 */
export function selectMandatory28d(ages: readonly number[]): boolean[] {
  const flags = ages.map(() => false);
  const order = ages
    .map((idadeAlvoDias, index) => ({ idadeAlvoDias, index }))
    // Highest age first; stable on ties via the original index.
    .sort((a, b) => b.idadeAlvoDias - a.idadeAlvoDias || a.index - b.index);
  for (const { index } of order.slice(0, MANDATORY_28D_COUNT)) {
    flags[index] = true;
  }
  return flags;
}

/**
 * Builds the full CP plan from a molding configuration and the molding date:
 * one {@link CpPlanEntry} per specimen, each with its planned rupture date and
 * whether it is a mandatory 28-day specimen. Pure — used both to preview the
 * plan in the UI and to assemble the RPC payload.
 */
export function buildCpPlan(
  dataMoldagem: DateInput,
  items: readonly MoldingConfigItem[],
): CpPlanEntry[] {
  const ages = expandMoldingConfig(items);
  const mandatory = selectMandatory28d(ages);
  return ages.map((idadeAlvoDias, index) => ({
    idadeAlvoDias,
    dataRupturaPlanejada: addDaysIso(dataMoldagem, idadeAlvoDias),
    mandatorio28d: mandatory[index] === true,
  }));
}

/** Converts a slump reading in centimetres to millimetres (SPEC §4.2 stores mm). */
export function slumpCmToMm(valueCm: number): number {
  return valueCm * 10;
}

/** An optional quick-preset a partner can tap instead of configuring by hand. */
export interface MoldingShortcut {
  /** Stable id. */
  readonly id: string;
  /** Label shown on the button (e.g. "2×7d + 2×28d"). */
  readonly label: string;
  /** The configuration the shortcut expands to. */
  readonly items: readonly MoldingConfigItem[];
}

/**
 * OPTIONAL molding shortcuts (US02-CA2). None is mandatory: the partner may
 * ignore them and configure the specimen count/ages entirely by hand.
 */
export const MOLDING_SHORTCUTS: readonly MoldingShortcut[] = [
  {
    id: '2x7_2x28',
    label: '2×7d + 2×28d',
    items: [
      { idadeAlvoDias: 7, quantidade: 2 },
      { idadeAlvoDias: 28, quantidade: 2 },
    ],
  },
  {
    id: '2x7_2x14_2x28',
    label: '2×7d + 2×14d + 2×28d',
    items: [
      { idadeAlvoDias: 7, quantidade: 2 },
      { idadeAlvoDias: 14, quantidade: 2 },
      { idadeAlvoDias: 28, quantidade: 2 },
    ],
  },
] as const;
