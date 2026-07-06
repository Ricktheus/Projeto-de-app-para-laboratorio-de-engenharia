import { describe, expect, it } from 'vitest';

import {
  CONSIDERACOES_FINAIS_PADRAO,
  RESSALVA_COLETA_ATRASADA,
  RESSALVA_SLUMP_FORA_TOLERANCIA,
  algumSlumpForaTolerancia,
  buildConsideracoesFinais,
  isSlumpForaTolerancia,
} from './ressalvas';

describe('isSlumpForaTolerancia (F-S008-1 / US14-CA3)', () => {
  it('is false when the measured slump is within design ± tolerance', () => {
    expect(
      isSlumpForaTolerancia({ slumpMedidoMm: 90, slumpProjetoMm: 100, slumpToleranciaMm: 20 }),
    ).toBe(false);
    // On the boundary is still within tolerance.
    expect(
      isSlumpForaTolerancia({ slumpMedidoMm: 120, slumpProjetoMm: 100, slumpToleranciaMm: 20 }),
    ).toBe(false);
  });

  it('is true when the measured slump is outside the tolerance band', () => {
    expect(
      isSlumpForaTolerancia({ slumpMedidoMm: 130, slumpProjetoMm: 100, slumpToleranciaMm: 20 }),
    ).toBe(true);
    expect(
      isSlumpForaTolerancia({ slumpMedidoMm: 70, slumpProjetoMm: 100, slumpToleranciaMm: 20 }),
    ).toBe(true);
  });

  it('is false when any slump value is missing (unmeasured raises no caveat)', () => {
    expect(isSlumpForaTolerancia({ slumpMedidoMm: 130, slumpProjetoMm: 100 })).toBe(false);
    expect(isSlumpForaTolerancia({})).toBe(false);
    expect(
      isSlumpForaTolerancia({ slumpMedidoMm: null, slumpProjetoMm: 100, slumpToleranciaMm: 20 }),
    ).toBe(false);
  });

  it('flags a report when at least one concretagem is out of tolerance', () => {
    expect(
      algumSlumpForaTolerancia([
        { slumpMedidoMm: 90, slumpProjetoMm: 100, slumpToleranciaMm: 20 },
        { slumpMedidoMm: 200, slumpProjetoMm: 100, slumpToleranciaMm: 20 },
      ]),
    ).toBe(true);
    expect(
      algumSlumpForaTolerancia([{ slumpMedidoMm: 90, slumpProjetoMm: 100, slumpToleranciaMm: 20 }]),
    ).toBe(false);
  });
});

describe('buildConsideracoesFinais (F-S008-1 / US14-CA3)', () => {
  it('always starts with the standard NBR 5739 text', () => {
    const paras = buildConsideracoesFinais({
      algumaColetaAtrasada: false,
      algumSlumpForaTolerancia: false,
    });
    expect(paras).toEqual([CONSIDERACOES_FINAIS_PADRAO]);
  });

  it('appends the late-collection caveat when a specimen was collected > 24h', () => {
    const paras = buildConsideracoesFinais({
      algumaColetaAtrasada: true,
      algumSlumpForaTolerancia: false,
    });
    expect(paras).toEqual([CONSIDERACOES_FINAIS_PADRAO, RESSALVA_COLETA_ATRASADA]);
  });

  it('appends the slump caveat when a measured slump is out of tolerance', () => {
    const paras = buildConsideracoesFinais({
      algumaColetaAtrasada: false,
      algumSlumpForaTolerancia: true,
    });
    expect(paras).toEqual([CONSIDERACOES_FINAIS_PADRAO, RESSALVA_SLUMP_FORA_TOLERANCIA]);
  });

  it('appends both caveats in a fixed order (coleta, then slump)', () => {
    const paras = buildConsideracoesFinais({
      algumaColetaAtrasada: true,
      algumSlumpForaTolerancia: true,
    });
    expect(paras).toEqual([
      CONSIDERACOES_FINAIS_PADRAO,
      RESSALVA_COLETA_ATRASADA,
      RESSALVA_SLUMP_FORA_TOLERANCIA,
    ]);
  });
});
