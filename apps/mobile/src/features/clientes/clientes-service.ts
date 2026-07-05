import { messageForSupabaseError } from '@concreto/shared';

import { supabase } from '../../services/supabase';

/** A client option for the obra form (RLS `clientes_internos_select`, US20). */
export interface ClienteOption {
  id: string;
  nome: string;
}

/** Lists active clients so the partner can attach an obra to one (US20). */
export async function listClientes(): Promise<ClienteOption[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome', { ascending: true });
  if (error) {
    throw new Error(messageForSupabaseError(error));
  }
  return data ?? [];
}
