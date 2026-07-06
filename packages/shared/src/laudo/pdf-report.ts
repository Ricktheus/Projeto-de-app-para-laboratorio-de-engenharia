import type { LaudoTipo } from '../enums';
import { formatIsoDateBr } from '../lib/date';

import {
  consolidarLaudo,
  type LaudoConsolidado,
  type LaudoCpResultado,
  type LaudoCurvaPonto,
  type LaudoIdadeConsolidada,
} from './consolidacao';
import {
  algumSlumpForaTolerancia,
  buildConsideracoesFinais,
  type RessalvaSlumpInput,
} from './ressalvas';

/**
 * Render-ready model of a laudo (F-S008-1, PRD §11). Turns the report's domain
 * inputs (concretagens + specimens) into exactly what the PDF draws: the header
 * meta, one table block per NF (DATA|QUADRA|LOTE|NF|LACRE|CP|KGF|MPa|FCM per
 * age), the resistance curve and the "considerações finais" with the automatic
 * caveats. The aggregation reuses the shared `consolidarLaudo` and the ressalvas
 * rules (DRY) so the numbers and the caveats match the office panel exactly.
 *
 * Pure: no I/O — the Edge Function maps DB rows into these shapes and hands the
 * result to `pdf-lib`. Unit-tested in Vitest.
 */

/** One concretagem (NF) feeding the report, with its own specimens. */
export interface LaudoReportConcretagemInput extends RessalvaSlumpInput {
  /** Concretagem date (ISO 'YYYY-MM-DD'). */
  dataConcretagem: string;
  nfNumero: string;
  quadra?: string | null;
  lote?: string | null;
  lacreCaminhao?: string | null;
  fckProjeto: number;
  diametroNominalMm: number;
  alturaNominalMm: number;
  /** Specimens of THIS concretagem (with their rupture readings). */
  cps: LaudoCpResultado[];
}

/** The report's domain inputs. */
export interface LaudoReportInput {
  numero: string;
  tipoLaudo: LaudoTipo;
  clienteNome?: string | null;
  obraNome?: string | null;
  obraSigla?: string | null;
  obraEndereco?: string | null;
  obraContato?: string | null;
  concretagens: LaudoReportConcretagemInput[];
  /** True when any specimen of the report was collected late (> 24h). */
  algumaColetaAtrasada: boolean;
}

/** Header meta shown above the results table. */
export interface LaudoReportHeader {
  numero: string;
  clienteNome: string;
  obraNome: string;
  obraSigla: string;
  obraEndereco: string;
  obraContato: string;
  /** fck of the project (MPa) — assumed shared across the report's NFs. */
  fckProjeto: number | null;
  /** Slump summary, e.g. "80 ± 20 mm" or "—". */
  slump: string;
  /** Specimen mould, e.g. "100 × 200 mm". */
  medidaCp: string;
  /** Total number of specimens in the report. */
  numCps: number;
}

/** One NF block of the results table (its base fields + per-age results). */
export interface LaudoReportBloco {
  dataConcretagem: string;
  quadra: string;
  lote: string;
  nfNumero: string;
  lacre: string;
  /** Per-age consolidation for this NF (KGF/MPa rows + FCM). */
  idades: LaudoIdadeConsolidada[];
}

/** The fully assembled, render-ready report model. */
export interface LaudoReport {
  header: LaudoReportHeader;
  blocos: LaudoReportBloco[];
  /** Resistance curve (age → FCM) over ALL specimens of the report. */
  curva: LaudoCurvaPonto[];
  /** Closing paragraphs: standard NBR text + automatic caveats. */
  consideracoes: string[];
  /** True when at least one age has a valid FCM (else SEM_RESULTADOS). */
  temResultado: boolean;
}

const DASH = '—';

function textOrDash(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : DASH;
}

/** Formats the slump summary as "alvo ± tolerância mm", falling back gracefully. */
export function formatSlump(input: RessalvaSlumpInput): string {
  const { slumpProjetoMm, slumpToleranciaMm, slumpMedidoMm } = input;
  if (typeof slumpProjetoMm === 'number' && typeof slumpToleranciaMm === 'number') {
    return `${slumpProjetoMm} ± ${slumpToleranciaMm} mm`;
  }
  if (typeof slumpMedidoMm === 'number') {
    return `${slumpMedidoMm} mm`;
  }
  return DASH;
}

/** Formats the specimen mould as "diâmetro × altura mm". */
export function formatMedidaCp(diametroNominalMm: number, alturaNominalMm: number): string {
  return `${diametroNominalMm} × ${alturaNominalMm} mm`;
}

/**
 * Assembles the render-ready report model (F-S008-1, PRD §11) from its domain
 * inputs. Reuses `consolidarLaudo` (FCM per age + curve) for the whole report
 * and per NF, and the ressalvas rules for the closing caveats.
 */
export function buildLaudoReport(input: LaudoReportInput): LaudoReport {
  const primeira = input.concretagens[0];
  const allCps: LaudoCpResultado[] = input.concretagens.flatMap((c) => c.cps);
  const consolidado: LaudoConsolidado = consolidarLaudo(allCps);

  const header: LaudoReportHeader = {
    numero: input.numero,
    clienteNome: textOrDash(input.clienteNome),
    obraNome: textOrDash(input.obraNome),
    obraSigla: textOrDash(input.obraSigla),
    obraEndereco: textOrDash(input.obraEndereco),
    obraContato: textOrDash(input.obraContato),
    fckProjeto: primeira?.fckProjeto ?? null,
    slump: primeira ? formatSlump(primeira) : DASH,
    medidaCp: primeira
      ? formatMedidaCp(primeira.diametroNominalMm, primeira.alturaNominalMm)
      : DASH,
    numCps: allCps.length,
  };

  const blocos: LaudoReportBloco[] = input.concretagens.map((c) => ({
    dataConcretagem: formatIsoDateBr(c.dataConcretagem),
    quadra: textOrDash(c.quadra),
    lote: textOrDash(c.lote),
    nfNumero: textOrDash(c.nfNumero),
    lacre: textOrDash(c.lacreCaminhao),
    idades: consolidarLaudo(c.cps).idades,
  }));

  const consideracoes = buildConsideracoesFinais({
    algumaColetaAtrasada: input.algumaColetaAtrasada,
    algumSlumpForaTolerancia: algumSlumpForaTolerancia(input.concretagens),
  });

  return {
    header,
    blocos,
    curva: consolidado.curva,
    consideracoes,
    temResultado: consolidado.temResultado,
  };
}
