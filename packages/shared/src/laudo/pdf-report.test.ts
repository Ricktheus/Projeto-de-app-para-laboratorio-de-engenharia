import { describe, expect, it } from 'vitest';

import type { LaudoCpResultado } from './consolidacao';
import {
  buildLaudoReport,
  formatMedidaCp,
  formatSlump,
  type LaudoReportConcretagemInput,
} from './pdf-report';

function cp(
  codigo: string,
  idade: number,
  mpa: number | null,
  kgf: number | null,
): LaudoCpResultado {
  return {
    codigoRastreio: codigo,
    idadeAlvoDias: idade,
    status: mpa === null ? 'coletado' : 'rompido',
    mpaCalculado: mpa,
    cargaRupturaKgf: kgf,
  };
}

const BASE_CONC: LaudoReportConcretagemInput = {
  dataConcretagem: '2026-05-20',
  nfNumero: 'NF-123',
  quadra: 'Q1',
  lote: 'L2',
  lacreCaminhao: 'LACRE-9',
  fckProjeto: 30,
  slumpProjetoMm: 100,
  slumpToleranciaMm: 20,
  slumpMedidoMm: 110,
  diametroNominalMm: 100,
  alturaNominalMm: 200,
  cps: [cp('CP-7', 7, 27.44, 21977), cp('CP-28', 28, 32.1, 25717)],
};

describe('formatters (F-S008-1, PRD §11)', () => {
  it('formats the slump as "alvo ± tolerância mm"', () => {
    expect(formatSlump({ slumpProjetoMm: 80, slumpToleranciaMm: 20 })).toBe('80 ± 20 mm');
  });

  it('falls back to the measured slump, then a dash', () => {
    expect(formatSlump({ slumpMedidoMm: 95 })).toBe('95 mm');
    expect(formatSlump({})).toBe('—');
  });

  it('formats the specimen mould as "diâmetro × altura mm"', () => {
    expect(formatMedidaCp(100, 200)).toBe('100 × 200 mm');
    expect(formatMedidaCp(150, 300)).toBe('150 × 300 mm');
  });
});

describe('buildLaudoReport (F-S008-1, PRD §11)', () => {
  it('assembles the header meta from the first concretagem', () => {
    const report = buildLaudoReport({
      numero: 'N°003AGEHAB',
      tipoLaudo: 'final_28d',
      clienteNome: 'AGEHAB',
      obraNome: 'Residencial X',
      obraSigla: 'RESX',
      obraEndereco: 'Rua 1',
      obraContato: 'Fulano',
      concretagens: [BASE_CONC],
      algumaColetaAtrasada: false,
    });
    expect(report.header.numero).toBe('N°003AGEHAB');
    expect(report.header.clienteNome).toBe('AGEHAB');
    expect(report.header.fckProjeto).toBe(30);
    expect(report.header.slump).toBe('100 ± 20 mm');
    expect(report.header.medidaCp).toBe('100 × 200 mm');
    expect(report.header.numCps).toBe(2);
  });

  it('builds one table block per NF with its base fields (DATA|QUADRA|LOTE|NF|LACRE)', () => {
    const report = buildLaudoReport({
      numero: 'N°1',
      tipoLaudo: 'final_28d',
      concretagens: [BASE_CONC],
      algumaColetaAtrasada: false,
    });
    expect(report.blocos).toHaveLength(1);
    const bloco = report.blocos[0]!;
    expect(bloco.dataConcretagem).toBe('20/05/2026'); // pt-BR
    expect(bloco.quadra).toBe('Q1');
    expect(bloco.lote).toBe('L2');
    expect(bloco.nfNumero).toBe('NF-123');
    expect(bloco.lacre).toBe('LACRE-9');
    // Per-age FCM computed via the shared consolidarLaudo (7d + 28d present).
    expect(bloco.idades.map((i) => i.idadeAlvoDias)).toEqual([7, 28]);
    expect(bloco.idades[0]!.fcm).toBe(27.44);
  });

  it('exposes the resistance curve over all specimens of the report', () => {
    const report = buildLaudoReport({
      numero: 'N°1',
      tipoLaudo: 'final_28d',
      concretagens: [BASE_CONC],
      algumaColetaAtrasada: false,
    });
    expect(report.curva).toEqual([
      { idadeAlvoDias: 7, fcm: 27.44 },
      { idadeAlvoDias: 28, fcm: 32.1 },
    ]);
    expect(report.temResultado).toBe(true);
  });

  it('flags temResultado=false when no specimen has a valid result (SEM_RESULTADOS guard)', () => {
    const report = buildLaudoReport({
      numero: 'N°1',
      tipoLaudo: 'final_28d',
      concretagens: [{ ...BASE_CONC, cps: [cp('CP-7', 7, null, null)] }],
      algumaColetaAtrasada: false,
    });
    expect(report.temResultado).toBe(false);
  });

  it('adds the late-collection and slump caveats automatically (US14-CA3)', () => {
    const report = buildLaudoReport({
      numero: 'N°1',
      tipoLaudo: 'final_28d',
      // slumpMedido 200 is far outside 100 ± 20 → slump caveat.
      concretagens: [{ ...BASE_CONC, slumpMedidoMm: 200 }],
      algumaColetaAtrasada: true,
    });
    expect(report.consideracoes).toHaveLength(3); // standard + 2 caveats
    expect(report.consideracoes[1]).toContain('coletadas mais de 24 horas');
    expect(report.consideracoes[2]).toContain('abatimento (slump)');
  });

  it('consolidates several NFs into one report (grouped final)', () => {
    const report = buildLaudoReport({
      numero: 'N°AGEHAB',
      tipoLaudo: 'final_28d',
      concretagens: [
        BASE_CONC,
        { ...BASE_CONC, nfNumero: 'NF-456', cps: [cp('CP-7B', 7, 25.03, 20045)] },
      ],
      algumaColetaAtrasada: false,
    });
    expect(report.blocos).toHaveLength(2);
    expect(report.header.numCps).toBe(3);
  });
});
