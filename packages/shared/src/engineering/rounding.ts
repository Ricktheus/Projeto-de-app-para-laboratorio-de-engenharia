/**
 * Domain rounding conventions (PRD §7.3), centralized so every layer rounds
 * identically — a legal report cannot tolerate divergent rounding.
 */

/** Rounds a resistance value to 2 decimal places (MPa). */
export function roundMpa(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Rounds a load value to a whole number (KGF is always an integer). */
export function roundKgf(value: number): number {
  return Math.round(value);
}
