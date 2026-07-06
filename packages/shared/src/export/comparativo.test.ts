import { describe, expect, it } from 'vitest';

import { buildComparativoConcreteira, type ComparativoInputRow } from './comparativo';

function row(
  concreteira: string | null,
  fck: number,
  idade: number,
  mpa: number | null,
): ComparativoInputRow {
  return { concreteira, fckProjeto: fck, idadeAlvoDias: idade, mpaCalculado: mpa };
}

describe('buildComparativoConcreteira', () => {
  it('groups by concreteira × fck × age and computes FCM/min/max/% (2/1 dp)', () => {
    const cmp = buildComparativoConcreteira([
      row('Tarcal', 30, 28, 31.0),
      row('Tarcal', 30, 28, 33.0), // FCM = 32.00 (mean), min 31, max 33
      row('Tarcal', 30, 7, 22.0),
    ]);

    expect(cmp.vazio).toBe(false);
    const c28 = cmp.linhas.find((l) => l.idadeDias === 28)!;
    expect(c28).toMatchObject({
      concreteira: 'Tarcal',
      fckAlvo: 30,
      idadeDias: 28,
      nCps: 2,
      fcmMpa: 32,
      mpaMin: 31,
      mpaMax: 33,
      atingiuFck: true,
    });
    expect(c28.percentualFck).toBeCloseTo(106.7, 1);
  });

  it('flags below-target FCM and sorts by concreteira, fck, age', () => {
    const cmp = buildComparativoConcreteira([
      row('Zeta', 25, 28, 20.0),
      row('Alfa', 30, 28, 31.0),
      row('Alfa', 20, 7, 15.0),
    ]);

    expect(cmp.linhas.map((l) => [l.concreteira, l.fckAlvo, l.idadeDias])).toEqual([
      ['Alfa', 20, 7],
      ['Alfa', 30, 28],
      ['Zeta', 25, 28],
    ]);
    expect(cmp.linhas.find((l) => l.concreteira === 'Zeta')!.atingiuFck).toBe(false);
  });

  it('ignores rows without a measured MPa and folds a missing concreteira into "—"', () => {
    const cmp = buildComparativoConcreteira([
      row(null, 30, 28, 30.0),
      row('  ', 30, 28, 32.0), // blank supplier → same "—" bucket
      row('X', 30, 28, null), // no MPa → dropped
    ]);

    expect(cmp.linhas).toHaveLength(1);
    expect(cmp.linhas[0]).toMatchObject({ concreteira: '—', nCps: 2, fcmMpa: 31 });
  });

  it('reports empty when no valid rows remain', () => {
    expect(buildComparativoConcreteira([row('X', 30, 28, null)]).vazio).toBe(true);
    expect(buildComparativoConcreteira([]).vazio).toBe(true);
  });
});
