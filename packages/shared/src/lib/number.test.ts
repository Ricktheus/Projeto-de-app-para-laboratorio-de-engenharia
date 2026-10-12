import { describe, expect, it } from 'vitest';

import { formatDecimalBr, formatMpaBr, formatNumberBr } from './number';

describe('pt-BR number formatting', () => {
  it('uses the decimal comma with fixed decimals for MPa', () => {
    expect(formatMpaBr(27.44)).toBe('27,44');
    expect(formatMpaBr(32.1)).toBe('32,10');
    expect(formatDecimalBr(30, 1)).toBe('30,0');
  });

  it('groups thousands with a dot and trims trailing zeros', () => {
    expect(formatNumberBr(21977)).toBe('21.977');
    expect(formatNumberBr(6.5)).toBe('6,5');
    expect(formatNumberBr(43.5)).toBe('43,5');
  });

  it('renders missing values as an em dash', () => {
    expect(formatMpaBr(null)).toBe('—');
    expect(formatNumberBr(undefined)).toBe('—');
    expect(formatDecimalBr(Number.NaN)).toBe('—');
  });
});
