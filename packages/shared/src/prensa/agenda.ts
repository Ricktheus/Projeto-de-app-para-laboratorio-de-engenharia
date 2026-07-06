import type { CpStatus } from '../enums';
import { toUtcDayNumber, type DateInput } from '../lib/date';

/**
 * A specimen-shaped row the press agenda needs to decide whether it is due for
 * rupture today (F-S006-1). Only the current status and the planned rupture date
 * matter — the same shape whatever the client/obra it belongs to.
 */
export interface RupturaCandidate {
  /** Current specimen status. */
  status: CpStatus;
  /** Planned rupture date (corpos_prova.data_ruptura_planejada). */
  dataRupturaPlanejada: DateInput;
}

/**
 * True when a specimen must appear on today's press list (F-S006-1, US07-CA1):
 * it is `coletado` AND its planned rupture date is today or earlier
 * (`data_ruptura_planejada ≤ hoje`). Specimens still curing (future date),
 * already `rompido`, or in any other state never appear. Comparison is done at
 * DAY granularity (timezone-independent). An unparseable date is treated as
 * "not due" (conservative: never surface a broken row).
 */
export function isRupturaDue(cp: RupturaCandidate, today: DateInput = new Date()): boolean {
  if (cp.status !== 'coletado') {
    return false;
  }
  const plannedDay = toUtcDayNumber(cp.dataRupturaPlanejada);
  const todayDay = toUtcDayNumber(today);
  if (Number.isNaN(plannedDay) || Number.isNaN(todayDay)) {
    return false;
  }
  return plannedDay <= todayDay;
}

/**
 * Filters the specimens due for rupture today (across ALL clients — the press
 * list of the day, US07-CA1) and orders them by planned rupture date ascending
 * so the most overdue specimens are handled first. Ties keep the input order
 * (Array.sort is stable). This is the single definition of "due for rupture"
 * (DRY); the mobile service applies it to the RLS-scoped rows the DB returns.
 */
export function selectRupturaAgenda<T extends RupturaCandidate>(
  cps: readonly T[],
  today: DateInput = new Date(),
): T[] {
  return cps
    .filter((cp) => isRupturaDue(cp, today))
    .sort(
      (a, b) => toUtcDayNumber(a.dataRupturaPlanejada) - toUtcDayNumber(b.dataRupturaPlanejada),
    );
}
