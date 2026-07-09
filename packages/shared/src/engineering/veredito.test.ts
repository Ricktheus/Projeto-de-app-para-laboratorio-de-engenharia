import { describe, expect, it } from 'vitest';

import { fckVerdict } from './veredito';

describe('fckVerdict (indicative fck comparison)', () => {
  it('compares the MEASURED strength directly at a final age (28d)', () => {
    // 32 MPa at 28d vs fck 30 ⇒ conforme, no projection.
    const r = fckVerdict({ mpa: 32, idadeDias: 28, fckProjeto: 30 });
    expect(r).toMatchObject({ veredito: 'conforme', projetado: false, valorComparado: 32 });
  });

  it('flags a measured 28d result below fck as "abaixo"', () => {
    const r = fckVerdict({ mpa: 24, idadeDias: 28, fckProjeto: 30 });
    expect(r.veredito).toBe('abaixo');
    expect(r.projetado).toBe(false);
  });

  it('projects the 28d strength from an early age (7d) before comparing', () => {
    // 21 MPa at 7d ⇒ f28 = 21/0.70 = 30 ⇒ conforme vs fck 30.
    const r = fckVerdict({ mpa: 21, idadeDias: 7, fckProjeto: 30 });
    expect(r).toMatchObject({ veredito: 'conforme', projetado: true, valorComparado: 30 });
  });

  it('flags an early-age projection short of fck', () => {
    // 18 MPa at 7d ⇒ f28 = 25.71 ⇒ abaixo vs fck 30.
    const r = fckVerdict({ mpa: 18, idadeDias: 7, fckProjeto: 30 });
    expect(r.veredito).toBe('abaixo');
    expect(r.projetado).toBe(true);
  });

  it('uses the amber band just below fck ("atenção")', () => {
    // fck 30, 5% band ⇒ [28.5, 30) is atenção. 29 MPa at 28d.
    expect(fckVerdict({ mpa: 29, idadeDias: 28, fckProjeto: 30 }).veredito).toBe('atencao');
    // 28 MPa is below the band ⇒ abaixo.
    expect(fckVerdict({ mpa: 28, idadeDias: 28, fckProjeto: 30 }).veredito).toBe('abaixo');
  });

  it('honours a custom amber margin', () => {
    // 10% band ⇒ [27, 30) is atenção.
    expect(fckVerdict({ mpa: 28, idadeDias: 28, fckProjeto: 30, margem: 0.1 }).veredito).toBe(
      'atencao',
    );
  });

  it('returns "indeterminado" when the fck is unknown or the load is absent', () => {
    expect(fckVerdict({ mpa: 30, idadeDias: 28, fckProjeto: null }).veredito).toBe('indeterminado');
    expect(fckVerdict({ mpa: null, idadeDias: 28, fckProjeto: 30 }).veredito).toBe('indeterminado');
    expect(fckVerdict({ mpa: 0, idadeDias: 28, fckProjeto: 30 }).valorComparado).toBeNull();
  });
});
