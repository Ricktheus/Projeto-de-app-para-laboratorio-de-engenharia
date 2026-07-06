import {
  consolidarLaudo,
  messageForLaudoRpcError,
  messageForSupabaseError,
  type LaudoConsolidado,
  type LaudoCpResultado,
  type LaudoStatus,
  type LaudoTipo,
} from '@concreto/shared';

import { supabase } from '../../services/supabase';

/** A draft report as listed on the laudos screen (F-S007-3 / US13-CA1). */
export interface LaudoRascunhoRow {
  id: string;
  tipo_laudo: LaudoTipo;
  numero: string;
  obra_id: string;
  obra_nome: string | null;
  obra_sigla: string | null;
  cliente_nome: string | null;
  /** NF numbers of the concretagens the report consolidates. */
  nfs: string[];
  /** Concretagem ids the report links (drives the grouping action). */
  concretagem_ids: string[];
  updated_at: string;
}

/** A concretagem summarized inside a report's detail. */
export interface LaudoConcretagemInfo {
  id: string;
  nf_numero: string;
  quadra: string | null;
  lote: string | null;
  fck_projeto: number;
}

/** A fully loaded, consolidated report draft (F-S007-3). */
export interface LaudoDetalhe {
  id: string;
  tipo_laudo: LaudoTipo;
  numero: string;
  status: LaudoStatus;
  obra_nome: string | null;
  obra_sigla: string | null;
  cliente_nome: string | null;
  /** Reference fck for the resistance chart (the linked NFs' project strength). */
  fckProjeto: number | null;
  concretagens: LaudoConcretagemInfo[];
  consolidado: LaudoConsolidado;
  updated_at: string;
}

interface ClienteJoin {
  nome: string;
}
interface ObraJoin {
  nome: string;
  sigla: string;
  clientes: ClienteJoin | ClienteJoin[] | null;
}
interface ConcretagemJoin {
  id: string;
  nf_numero: string;
  quadra: string | null;
  lote: string | null;
  fck_projeto: number;
}
interface LaudoConcretagemJoin {
  concretagens: ConcretagemJoin | ConcretagemJoin[] | null;
}
interface LaudoListJoinRow {
  id: string;
  tipo_laudo: LaudoTipo;
  numero: string;
  obra_id: string;
  updated_at: string;
  obras: ObraJoin | ObraJoin[] | null;
  laudo_concretagens: LaudoConcretagemJoin[] | null;
}
interface LaudoDetalheJoinRow {
  id: string;
  tipo_laudo: LaudoTipo;
  numero: string;
  status: LaudoStatus;
  updated_at: string;
  obras: ObraJoin | ObraJoin[] | null;
  laudo_concretagens: LaudoConcretagemJoin[] | null;
}
interface RupturaJoin {
  mpa_calculado: number | null;
  carga_ruptura_kgf: number | null;
}
interface CorpoProvaJoinRow {
  codigo_rastreio: string;
  idade_alvo_dias: number;
  status: LaudoCpResultado['status'];
  rupturas: RupturaJoin | RupturaJoin[] | null;
}

function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function concretagensOf(rows: LaudoConcretagemJoin[] | null): ConcretagemJoin[] {
  return (rows ?? [])
    .map((row) => firstOrSelf(row.concretagens))
    .filter((c): c is ConcretagemJoin => c !== null);
}

const LIST_SELECT =
  'id, tipo_laudo, numero, obra_id, updated_at, ' +
  'obras(nome, sigla, clientes(nome)), ' +
  'laudo_concretagens(concretagens(id, nf_numero))';

const DETALHE_SELECT =
  'id, tipo_laudo, numero, status, updated_at, ' +
  'obras(nome, sigla, clientes(nome)), ' +
  'laudo_concretagens(concretagens(id, nf_numero, quadra, lote, fck_projeto))';

/**
 * Lists the pre-filled report DRAFTS (status `rascunho`), newest first
 * (F-S007-3 / US13-CA1). RLS (`laudos_eng_all`) scopes this to the engineers.
 */
