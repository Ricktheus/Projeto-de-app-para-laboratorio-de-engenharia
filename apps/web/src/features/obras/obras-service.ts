import { MESSAGES, messageForSupabaseError, type ObraInput } from '@concreto/shared';

import { supabase } from '../../services/supabase';

/** An obra row as listed on the management screen (F-S004-2/3). */
export interface ObraRow {
  id: string;
  nome: string;
  sigla: string;
  endereco: string | null;
  contato: string | null;
  cliente_id: string;
  ativo: boolean;
  cliente_nome: string | null;
}

interface ObraJoinRow {
  id: string;
  nome: string;
  sigla: string;
  endereco: string | null;
  contato: string | null;
  cliente_id: string;
  ativo: boolean;
  clientes: { nome: string } | { nome: string }[] | null;
}

function clienteNome(clientes: ObraJoinRow['clientes']): string | null {
  if (!clientes) {
    return null;
  }
  return Array.isArray(clientes) ? (clientes[0]?.nome ?? null) : clientes.nome;
}

/** Raised when an obra with concretagens is (attempted to be) deleted (US21-CA1). */
export class ObraComConcretagensError extends Error {
  constructor() {
    super(MESSAGES.feature.obraComConcretagens);
    this.name = 'ObraComConcretagensError';
  }
}

/** Lists obras with their client name (RLS grants internal roles read access). */
export async function listObras(): Promise<ObraRow[]> {
  const { data, error } = await supabase
    .from('obras')
    .select('id, nome, sigla, endereco, contato, cliente_id, ativo, clientes(nome)')
    .order('nome', { ascending: true });
  if (error) {
    throw new Error(messageForSupabaseError(error));
  }
  return ((data as ObraJoinRow[] | null) ?? []).map((row) => ({
    id: row.id,
    nome: row.nome,
    sigla: row.sigla,
    endereco: row.endereco,
    contato: row.contato,
    cliente_id: row.cliente_id,
    ativo: row.ativo,
    cliente_nome: clienteNome(row.clientes),
  }));
}

/**
 * Creates an obra. A duplicate sigla for the same client raises the exact
 * "Já existe uma obra com esta sigla para este cliente." (US20-CA3), mapped from
 * the UNIQUE(cliente_id, sigla) violation.
 */
export async function createObra(input: ObraInput, criadoPor: string): Promise<void> {
  const { error } = await supabase.from('obras').insert({
    cliente_id: input.clienteId,
    nome: input.nome,
    sigla: input.sigla,
    endereco: input.endereco ?? null,
    contato: input.contato ?? null,
    gps_latitude: input.gpsLatitude ?? null,
    gps_longitude: input.gpsLongitude ?? null,
    criado_por: criadoPor,
  });
  if (error) {
    throw new Error(messageForSupabaseError(error));
  }
}

/** Edits an obra (US21). Empty result under RLS is surfaced as a 403. */
export async function updateObra(
  id: string,
  patch: Pick<ObraInput, 'nome' | 'sigla' | 'endereco' | 'contato'>,
): Promise<void> {
  const { data, error } = await supabase
    .from('obras')
    .update({
      nome: patch.nome,
      sigla: patch.sigla,
      endereco: patch.endereco ?? null,
      contato: patch.contato ?? null,
    })
    .eq('id', id)
    .select('id');
  if (error) {
    throw new Error(messageForSupabaseError(error));
  }
  if (!data || data.length === 0) {
    // RLS filtered the row out (e.g. socio_campo editing an obra it did not
    // create — US21-CA2): treat as forbidden.
    throw new Error(MESSAGES.http.forbidden);
  }
}

/** Soft-deletes an obra (`ativo=false`) preserving history (US21). */
export async function inativarObra(id: string): Promise<void> {
  const { error } = await supabase.from('obras').update({ ativo: false }).eq('id', id);
  if (error) {
    throw new Error(messageForSupabaseError(error));
  }
}

/** Counts concretagens linked to an obra (guards deletion — US21-CA1). */
export async function countConcretagens(obraId: string): Promise<number> {
  const { count, error } = await supabase
    .from('concretagens')
    .select('id', { count: 'exact', head: true })
    .eq('obra_id', obraId);
  if (error) {
    throw new Error(messageForSupabaseError(error));
  }
  return count ?? 0;
}

/**
 * "Excluir obra" (US21-CA1). If the obra has concretagens, deletion is blocked
 * with the exact message and the caller must offer "Inativar". Otherwise the
 * obra is soft-deleted (lifetime retention forbids a physical DELETE — §7.1).
 */
export async function excluirObra(id: string): Promise<void> {
  if ((await countConcretagens(id)) > 0) {
    throw new ObraComConcretagensError();
  }
  await inativarObra(id);
}
