/** A date accepted by the domain: an ISO date string ('YYYY-MM-DD') or a Date. */
export type DateInput = string | Date;

/** Parses a {@link DateInput} into a Date (copying, never mutating the input). */
export function toDate(value: DateInput): Date {
  return value instanceof Date ? new Date(value.getTime()) : new Date(value);
}

/**
 * Whole-day index in UTC (time-of-day floored), so two dates can be compared at
 * DAY granularity regardless of their time component or the runtime timezone.
 * Returns `NaN` for an unparseable date.
 */
export function toUtcDayNumber(value: DateInput): number {
  const date = toDate(value);
  const ms = date.getTime();
  if (Number.isNaN(ms)) {
    return Number.NaN;
  }
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000,
  );
}

/** Adds `days` to a date and returns the resulting whole-day index (UTC). */
export function addDaysUtcDayNumber(value: DateInput, days: number): number {
  return toUtcDayNumber(value) + days;
}

/**
 * Formats an ISO date ('YYYY-MM-DD', or a longer timestamp whose date portion
 * is read) as the Brazilian 'DD/MM/YYYY'. Parses the calendar parts directly so
 * the displayed day never shifts with the runtime timezone. Returns the empty
 * string for a missing/unparseable value. UI-facing helper (dates are shown in
 * pt-BR across the web panel and reports).
 */
export function formatIsoDateBr(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) {
    return '';
  }
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/**
 * Adds `days` to a date and formats the result as an ISO calendar date
 * ('YYYY-MM-DD') in UTC. Used to preview each CP's `data_ruptura_planejada`
 * (= data_moldagem + idade_alvo_dias) client-side; the authoritative value is
 * still computed server-side by the `criar_concretagem_com_cps` RPC (SPEC §4.6).
 * Returns the empty string for an unparseable date.
 */
export function addDaysIso(value: DateInput, days: number): string {
  const dayNumber = addDaysUtcDayNumber(value, days);
  if (Number.isNaN(dayNumber)) {
    return '';
  }
  return new Date(dayNumber * 86_400_000).toISOString().slice(0, 10);
}
