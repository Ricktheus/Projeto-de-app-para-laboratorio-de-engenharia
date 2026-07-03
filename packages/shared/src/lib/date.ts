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