export async function listLaudoRascunhos(): Promise<LaudoRascunhoRow[]> {
  const { data, error } = await supabase
    .from('laudos')
    .select(LIST_SELECT)
    .eq('status', 'rascunho')
    .order('updated_at', { ascending: false });
  if (error) {
    throw new Error(messageForSupabaseError(error));
  }
  return ((data as unknown as LaudoListJoinRow[] | null) ?? []).map((row) => {
    const obra = firstOrSelf(row.obras);
    const cliente = firstOrSelf(obra?.clientes ?? null);
    const concretagens = concretagensOf(row.laudo_concretagens);
    return {
      id: row.id,
      tipo_laudo: row.tipo_laudo,
      numero: row.numero,
      obra_id: row.obra_id,
      obra_nome: obra?.nome ?? null,
      obra_sigla: obra?.sigla ?? null,
      cliente_nome: cliente?.nome ?? null,
      nfs: concretagens.map((c) => c.nf_numero),
      concretagem_ids: concretagens.map((c) => c.id),
      updated_at: row.updated_at,
    };
  });
}

/**
 * Loads a report draft and consolidates its results per age (F-S007-3 /
 * US13-CA2): the specimens of every linked concretagem are pulled with their
 * rupture readings and folded through the shared `consolidarLaudo` (FCM per age
 * + resistance curve). The domain rule lives once in `packages/shared`.
 */
export async function getLaudoDetalhe(laudoId: string): Promise<LaudoDetalhe> {
  const { data, error } = await supabase
    .from('laudos')
    .select(DETALHE_SELECT)
    .eq('id', laudoId)
    .maybeSingle();
  if (error) {
    throw new Error(messageForSupabaseError(error));
  }
  if (!data) {
    throw new Error(messageForSupabaseError({ status: 404 }));
  }

  const row = data as unknown as LaudoDetalheJoinRow;
  const obra = firstOrSelf(row.obras);
  const cliente = firstOrSelf(obra?.clientes ?? null);
  const concretagens = concretagensOf(row.laudo_concretagens);
  const concretagemIds = concretagens.map((c) => c.id);

  const cps = concretagemIds.length > 0 ? await loadCorposProva(concretagemIds) : [];

  return {
    id: row.id,
    tipo_laudo: row.tipo_laudo,
    numero: row.numero,
    status: row.status,
    obra_nome: obra?.nome ?? null,
    obra_sigla: obra?.sigla ?? null,
    cliente_nome: cliente?.nome ?? null,
    fckProjeto: concretagens[0]?.fck_projeto ?? null,
    concretagens: concretagens.map((c) => ({
      id: c.id,
      nf_numero: c.nf_numero,
      quadra: c.quadra,
      lote: c.lote,
      fck_projeto: c.fck_projeto,
    })),
    consolidado: consolidarLaudo(cps),
    updated_at: row.updated_at,
  };
}

/** Loads the specimens (+ rupture readings) of the given concretagens. */
async function loadCorposProva(concretagemIds: string[]): Promise<LaudoCpResultado[]> {
  const { data, error } = await supabase
    .from('corpos_prova')
    .select('codigo_rastreio, idade_alvo_dias, status, rupturas(mpa_calculado, carga_ruptura_kgf)')
    .in('concretagem_id', concretagemIds);
  if (error) {
    throw new Error(messageForSupabaseError(error));
  }
  return ((data as unknown as CorpoProvaJoinRow[] | null) ?? []).map((cp) => {
    const ruptura = firstOrSelf(cp.rupturas);
    return {
      codigoRastreio: cp.codigo_rastreio,
      idadeAlvoDias: cp.idade_alvo_dias,
      status: cp.status,
      mpaCalculado: ruptura?.mpa_calculado ?? null,
      cargaRupturaKgf: ruptura?.carga_ruptura_kgf ?? null,
    };
  });
}

/**
 * Marks a draft as `pronto_assinatura` (F-S007-3 sad path). The RPC guards that
 * every covered specimen is terminal; pending specimens raise `CPS_PENDENTES`,
 * mapped to the exact SPEC message.
 */
export async function marcarProntoAssinatura(laudoId: string): Promise<void> {
  const { error } = await supabase.rpc('marcar_pronto_assinatura', { laudo_id: laudoId });
  if (error) {
    throw new Error(messageForLaudoRpcError(error));
  }
}

/** Emits an on-demand 7d|14d partial report for a concretagem (US13-CA2). */
export async function emitirLaudoParcial(concretagemId: string, idadeDias: number): Promise<void> {
  const { error } = await supabase.rpc('emitir_laudo_parcial', {
    concretagem_id: concretagemId,
    idade_dias: idadeDias,
  });
  if (error) {
    throw new Error(messageForLaudoRpcError(error));
  }
}

/** Groups several NFs of the same obra into one consolidated report (US13-CA3). */
export async function agruparLaudo(concretagemIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('agrupar_laudo', { concretagem_ids: concretagemIds });
  if (error) {
    throw new Error(messageForLaudoRpcError(error));
  }
}
