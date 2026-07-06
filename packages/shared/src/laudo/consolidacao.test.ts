import { describe, expect, it } from 'vitest';

import {
  computeFcm,
  consolidarLaudo,
  laudoCobreIdade,
  type LaudoCpResultado,
} from './consolidacao';

describe('computeFcm (PRD §7.2 — média dos MPa válidos)', () => {
  it('averages only ruptured specimens and rounds to 2 decimals', () => {
    const cps: LaudoCpResultado[] = [
      { codigoRastreio: 'A', idadeAlvoDias: 28, status: 'rompido', mpaCalculado: 27.44 },
      { codigoRastreio: 'B', idadeAlvoDias: 28, status: 'rompido', mpaCalculado: 30.21 },
    ];
    // (27.44 + 30.21) / 2 = 28.825 -> 28.83
    expect(computeFcm(cps)).toBe(28.83);
  });

  it('excludes descartado/expurgado and non-ruptured specimens from the average', () => {
    const cps: LaudoCpResultado[] = [
      { codigoRastreio: 'A', idadeAlvoDias: 28, status: 'rompido', mpaCalculado: 30 },
      { codigoRastreio: 'B', idadeAlvoDias: 28, status: 'expurgado', mpaCalculado: 10 },
      { codigoRastreio: 'C', idadeAlvoDias: 28, status: 'descartado' },
      { codigoRastreio: 'D', idadeAlvoDias: 28, status: 'coletado' },
    ];
    expect(computeFcm(cps)).toBe(30);
  });

  it('returns null when there is no valid reading', () => {
    const cps: LaudoCpResultado[] = [
      { codigoRastreio: 'A', idadeAlvoDias: 7, status: 'coletado' },
      { codigoRastreio: 'B', idadeAlvoDias: 7, status: 'descartado' },
    ];
    expect(computeFcm(cps)).toBeNull();
  });
});

describe('consolidarLaudo (F-S007-3)', () => {
  const cps: LaudoCpResultado[] = [
    // 7d: both broken -> FCM 27.00
    { codigoRastreio: 'CP-2', idadeAlvoDias: 7, status: 'rompido', mpaCalculado: 26, cargaRupturaKgf: 20000 },
    { codigoRastreio: 'CP-1', idadeAlvoDias: 7, status: 'rompido', mpaCalculado: 28, cargaRupturaKgf: 22000 },
    // 14d: one broken, one still collected -> pending, FCM from the single result
    { codigoRastreio: 'CP-3', idadeAlvoDias: 14, status: 'rompido', mpaCalculado: 31.5 },
    { codigoRastreio: 'CP-4', idadeAlvoDias: 14, status: 'coletado' },
    // 28d: all discarded/purged -> expurgada, no FCM
    { codigoRastreio: 'CP-5', idadeAlvoDias: 28, status: 'expurgado', mpaCalculado: 5 },
    { codigoRastreio: 'CP-6', idadeAlvoDias: 28, status: 'descartado' },
  ];

  it('groups ages ascending, sorts specimens by code and computes FCM per age', () => {
    const result = consolidarLaudo(cps);
    expect(result.idades.map((i) => i.idadeAlvoDias)).toEqual([7, 14, 28]);
    // 7d specimens come out ordered CP-1, CP-2 (numeric-aware sort).
    expect(result.idades[0]?.cps.map((c) => c.codigoRastreio)).toEqual(['CP-1', 'CP-2']);
    expect(result.idades[0]?.fcm).toBe(27);
    expect(result.idades[1]?.fcm).toBe(31.5);
    expect(result.idades[2]?.fcm).toBeNull();
  });

  it('flags an age pendente when any specimen is non-terminal', () => {
    const result = consolidarLaudo(cps);
    expect(result.idades.map((i) => [i.idadeAlvoDias, i.pendente])).toEqual([
      [7, false],
      [14, true],
      [28, false],
    ]);
    expect(result.algumPendente).toBe(true);
  });

  it('flags an age expurgada only when every specimen is descartado/expurgado', () => {
    const result = consolidarLaudo(cps);
    expect(result.idades.map((i) => [i.idadeAlvoDias, i.expurgada])).toEqual([
      [7, false],
      [14, false],
      [28, true],
    ]);
  });

  it('builds the resistance curve only from ages with a valid FCM, ascending', () => {
    const result = consolidarLaudo(cps);
    expect(result.curva).toEqual([
      { idadeAlvoDias: 7, fcm: 27 },
      { idadeAlvoDias: 14, fcm: 31.5 },
    ]);
    expect(result.temResultado).toBe(true);
  });

  it('handles an empty specimen set', () => {
    const result = consolidarLaudo([]);
    expect(result.idades).toEqual([]);
    expect(result.curva).toEqual([]);
    expect(result.algumPendente).toBe(false);
    expect(result.temResultado).toBe(false);
  });
});

describe('laudoCobreIdade (US13-CA2 coverage rule)', () => {
  it('partial reports cover only their own age', () => {
    expect(laudoCobreIdade('parcial_7d', 7)).toBe(true);
    expect(laudoCobreIdade('parcial_7d', 14)).toBe(false);
    expect(laudoCobreIdade('parcial_14d', 14)).toBe(true);
    expect(laudoCobreIdade('parcial_14d', 28)).toBe(false);
  });

  it('the final report covers every age', () => {
    expect(laudoCobreIdade('final_28d', 7)).toBe(true);
    expect(laudoCobreIdade('final_28d', 14)).toBe(true);
    expect(laudoCobreIdade('final_28d', 28)).toBe(true);
    expect(laudoCobreIdade('final_28d', 63)).toBe(true);
  });
});
