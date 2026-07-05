import type { CpStatus } from '../enums';
import { toDate, type DateInput } from '../lib/date';

/**
 * Maximum time a specimen may stay in the field before it must be collected and
 * moved to wet curing at the lab (PRD §2.1 — the 24h bottleneck the MVP solves).
 */
export const COLLECTION_WINDOW_HOURS = 24;

const MS_PER_HOUR = 3_600_000;

/**
 * Hours elapsed from `from` to `to` (defaults to "now"). Returns `NaN` when
 * either instant is unparseable (callers treat `NaN` as "cannot decide").
 */
export function hoursElapsed(from: DateInput, to: DateInput = new Date()): number {
  const fromMs = toDate(from).getTime();
  const toMs = toDate(to).getTime();
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
    return Number.NaN;
  }
  return (toMs - fromMs) / MS_PER_HOUR;
}

/** A specimen-shaped row the collection agenda needs to make its decision. */
export interface CollectionCandidate {
  /** Current specimen status. */
  status: CpStatus;
  /**
   * Molding instant. [PREMISSA] Uses `corpos_prova.created_at` as the molding
   * time — the partner registers the concretagem in the field right after
   * molding, so it is the most precise "molded at" instant available.
   */
  moldedAt: DateInput;
}

/**
 * True when a specimen must appear on today's collection agenda (F-S005-3,
 * US05-CA1): still `moldado` AND molded **≥ 24h** ago. A specimen younger than
 * 24h, or already `coletado` (or in any other state), never appears.
 */
export function isCollectionDue(cp: CollectionCandidate, now: DateInput = new Date()): boolean {
  if (cp.status !== 'moldado') {
    return false;
  }
  const hours = hoursElapsed(cp.moldedAt, now);
  return !Number.isNaN(hours) && hours >= COLLECTION_WINDOW_HOURS;
}

/**
 * Filters the specimens due for collection and orders them oldest-first, so the
 * most overdue specimens are handled first on the agenda.
 */
export function selectCollectionAgenda<T extends CollectionCandidate>(
  cps: readonly T[],
  now: DateInput = new Date(),
): T[] {
  return cps
    .filter((cp) => isCollectionDue(cp, now))
    .sort((a, b) => toDate(a.moldedAt).getTime() - toDate(b.moldedAt).getTime());
}

/**
 * True when a collection happened **late** — strictly more than 24h after
 * molding (F-S005-3, US05-CA2). Drives the derived `coleta_atrasada` flag and
 * the automatic textual caveat in the laudo. This mirrors the server-side rule
 * inside the `coletar_cp` RPC so the definition of "late" lives once (DRY); the
 * RPC value is the authoritative one persisted on the row.
 */
export function isLateCollection(moldedAt: DateInput, collectedAt: DateInput): boolean {
  const hours = hoursElapsed(moldedAt, collectedAt);
  return !Number.isNaN(hours) && hours > COLLECTION_WINDOW_HOURS;
}
