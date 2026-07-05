import { messageForSupabaseError, type ObraInput } from '@concreto/shared';

import { supabase } from '../../services/supabase';

/** An obra row as listed on the field screen (F-S004-2). */
export interface ObraRow {
  id: string;
  nome: string;
  sigla: string;
  cliente_id: string;
  ativo: boolean;
  cliente_nome: string | null;
}

interface ObraJoinRow {
  id: string;
  nome: string;
  sigla: string;
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

/** Lists active obras available for concretagem (US20-CA1). */
export async function listObras(): Promise<ObraRow[]> {
  const { data, error } = await supabase
    .from('obras')
    .select('id, nome, sigla, cliente_id, ativo, clientes(nome)')
    .eq('ativo', true)
    .order('nome', { ascending: true });
  if (error) {
    throw new Error(messageForSupabaseError(error));
  }
  return ((data as ObraJoinRow[] | null) ?? []).map((row) => ({
    id: row.id,
    nome: row.nome,
    sigla: row.sigla,
    cliente_id: row.cliente_id,
    ativo: row.ativo,
    cliente_nome: clienteNome(row.clientes),
  }));
}

/**
 * Creates an obra (US20). GPS is filled when the device authorized location;
 * a denied permission simply leaves it null (US20-CA2, never blocks). A
 * duplicate sigla raises the exact "Já existe uma obra…" message (US20-CA3).
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
