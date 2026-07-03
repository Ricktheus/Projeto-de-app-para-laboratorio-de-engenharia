/**
 * Fixed percentage factors used to project the 7/14-day strength to the
 * estimated 28-day strength (`f28 = fIdade / fator(idade)`), per PRD §6.2.
 *
 * The factors are the SAME for every cement type (the lab uses varied cements
 * but the same percentages). They are seeded into `app_settings` so they can be
 * tuned without a deploy; these constants are the canonical defaults and MUST
 * match the seed values in `supabase/migrations/0006_seed.sql`.
 */

/** Maps a curing age (in days) to its projection factor. */
export type ProjectionFactorMap = Readonly<Record<number, number>>;

/**
 * Default factors — upper bound of each range (7d ≈ 70%, 14d ≈ 90%). Using the
 * upper bound yields a more conservative (lower) estimated f28, which flags the
 * need for reinforcement earlier.
 */
export const DEFAULT_PROJECTION_FACTORS: ProjectionFactorMap = { 7: 0.7, 14: 0.9 };

/**
 * Lower-bound factors (7d ≈ 65%, 14d ≈ 85%). Optional — used to display a
 * projection RANGE (min–max) alongside the conservative point estimate.
 */
export const DEFAULT_PROJECTION_FACTORS_LOW: ProjectionFactorMap = { 7: 0.65, 14: 0.85 };
