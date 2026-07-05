import { describe, expect, it } from 'vitest';

import { isRupturaDue, selectRupturaAgenda, type RupturaCandidate } from './agenda';

const TODAY = '2026-07-05';

describe('press rupture agenda (F-S006-1)', () => {
  describe('isRupturaDue', () => {
    it('is due when coletado and planned rupture date is today or earlier (US07-CA1)', () => {
      expect(
        isRupturaDue({ status: 'coletado', dataRupturaPlanejada: '2026-07-05' }, TODAY),
      ).toBe(true);
      expect(
        isRupturaDue({ status: 'coletado', dataRupturaPlanejada: '2026-07-01' }, TODAY),
      ).toBe(true);
    });

    it('is NOT due while still curing (planned date in the future)', () => {
      expect(
        isRupturaDue({ status: 'coletado', dataRupturaPlanejada: '2026-07-06' }, TODAY),
      ).toBe(false);
    });

    it('is NOT due unless the specimen is coletado', () => {
      const planned = '2026-07-01';
      for (const status of ['moldado', 'rompido', 'descartado', 'expurgado'] as const) {
        expect(isRupturaDue({ status, dataRupturaPlanejada: planned }, TODAY)).toBe(false);
      }
    });

    it('treats an unparseable planned date as not due', () => {
      expect(isRupturaDue({ status: 'coletado', dataRupturaPlanejada: 'not-a-date' }, TODAY)).toBe(
        false,
      );
    });
  });

  describe('selectRupturaAgenda', () => {
    it('keeps only due specimens and orders them oldest planned date first', () => {
      const cps: (RupturaCandidate & { id: string })[] = [
        { id: 'today', status: 'coletado', dataRupturaPlanejada: '2026-07-05' },
        { id: 'future', status: 'coletado', dataRupturaPlanejada: '2026-07-10' },
        { id: 'overdue', status: 'coletado', dataRupturaPlanejada: '2026-07-01' },
        { id: 'moldado', status: 'moldado', dataRupturaPlanejada: '2026-06-30' },
      ];
      expect(selectRupturaAgenda(cps, TODAY).map((c) => c.id)).toEqual(['overdue', 'today']);
    });

    it('is empty when nothing is due (drives the Empty state)', () => {
      const cps: RupturaCandidate[] = [
        { status: 'coletado', dataRupturaPlanejada: '2026-08-01' },
        { status: 'rompido', dataRupturaPlanejada: '2026-06-01' },
      ];
      expect(selectRupturaAgenda(cps, TODAY)).toEqual([]);
    });
  });
});
