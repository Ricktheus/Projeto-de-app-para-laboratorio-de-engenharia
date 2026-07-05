import { describe, expect, it } from 'vitest';

import { checkCargaRuptura } from './carga';

describe('checkCargaRuptura (F-S006-2, US08-CA2)', () => {
  it('returns null for a normal rupture load (no warning)', () => {
    expect(checkCargaRuptura(23562)).toBeNull();
    expect(checkCargaRuptura(1000)).toBeNull();
    expect(checkCargaRuptura(100000)).toBeNull();
  });

  it('warns with the exact kN-vs-kgf copy for a suspiciously low load', () => {
    expect(checkCargaRuptura(231)).toEqual({
      message: 'Valor muito baixo. Você digitou em kN em vez de kgf?',
      severity: 'aviso',
    });
  });

  it('warns with the §7.4 range copy for an implausibly high load', () => {
    const warning = checkCargaRuptura(150000);
    expect(warning?.message).toBe('Carga fora da faixa típica (1.000 a 100.000 kgf). Você digitou em kN?');
    expect(warning?.severity).toBe('aviso');
  });
});
