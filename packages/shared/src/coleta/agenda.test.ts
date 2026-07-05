import { describe, expect, it } from 'vitest';

import {
  COLLECTION_WINDOW_HOURS,
  hoursElapsed,
  isCollectionDue,
  isLateCollection,
  selectCollectionAgenda,
} from './agenda';

const NOW = '2026-05-21T12:00:00.000Z';
const h = (hours: number) => new Date(Date.parse(NOW) - hours * 3_600_000).toISOString();

describe('COLLECTION_WINDOW_HOURS', () => {
  it('is the 24h field-curing limit', () => {
    expect(COLLECTION_WINDOW_HOURS).toBe(24);
  });
});

describe('hoursElapsed', () => {
  it('measures whole and fractional hours', () => {
    expect(hoursElapsed(h(24), NOW)).toBeCloseTo(24, 6);
    expect(hoursElapsed(h(1.5), NOW)).toBeCloseTo(1.5, 6);
  });

  it('returns NaN for an unparseable instant', () => {
    expect(Number.isNaN(hoursElapsed('not-a-date', NOW))).toBe(true);
  });
});

describe('isCollectionDue (F-S005-3, US05-CA1)', () => {
  it('shows a moldado CP that is >= 24h old', () => {
    expect(isCollectionDue({ status: 'moldado', moldedAt: h(24) }, NOW)).toBe(true);
    expect(isCollectionDue({ status: 'moldado', moldedAt: h(30) }, NOW)).toBe(true);
  });

  it('hides a moldado CP younger than 24h', () => {
    expect(isCollectionDue({ status: 'moldado', moldedAt: h(23.9) }, NOW)).toBe(false);
    expect(isCollectionDue({ status: 'moldado', moldedAt: h(1) }, NOW)).toBe(false);
  });

  it('hides an already-collected CP even if old', () => {
    expect(isCollectionDue({ status: 'coletado', moldedAt: h(48) }, NOW)).toBe(false);
  });

  it('hides CPs in any other state', () => {
    for (const status of ['rompido', 'descartado', 'expurgado'] as const) {
      expect(isCollectionDue({ status, moldedAt: h(48) }, NOW)).toBe(false);
    }
  });
});

describe('selectCollectionAgenda', () => {
  it('keeps only due CPs and orders them oldest-first', () => {
    const rows = [
      { id: 'young', status: 'moldado' as const, moldedAt: h(2) },
      { id: 'old', status: 'moldado' as const, moldedAt: h(48) },
      { id: 'collected', status: 'coletado' as const, moldedAt: h(72) },
      { id: 'due', status: 'moldado' as const, moldedAt: h(25) },
    ];
    const agenda = selectCollectionAgenda(rows, NOW);
    expect(agenda.map((r) => r.id)).toEqual(['old', 'due']);
  });

  it('returns an empty list when nothing is due (drives the Empty state)', () => {
    const rows = [{ status: 'moldado' as const, moldedAt: h(3) }];
    expect(selectCollectionAgenda(rows, NOW)).toEqual([]);
  });
});

describe('isLateCollection (F-S005-3, US05-CA2 → coleta_atrasada)', () => {
  it('is true only when collected strictly after 24h', () => {
    expect(isLateCollection(h(48), NOW)).toBe(true); // molded 48h before "now"
  });

  it('is false at or under exactly 24h', () => {
    const molded = h(24); // exactly 24h before now
    expect(isLateCollection(molded, NOW)).toBe(false);
    expect(isLateCollection(h(10), NOW)).toBe(false);
  });
});
