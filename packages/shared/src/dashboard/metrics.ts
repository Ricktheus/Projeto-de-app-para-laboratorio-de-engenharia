/**
 * Operational-dashboard domain metrics (F-S010-1). Pure, time-injectable helpers
 * so the office home overview computes its counters from raw rows without any
 * date/timezone logic leaking into the web layer. The rules live here once
 * (DRY): the "collection overdue >24h" definition is reused from the collection
 * agenda (S005) — the very same rule the daily e-mail cron enforces server-side.
 */
import { isCollectionDue, type CollectionCandidate } from '../coleta/agenda.ts';
import { type CpStatus } from '../enums.ts';
import { toUtcDayNumber, type DateInput } from '../lib/date.ts';

/** Today + current-week counters for one operational metric. */
export interface PeriodCount {
  /** Records dated today. */
  hoje: number;
  /** Records dated within the current week (Monday → today, inclusive). */
  semana: number;
}

/**
 * Monday-based start (UTC day number) of the week containing `dayNumber`.
 * Day number 0 (1970-01-01) is a Thursday, so `(dayNumber + 4) mod 7` yields the
 * weekday with 0 = Sunday; the Monday offset is `(weekday + 6) mod 7`.
 */
export function startOfUtcWeekDayNumber(dayNumber: number): number {
  const weekday = (((dayNumber + 4) % 7) + 7) % 7; // 0 = Sunday … 6 = Saturday
  const mondayOffset = (weekday + 6) % 7; // days since Monday
  return dayNumber - mondayOffset;
}

/**
 * Counts how many of `dates` fall on **today** and within the **current week**
 * (Monday → today, inclusive). Blank/unparseable dates are ignored; future dates
 * (after today) are never counted — the counters track realized throughput.
 *
 * `[PREMISSA]` "Semana" is the current calendar week starting on Monday, compared
 * at UTC day granularity (consistent with the domain date lib). `hoje ≤ semana`
 * always holds by construction.
 */
export function countPeriod(
  dates: readonly (DateInput | null | undefined)[],
  today: DateInput = new Date(),
): PeriodCount {
  const todayNum = toUtcDayNumber(today);
  const weekStart = startOfUtcWeekDayNumber(todayNum);
  let hoje = 0;
  let semana = 0;
  for (const value of dates) {
    if (value == null) {
      continue;
    }
    const dayNum = toUtcDayNumber(value);
    if (Number.isNaN(dayNum)) {
      continue;
    }
    if (dayNum === todayNum) {
      hoje += 1;
    }
    if (dayNum >= weekStart && dayNum <= todayNum) {
      semana += 1;
    }
  }
  return { hoje, semana };
}

/** A specimen row carrying the concretagem it belongs to (overdue-collection card). */
export interface CpColetaRow extends CollectionCandidate {
  /** Owning concretagem id — the unit the card counts. */
  concretagemId: string;
}

/**
 * Number of DISTINCT concretagens with at least one specimen still uncollected
 * more than 24h after molding (F-S010-1). Reuses {@link isCollectionDue} so the
 * "overdue" threshold matches the collection agenda and the daily e-mail cron.
 */
export function countConcretagensSemColeta(
  cps: readonly CpColetaRow[],
  now: DateInput = new Date(),
): number {
  const pendentes = new Set<string>();
  for (const cp of cps) {
    if (isCollectionDue(cp, now)) {
      pendentes.add(cp.concretagemId);
    }
  }
  return pendentes.size;
}

/** A collected specimen scheduled for rupture (upcoming-ruptures card). */
export interface RompimentoProgramado {
  status: CpStatus;
  /** Planned rupture date (`corpos_prova.data_ruptura_planejada`). */
  dataRupturaPlanejada: DateInput;
}

/**
 * Upcoming scheduled ruptures (F-S010-1): specimens already `coletado` (in the
 * lab, curing) whose planned rupture date is today or later, soonest first,
 * capped at `limit`. Not-yet-collected specimens are excluded — they are not on
 * the press schedule.
 */
export function selectProximosRompimentos<T extends RompimentoProgramado>(
  cps: readonly T[],
  today: DateInput = new Date(),
  limit = 5,
): T[] {
  const todayNum = toUtcDayNumber(today);
  return cps
    .filter((cp) => cp.status === 'coletado' && toUtcDayNumber(cp.dataRupturaPlanejada) >= todayNum)
    .sort((a, b) => toUtcDayNumber(a.dataRupturaPlanejada) - toUtcDayNumber(b.dataRupturaPlanejada))
    .slice(0, limit);
}
