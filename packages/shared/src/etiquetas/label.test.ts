import { describe, expect, it } from 'vitest';

import { buildCpLabel, formatLabelDate, readableIdFromCodigo } from './label';

describe('formatLabelDate', () => {
  it('formats an ISO date as dd/mm/yyyy', () => {
    expect(formatLabelDate('2026-05-20')).toBe('20/05/2026');
  });

  it('returns empty string for an unparseable date', () => {
    expect(formatLabelDate('nope')).toBe('');
  });
});

describe('readableIdFromCodigo', () => {
  it('takes the last 6 alphanumerics, uppercased', () => {
    expect(readableIdFromCodigo('CP-9f8a7b6c5d4e3f2a1b0c')).toBe('2A1B0C');
    expect(readableIdFromCodigo('CP-000000abcdef')).toBe('ABCDEF');
  });

  it('strips separators before slicing', () => {
    expect(readableIdFromCodigo('cp-ab-cd-ef')).toBe('ABCDEF');
  });
});

describe('buildCpLabel (F-S005-1)', () => {
  it('derives every printable field, including the QR payload and readable ID', () => {
    const label = buildCpLabel({
      codigoRastreio: 'CP-9f8a7b6c5d4e3f2a1b0cD4',
      obraSigla: 'OBRA-A',
      dataMoldagem: '2026-05-20',
      idadeAlvoDias: 28,
    });
    expect(label).toEqual({
      codigoRastreio: 'CP-9f8a7b6c5d4e3f2a1b0cD4', // QR payload preserved verbatim
      obraSigla: 'OBRA-A',
      dataMoldagem: '20/05/2026',
      idadeAlvoDias: 28,
      idLegivel: '1B0CD4',
    });
  });
});
