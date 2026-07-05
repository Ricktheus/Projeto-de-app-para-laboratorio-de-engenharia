import { describe, expect, it } from 'vitest';

import {
  classifyIdadesResultados,
  isIdadeExpurgada,
  type IdadeResultadoCp,
} from './idade-resultados';

describe('per-age result classification (F-S006-4, US10-CA3)', () => {
  const cps: IdadeResultadoCp[] = [
    // 7d: one broken, one discarded -> still has a valid result
    { idadeAlvoDias: 7, status: 'rompido' },
    { idadeAlvoDias: 7, status: 'descartado' },
    // 14d: all discarded/purged -> no valid result -> expurgada
    { idadeAlvoDias: 14, status: 'expurgado' },
    { idadeAlvoDias: 14, status: 'descartado' },
    // 28d: both broken -> valid
    { idadeAlvoDias: 28, status: 'rompido' },
    { idadeAlvoDias: 28, status: 'rompido' },
  ];

  it('flags an age as expurgada only when EVERY specimen is descartado/expurgado', () => {
    const classified = classifyIdadesResultados(cps);
    expect(classified.map((r) => [r.idadeAlvoDias, r.expurgada])).toEqual([
      [7, false],
      [14, true],
      [28, false],
    ]);
  });

  it('counts valid vs discarded/purged specimens per age and sorts ascending', () => {
    const classified = classifyIdadesResultados(cps);
    expect(classified[0]).toEqual({
      idadeAlvoDias: 7,
      total: 2,
      validos: 1,
      descartadosOuExpurgados: 1,
      expurgada: false,
    });
    expect(classified[1]).toEqual({
      idadeAlvoDias: 14,
      total: 2,
      validos: 0,
      descartadosOuExpurgados: 2,
      expurgada: true,
    });
  });

  it('isIdadeExpurgada answers per age (drives "laudo daquela idade não é emitido")', () => {
    expect(isIdadeExpurgada(cps, 14)).toBe(true);
    expect(isIdadeExpurgada(cps, 7)).toBe(false);
    expect(isIdadeExpurgada(cps, 28)).toBe(false);
    // Unknown age with no specimens is never "expurgada".
    expect(isIdadeExpurgada(cps, 63)).toBe(false);
  });
});
