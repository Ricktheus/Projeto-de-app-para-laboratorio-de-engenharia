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
 * Progressive input mask for a Brazilian date: keeps up to 8 typed digits and
 * groups them as 'DD/MM/AAAA', inserting the slashes as the user types. Used by
 * the mobile date field so the operator never types an ISO string by hand.
 */
export function maskBrDate(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(
    (part) => part.length > 0,
  );
  return parts.join('/');
}

/**
 * Parses a Brazilian 'DD/MM/AAAA' date into an ISO calendar date ('YYYY-MM-DD'),
 * or returns `null` when the string is incomplete or not a real calendar date
 * (e.g. 31/02/2026). Storage stays ISO (SPEC §4.2); the BR form is display-only.
 */
export function brDateToIso(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Reject overflow dates (e.g. 31/02 rolls into March) by round-tripping.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${yyyy}-${mm}-${dd}`;
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
