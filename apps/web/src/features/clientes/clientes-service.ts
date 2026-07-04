import { type ConvidarClienteInput } from '@concreto/shared';

import { invokeFunction } from '../../services/functions';
import { supabase } from '../../services/supabase';

/** A client row as listed on the management screen (F-S004-1). */
export interface ClienteRow {
  id: string;
  nome: string;
  cnpj: string | null;
  email: string | null;
  ativo: boolean;
}

/** Lists clients (RLS `clientes_admin_all` limits this to admins). */
export async function listClientes(): Promise<ClienteRow[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome, cnpj, email, ativo')
    .order('nome', { ascending: true });
  if (error) {
    throw error;
  }
  return data ?? [];
}

/**
 * Provisions a new client: the Edge Function creates the credential via
 * `inviteUserByEmail` and the `clientes` row (US16-CA1). Exact error copy comes
 * straight from the function's envelope.
 */
export async function criarCliente(
  input: Omit<ConvidarClienteInput, 'tipo'>,
): Promise<{ user_id: string; cliente_id?: string | null }> {
  return invokeFunction('admin-provisionar-usuario', { tipo: 'cliente', ...input });
}
