import { MESSAGES, messageForSupabaseError } from '@concreto/shared';

import { supabase } from '../../services/supabase';

/** A concretagem as shown on the office panel, with obra + client context. */
export interface ConcretagemRow {
  id: string;
  data_concretagem: string;
  nf_numero: string;
  fck_projeto: number;
  volume_m3: number;
  concreteira: string | null;
  slump_projeto: number | null;
  slump_tolerancia: number | null;
  slump_medido: number | null;
  quadra: string | null;
  lote: string | null;
  traco: string | null;
  placa_caminhao: string | null;
  lacre_caminhao: string | null;
  aditivo: string | null;
  obra_id: string;
  obra_nome: string | null;
  obra_sigla: string | null;
  cliente_nome: string | null;
  /** Optimistic-locking token — echoed back on save (F-S007-2). */
  updated_at: string;
}

/** The office-editable fields of a concretagem (F-S007-2). */
export interface ConcretagemPatch {
  fck_projeto: number;
  volume_m3: number;
  concreteira: string | null;
  slump_projeto: number | null;
  slump_tolerancia: number | null;
  slump_medido: number | null;
  quadra: string | null;
  lote: string | null;
  traco: string | null;
  placa_caminhao: string | null;
  lacre_caminhao: string | null;
  aditivo: string | null;
}

/** Raised when the concretagem changed since it was read (optimistic lock, US12b-CA2). */
export class ConcretagemConflictError extends Error {
  constructor() {
    super(MESSAGES.http.conflict);
    this.name = 'ConcretagemConflictError';
  }
}

interface ObraJoin {
  nome: string;
  sigla: string;
  clientes: { nome: string } | { nome: string }[] | null;
}

interface ConcretagemJoinRow extends Omit<ConcretagemRow, 'obra_nome' | 'obra_sigla' | 'cliente_nome'> {
  obras: ObraJoin | ObraJoin[] | null;
}

function firstOrSelf<T>(value: T | T[] | null): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapRow(row: ConcretagemJoinRow): ConcretagemRow {
  const obra = firstOrSelf(row.obras);
  const cliente = firstOrSelf(obra?.clientes ?? null);
  return {
    id: row.id,
    data_concretagem: row.data_concretagem,
    nf_numero: row.nf_numero,
    fck_projeto: row.fck_projeto,
    volume_m3: row.volume_m3,
    concreteira: row.concreteira,
    slump_projeto: row.slump_projeto,
    slump_tolerancia: row.slump_tolerancia,
    slump_medido: row.slump_medido,
    quadra: row.quadra,
    lote: row.lote,
    traco: row.traco,
    placa_caminhao: row.placa_caminhao,
    lacre_caminhao: row.lacre_caminhao,
    aditivo: row.aditivo,
    obra_id: row.obra_id,
    obra_nome: obra?.nome ?? null,
    obra_sigla: obra?.sigla ?? null,
    cliente_nome: cliente?.nome ?? null,
    updated_at: row.updated_at,
  };
}

const SELECT_COLUMNS =
  'id, data_concretagem, nf_numero, fck_projeto, volume_m3, concreteira, ' +
  'slump_projeto, slump_tolerancia, slump_medido, quadra, lote, traco, ' +
  'placa_caminhao, lacre_caminhao, aditivo, obra_id, updated_at, ' +
  'obras(nome, sigla, clientes(nome))';

/**
 * Lists the concretagens visible to the office panel, newest first (F-S007-1).
 * RLS (`conc_select`) already scopes this to admins (the office engineers).
 */
export async function listConcretagens(): Promise<ConcretagemRow[]> {
  const { data, error } = await supabase
    .from('concretagens')
    .select(SELECT_COLUMNS)
    .order('data_concretagem', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(messageForSupabaseError(error));
  }
  return ((data as unknown as ConcretagemJoinRow[] | null) ?? []).map(mapRow);
}

/**
 * Edits a concretagem with optimistic locking (F-S007-2 / US12b). The update is
 * conditioned on the `updated_at` read earlier; if it no longer matches the row
 * is not overwritten and a {@link ConcretagemConflictError} (409) is raised.
 * A successful edit is audited automatically by the `trg_audit` trigger
 * (old_value/new_value, US12b-CA1). Returns the fresh `updated_at`.
 */
export async function updateConcretagem(
  id: string,
  patch: ConcretagemPatch,
  expectedUpdatedAt: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('concretagens')
    .update(patch)
    .eq('id', id)
    .eq('updated_at', expectedUpdatedAt)
    .select('id, updated_at');
  if (error) {
    throw new Error(messageForSupabaseError(error));
  }
  const rows = (data as { id: string; updated_at: string }[] | null) ?? [];
  if (rows.length === 1) {
    return rows[0]!.updated_at;
  }
  // Zero rows matched: either `updated_at` moved (concurrent edit → 409) or the
  // row is gone. Disambiguate with a follow-up read (the panel engineer is an
  // admin and can read every concretagem via conc_select).
  const { data: current, error: readError } = await supabase
    .from('concretagens')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (readError) {
    throw new Error(messageForSupabaseError(readError));
  }
  if (current) {
    throw new ConcretagemConflictError();
  }
  throw new Error(MESSAGES.http.notFound);
}

/**
 * Subscribes to realtime `postgres_changes` on `concretagens` (F-S007-1 /
 * SPEC §6.2): any insert/update/delete invokes `onChange` so the panel query is
 * revalidated and a pour saved on mobile shows up without a reload. Returns an
 * unsubscribe cleanup.
 */
export function subscribeConcretagens(onChange: () => void): () => void {
  const channel = supabase
    .channel('concretagens-painel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'concretagens' }, onChange)
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
