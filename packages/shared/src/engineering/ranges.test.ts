import { describe, expect, it } from 'vitest';

import { ENGINEERING_RANGES, checkRange, checkSlumpTolerance } from './ranges';

describe('engineering ranges (PRD §7.4)', () => {
  it('encodes the §7.4 bounds', () => {
    expect(ENGINEERING_RANGES.fckProjetoMpa).toMatchObject({
      min: 10,
      max: 100,
      severity: 'aviso',
    });
    expect(ENGINEERING_RANGES.diametroMedidoMm).toMatchObject({
      min: 90,
      max: 160,
      severity: 'confirmacao',
    });
    expect(ENGINEERING_RANGES.volumeM3).toMatchObject({ min: 0.1, max: 20 });
  });

  it('passes values inside the range', () => {
    expect(checkRange('fckProjetoMpa', 30)).toEqual({ ok: true });
    expect(checkRange('cargaRupturaKgf', 23562)).toEqual({ ok: true });
  });

  it('warns (non-blocking) on out-of-range values with severity + message', () => {
    const low = checkRange('cargaRupturaKgf', 50); // "digitou em kN?"
    expect(low.ok).toBe(false);
    expect(low.severity).toBe('aviso');
    expect(low.message).toContain('kN');

    const diam = checkRange('diametroMedidoMm', 300);
    expect(diam.severity).toBe('confirmacao');
  });

  it('validates the measured slump against design ± tolerance', () => {
    expect(
      checkSlumpTolerance({ slumpMedidoMm: 120, slumpProjetoMm: 120, slumpToleranciaMm: 20 }),
    ).toEqual({ ok: true });
    const out = checkSlumpTolerance({
      slumpMedidoMm: 160,
      slumpProjetoMm: 120,
      slumpToleranciaMm: 20,
    });
    expect(out.ok).toBe(false);
    expect(out.severity).toBe('aviso');
    expect(out.message).toContain('100 a 140 mm');
  });
});
