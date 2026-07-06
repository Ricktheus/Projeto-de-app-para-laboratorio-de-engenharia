/**
 * Loads a report's data with the service_role client and maps it into the shared
 * `LaudoReportInput` (F-S008-1). The DB rows are translated into the domain
 * shapes; the aggregation itself (FCM per age, curve, caveats) is done by
 * `buildLaudoReport` in `packages/shared` (DRY — never reimplemented here).
 */
import type { LaudoReportConcretagemInput, LaudoReportInput } from '@concreto/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Outcome of loading the report for PDF generation. */
export type LoadResult =
  { kind: 'ok'; input: LaudoReportInput } | { kind: 'not_found' } | { kind: 'not_ready' };

interface ClienteJoin {
  nome: string;
}
interface ObraJoin {
  nome: string | null;
  sigla: string | null;
  endereco: string | null;
  contato: string | null;
  clientes: ClienteJoin | ClienteJoin[] | null;
}
interface LaudoRow {
  id: string;
  status: string;
  tipo_laudo: LaudoReportInput['tipoLaudo'];
  numero: string;
  obras: ObraJoin | ObraJoin[] | null;
}
interface ConcretagemRow {
  id: string;
  data_concretagem: string;
  nf_numero: string;
  quadra: string | null;
  lote: string | null;
  lacre_caminhao: string | null;
  fck_projeto: number;
  slump_projeto: number | null;
  slump_tolerancia: number | null;
  slump_medido: number | null;
  diametro_nominal_mm: number;
  altura_nominal_mm: number;
}
interface RupturaJoin {
  mpa_calculado: number | null;
  carga_ruptura_kgf: number | null;
}
interface CorpoProvaRow {
  concretagem_id: string;
  codigo_rastreio: string;
  idade_alvo_dias: number;
  status: LaudoReportConcretagemInput['cps'][number]['status'];
  coleta_atrasada: boolean;
  rupturas: RupturaJoin | RupturaJoin[] | null;
}

function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Loads the report and returns the render-ready {@link LaudoReportInput}, or a
 * guard outcome: `not_found` (no such report) / `not_ready` (not yet
 * `pronto_assinatura`, the F-S008-1 409). Uses service_role (RLS bypass);
 * authorization is enforced by the caller (engineer-only).
 */
export async function loadReportInput(
  service: SupabaseClient,
  laudoId: string,
): Promise<LoadResult> {
  const { data: laudo } = await service
    .from('laudos')
    .select('id, status, tipo_laudo, numero, obras(nome, sigla, endereco, contato, clientes(nome))')
    .eq('id', laudoId)
    .maybeSingle<LaudoRow>();

  if (!laudo) {
    return { kind: 'not_found' };
  }
  if (laudo.status !== 'pronto_assinatura') {
    return { kind: 'not_ready' };
  }

  const obra = firstOrSelf(laudo.obras);
  const cliente = firstOrSelf(obra?.clientes ?? null);

  // Concretagem ids composing the report (junction).
  const { data: junction } = await service
    .from('laudo_concretagens')
    .select('concretagem_id')
    .eq('laudo_id', laudoId);
  const concretagemIds = (junction ?? []).map(
    (r) => (r as { concretagem_id: string }).concretagem_id,
  );

  if (concretagemIds.length === 0) {
    // No NF linked — nothing to consolidate (SEM_RESULTADOS downstream).
    return {
      kind: 'ok',
      input: buildInput(laudo, obra, cliente, [], [], false),
    };
  }

  const { data: concretagens } = await service
    .from('concretagens')
    .select(
      'id, data_concretagem, nf_numero, quadra, lote, lacre_caminhao, fck_projeto, ' +
        'slump_projeto, slump_tolerancia, slump_medido, diametro_nominal_mm, altura_nominal_mm',
    )
    .in('id', concretagemIds)
    .order('data_concretagem', { ascending: true });

  const { data: cps } = await service
    .from('corpos_prova')
    .select(
      'concretagem_id, codigo_rastreio, idade_alvo_dias, status, coleta_atrasada, ' +
        'rupturas(mpa_calculado, carga_ruptura_kgf)',
    )
    .in('concretagem_id', concretagemIds);

  const cpRows = (cps as CorpoProvaRow[] | null) ?? [];
  const algumaColetaAtrasada = cpRows.some((cp) => cp.coleta_atrasada === true);

  return {
    kind: 'ok',
    input: buildInput(
      laudo,
      obra,
      cliente,
      (concretagens as ConcretagemRow[] | null) ?? [],
      cpRows,
      algumaColetaAtrasada,
    ),
  };
}

function buildInput(
  laudo: LaudoRow,
  obra: ObraJoin | null,
  cliente: ClienteJoin | null,
  concretagens: ConcretagemRow[],
  cps: CorpoProvaRow[],
  algumaColetaAtrasada: boolean,
): LaudoReportInput {
  const cpsByConcretagem = new Map<string, CorpoProvaRow[]>();
  for (const cp of cps) {
    const group = cpsByConcretagem.get(cp.concretagem_id);
    if (group) {
      group.push(cp);
    } else {
      cpsByConcretagem.set(cp.concretagem_id, [cp]);
    }
  }

  const concretagensInput: LaudoReportConcretagemInput[] = concretagens.map((c) => ({
    dataConcretagem: c.data_concretagem,
    nfNumero: c.nf_numero,
    quadra: c.quadra,
    lote: c.lote,
    lacreCaminhao: c.lacre_caminhao,
    fckProjeto: c.fck_projeto,
    slumpProjetoMm: c.slump_projeto,
    slumpToleranciaMm: c.slump_tolerancia,
    slumpMedidoMm: c.slump_medido,
    diametroNominalMm: c.diametro_nominal_mm,
    alturaNominalMm: c.altura_nominal_mm,
    cps: (cpsByConcretagem.get(c.id) ?? []).map((cp) => {
      const ruptura = firstOrSelf(cp.rupturas);
      return {
        codigoRastreio: cp.codigo_rastreio,
        idadeAlvoDias: cp.idade_alvo_dias,
        status: cp.status,
        mpaCalculado: ruptura?.mpa_calculado ?? null,
        cargaRupturaKgf: ruptura?.carga_ruptura_kgf ?? null,
      };
    }),
  }));

  return {
    numero: laudo.numero,
    tipoLaudo: laudo.tipo_laudo,
    clienteNome: cliente?.nome ?? null,
    obraNome: obra?.nome ?? null,
    obraSigla: obra?.sigla ?? null,
    obraEndereco: obra?.endereco ?? null,
    obraContato: obra?.contato ?? null,
    concretagens: concretagensInput,
    algumaColetaAtrasada,
  };
}
