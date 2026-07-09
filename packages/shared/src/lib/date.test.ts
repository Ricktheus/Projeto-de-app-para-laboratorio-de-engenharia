import { describe, expect, it } from 'vitest';

import { brDateToIso, formatIsoDateBr, maskBrDate } from './date';

describe('maskBrDate', () => {
  it('groups digits progressively as DD/MM/AAAA', () => {
    expect(maskBrDate('0')).toBe('0');
    expect(maskBrDate('08')).toBe('08');
    expect(maskBrDate('0807')).toBe('08/07');
    expect(maskBrDate('08072026')).toBe('08/07/2026');
  });

  it('strips non-digits and caps at 8 digits', () => {
    expect(maskBrDate('08/07/2026')).toBe('08/07/2026');
    expect(maskBrDate('080720261234')).toBe('08/07/2026');
    expect(maskBrDate('ab08cd')).toBe('08');
  });
});

describe('brDateToIso', () => {
  it('converts a valid BR date to ISO', () => {
    expect(brDateToIso('08/07/2026')).toBe('2026-07-08');
    expect(brDateToIso('01/01/2026')).toBe('2026-01-01');
  });

  it('returns null for incomplete or malformed input', () => {
    expect(brDateToIso('08/07')).toBeNull();
    expect(brDateToIso('8/7/2026')).toBeNull();
    expect(brDateToIso('')).toBeNull();
  });

  it('rejects impossible calendar dates', () => {
    expect(brDateToIso('31/02/2026')).toBeNull();
    expect(brDateToIso('00/07/2026')).toBeNull();
    expect(brDateToIso('32/07/2026')).toBeNull();
  });

  it('round-trips with formatIsoDateBr', () => {
    expect(formatIsoDateBr(brDateToIso('15/03/2027')!)).toBe('15/03/2027');
  });
});
