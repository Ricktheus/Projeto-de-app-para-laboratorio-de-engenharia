import { describe, expect, it } from 'vitest';

import {
  countConcretagensSemColeta,
  countPeriod,
  selectProximosRompimentos,
  startOfUtcWeekDayNumber,
  type CpColetaRow,
} from './metrics';

describe('dashboard metrics (F-S010-1)', () => {
  // 2026-06-17 is a Wednesday → the week runs Mon 2026-06-15 … Sun 2026-06-21.
  const TODAY = '2026-06-17';

  describe('startOfUtcWeekDayNumber', () => {
    it('returns the Monday of the week for any weekday', () => {
      const monday = new Date('2026-06-15T00:00:00Z').getTime() / 86_400_000;
      for (const iso of ['2026-06-15', '2026-06-17', '2026-06-21']) {
        const dayNum = new Date(`${iso}T00:00:00Z`).getTime() / 86_400_000;
        expect(startOfUtcWeekDayNumber(dayNum)).toBe(monday);
      }
    });
  });

  describe('countPeriod', () => {
    it('counts today and the current week (Monday→today), ignoring earlier/later', () => {
      const dates = [
        TODAY, // today   → hoje + semana
        TODAY, // today   → hoje + semana
        '2026-06-16', // Tue this week → semana only
        '2026-06-15', // Mon this week → semana only
        '2026-06-14', // Sun last week → neither
        '2026-06-21', // Sun (future)  → neither (after today)
      ];
      expect(countPeriod(dates, TODAY)).toEqual({ hoje: 2, semana: 4 });
    });

    it('ignores null/blank/unparseable dates', () => {
      expect(countPeriod([null, undefined, '', 'not-a-date', TODAY], TODAY)).toEqual({
        hoje: 1,
        semana: 1,
      });
    });

    it('reads the date portion of a timestamp (coletado_em is timestamptz)', () => {
      expect(countPeriod(['2026-06-17T13:45:00Z'], TODAY)).toEqual({ hoje: 1, semana: 1 });
    });

    it('is empty for no rows', () => {
      expect(countPeriod([], TODAY)).toEqual({ hoje: 0, semana: 0 });
    });
  });

  describe('countConcretagensSemColeta', () => {
    const NOW = '2026-06-17T12:00:00Z';
    const cps: CpColetaRow[] = [
      // Concretagem A: two specimens molded > 24h ago, still moldado → overdue (once).
      { concretagemId: 'A', status: 'moldado', moldedAt: '2026-06-15T10:00:00Z' },
      { concretagemId: 'A', status: 'moldado', moldedAt: '2026-06-15T10:00:00Z' },
      // Concretagem B: molded < 24h ago → not overdue.
      { concretagemId: 'B', status: 'moldado', moldedAt: '2026-06-17T06:00:00Z' },
      // Concretagem C: already collected → never overdue.
      { concretagemId: 'C', status: 'coletado', moldedAt: '2026-06-14T10:00:00Z' },
    ];

    it('counts DISTINCT concretagens with a specimen uncollected >24h', () => {
      expect(countConcretagensSemColeta(cps, NOW)).toBe(1);
    });

    it('is zero when nothing is overdue', () => {
      expect(countConcretagensSemColeta([cps[2]!, cps[3]!], NOW)).toBe(0);
    });
  });

  describe('selectProximosRompimentos', () => {
    const cps = [
      { id: '1', status: 'coletado' as const, dataRupturaPlanejada: '2026-06-20' },
      { id: '2', status: 'coletado' as const, dataRupturaPlanejada: '2026-06-17' }, // today
      { id: '3', status: 'coletado' as const, dataRupturaPlanejada: '2026-06-10' }, // past → out
      { id: '4', status: 'moldado' as const, dataRupturaPlanejada: '2026-06-18' }, // not collected
      { id: '5', status: 'coletado' as const, dataRupturaPlanejada: '2026-06-19' },
    ];

    it('returns collected, upcoming specimens soonest first', () => {
      expect(selectProximosRompimentos(cps, TODAY).map((c) => c.id)).toEqual(['2', '5', '1']);
    });

    it('honours the limit', () => {
      expect(selectProximosRompimentos(cps, TODAY, 1).map((c) => c.id)).toEqual(['2']);
    });

    it('is empty when nothing is scheduled ahead', () => {
      expect(selectProximosRompimentos([cps[2]!, cps[3]!], TODAY)).toEqual([]);
    });
  });
});
