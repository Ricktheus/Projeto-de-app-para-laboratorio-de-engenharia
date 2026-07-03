import { describe, expect, it } from 'vitest';

import { DEFAULT_PROJECTION_FACTORS } from '../constants/projection';
import { DomainError } from '../errors';

import { estimateF28, estimateF28Range } from './projection';

describe('estimateF28 (F-S002-2)', () => {
  it('projects 28d from a 7d result using the default 0.70 factor', () => {
    expect(estimateF28({ fIdade: 21, idadeDias: 7 })).toBe(30);
  });

  it('projects 28d from a 14d result using the default 0.90 factor', () => {
    expect(estimateF28({ fIdade: 27, idadeDias: 14 })).toBe(30);
  });

  it('reads the factor from an injected map (as read from app_settings)', () => {
    const fatores = { 7: 0.68, 14: 0.9 };
    expect(estimateF28({ fIdade: 20.4, idadeDias: 7, fatores })).toBe(30);
    // The injected value overrides the default.
    expect(estimateF28({ fIdade: 20.4, idadeDias: 7 })).not.toBe(30);
  });

  it('returns null for an age without a configured factor (does not project)', () => {
    expect(estimateF28({ fIdade: 25, idadeDias: 28 })).toBeNull();
    expect(estimateF28({ fIdade: 25, idadeDias: 3 })).toBeNull();
  });

  it('exposes the canonical defaults (7d = 0.70, 14d = 0.90)', () => {
    expect(DEFAULT_PROJECTION_FACTORS[7]).toBe(0.7);
    expect(DEFAULT_PROJECTION_FACTORS[14]).toBe(0.9);
  });

  it('throws when a configured factor is non-positive', () => {
    try {
      estimateF28({ fIdade: 21, idadeDias: 7, fatores: { 7: 0 } });
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe('FATOR_PROJECAO_INVALIDO');
    }
  });

  describe('estimateF28Range', () => {
    it('returns a min–max range (default vs lower-bound factors)', () => {
      const range = estimateF28Range({ fIdade: 21, idadeDias: 7 });
      expect(range).not.toBeNull();
      // min uses 0.70 (conservative), max uses 0.65 (optimistic).
      expect(range).toEqual({ min: 30, max: 32.31 });
    });

    it('returns null when the age has no factor', () => {
      expect(estimateF28Range({ fIdade: 25, idadeDias: 28 })).toBeNull();
    });
  });
});
