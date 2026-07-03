import { describe, expect, it } from 'vitest';

import { DomainError } from '../errors';

import { calcMpa, nominalAreaMm2 } from './mpa';

describe('calcMpa (F-S002-1)', () => {
  it('computes the nominal cross-section area of a 100 mm mold', () => {
    expect(nominalAreaMm2(100)).toBeCloseTo(7853.98, 2);
  });

  it.each([
    { cargaKgf: 21977, expected: 27.44 },
    { cargaKgf: 24194, expected: 30.21 },
    { cargaKgf: 20045, expected: 25.03 },
    { cargaKgf: 23562, expected: 29.42 },
  ])('converts $cargaKgf kgf (100×200 mold) to $expected MPa', ({ cargaKgf, expected }) => {
    expect(calcMpa({ cargaKgf, dNominalMm: 100 })).toBe(expected);
  });

  it('uses the NOMINAL diameter (150 mold => larger area => lower MPa)', () => {
    const mpa100 = calcMpa({ cargaKgf: 23562, dNominalMm: 100 });
    const mpa150 = calcMpa({ cargaKgf: 23562, dNominalMm: 150 });
    expect(mpa150).toBeLessThan(mpa100);
    // area scales with d^2 => 150 area is 2.25× the 100 area.
    expect(mpa150).toBeCloseTo((23562 * 9.80665) / ((Math.PI * 150 ** 2) / 4), 2);
  });

  it('rounds MPa to exactly 2 decimal places', () => {
    const mpa = calcMpa({ cargaKgf: 21977, dNominalMm: 100 });
    expect(Number.isInteger(mpa * 100)).toBe(true);
  });

  it('treats the load as an integer (kgf is whole)', () => {
    expect(calcMpa({ cargaKgf: 21977.4, dNominalMm: 100 })).toBe(
      calcMpa({ cargaKgf: 21977, dNominalMm: 100 }),
    );
  });

  it('throws DomainError(CARGA_INVALIDA) when the load is <= 0', () => {
    expect(() => calcMpa({ cargaKgf: 0, dNominalMm: 100 })).toThrow(DomainError);
    try {
      calcMpa({ cargaKgf: -1, dNominalMm: 100 });
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe('CARGA_INVALIDA');
    }
  });

  it('throws DomainError(DIAMETRO_INVALIDO) when the diameter is <= 0', () => {
    try {
      calcMpa({ cargaKgf: 21977, dNominalMm: 0 });
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe('DIAMETRO_INVALIDO');
    }
  });
});
