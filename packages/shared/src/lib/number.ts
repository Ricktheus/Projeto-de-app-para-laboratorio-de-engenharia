/**
 * pt-BR number formatting for display surfaces (plan §6.4: decimal comma,
 * thousands dot, tabular figures). Display only — persisted and computed values
 * stay plain numbers; nothing here rounds a value that feeds a calculation.
 */

const cache = new Map<string, Intl.NumberFormat>();

function formatter(min: number, max: number): Intl.NumberFormat {
  const key = `${min}:${max}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max });
    cache.set(key, f);
  }
  return f;
}

/** Placeholder for a missing value. */
export const EMPTY_VALUE = '—';

/**
 * Formats a number with a fixed number of decimals in pt-BR
 * (`27.44 → "27,44"`, `32.1 → "32,10"`). `null`/non-finite → "—".
 */
export function formatDecimalBr(value: number | null | undefined, decimals = 2): string {
  if (value == null || !Number.isFinite(value)) {
    return EMPTY_VALUE;
  }
  return formatter(decimals, decimals).format(value);
}

/** MPa as shown to people: always 2 decimals (`27,44`). */
export function formatMpaBr(value: number | null | undefined): string {
  return formatDecimalBr(value, 2);
}

/**
 * Integer/variable-precision quantity with thousands dot
 * (`21977 → "21.977"`, `6.5 → "6,5"`), up to `maxDecimals` decimals.
 */
export function formatNumberBr(value: number | null | undefined, maxDecimals = 2): string {
  if (value == null || !Number.isFinite(value)) {
    return EMPTY_VALUE;
  }
  return formatter(0, maxDecimals).format(value);
}
