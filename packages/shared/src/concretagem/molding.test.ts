import { describe, expect, it } from 'vitest';

import {
  MANDATORY_28D_COUNT,
  MOLDING_SHORTCUTS,
  buildCpPlan,
  expandMoldingConfig,
  selectMandatory28d,
  slumpCmToMm,
} from './molding';

describe('expandMoldingConfig', () => {
  it('expands each item into `quantidade` ages, preserving order', () => {
    expect(
      expandMoldingConfig([
        { idadeAlvoDias: 7, quantidade: 2 },
        { idadeAlvoDias: 28, quantidade: 2 },
      ]),
    ).toEqual([7, 7, 28, 28]);
  });

  it('supports fully free configuration (any count and ages)', () => {
    expect(
      expandMoldingConfig([
        { idadeAlvoDias: 3, quantidade: 1 },
        { idadeAlvoDias: 63, quantidade: 3 },
      ]),
    ).toEqual([3, 63, 63, 63]);
  });

  it.each([
    [{ idadeAlvoDias: 0, quantidade: 1 }],
    [{ idadeAlvoDias: 7.5, quantidade: 1 }],
    [{ idadeAlvoDias: 7, quantidade: 0 }],
    [{ idadeAlvoDias: 7, quantidade: 1.5 }],
  ])('rejects invalid config %o', (item) => {
    expect(() => expandMoldingConfig([item])).toThrow(RangeError);
  });
});

describe('selectMandatory28d', () => {
  it('marks the 2 specimens of the highest target ages', () => {
    // ages [7,7,14,28] → the 28 and the 14 are the two oldest.
    expect(selectMandatory28d([7, 7, 14, 28])).toEqual([false, false, true, true]);
  });

  it('picks two among equal highest ages, by original order', () => {
    expect(selectMandatory28d([28, 28, 28])).toEqual([true, true, false]);
  });

  it('marks all when there are fewer than the mandatory count', () => {
    expect(selectMandatory28d([7])).toEqual([true]);
    expect(MANDATORY_28D_COUNT).toBe(2);
  });
});

describe('buildCpPlan', () => {
  it('computes planned rupture dates and mandatory flags', () => {
    const plan = buildCpPlan('2026-05-20', [
      { idadeAlvoDias: 7, quantidade: 2 },
      { idadeAlvoDias: 28, quantidade: 2 },
    ]);
    expect(plan).toEqual([
      { idadeAlvoDias: 7, dataRupturaPlanejada: '2026-05-27', mandatorio28d: false },
      { idadeAlvoDias: 7, dataRupturaPlanejada: '2026-05-27', mandatorio28d: false },
      { idadeAlvoDias: 28, dataRupturaPlanejada: '2026-06-17', mandatorio28d: true },
      { idadeAlvoDias: 28, dataRupturaPlanejada: '2026-06-17', mandatorio28d: true },
    ]);
  });
});

describe('slumpCmToMm', () => {
  it('multiplies centimetres by 10 (SPEC §4.2 stores mm)', () => {
    expect(slumpCmToMm(8)).toBe(80);
    expect(slumpCmToMm(10.5)).toBe(105);
  });
});

describe('MOLDING_SHORTCUTS', () => {
  const shortcut = (id: string) => {
    const found = MOLDING_SHORTCUTS.find((s) => s.id === id);
    if (!found) {
      throw new Error(`Atalho de moldagem ausente: ${id}`);
    }
    return found;
  };

  it('are optional presets that expand to valid age lists', () => {
    expect(expandMoldingConfig(shortcut('2x7_2x28').items)).toEqual([7, 7, 28, 28]);
    expect(expandMoldingConfig(shortcut('2x7_2x14_2x28').items)).toEqual([7, 7, 14, 14, 28, 28]);
  });
});
