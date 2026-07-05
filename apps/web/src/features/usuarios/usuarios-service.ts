import { type ConvidarUsuarioInternoInput, type UserRole } from '@concreto/shared';

import { invokeFunction } from '../../services/functions';
import { supabase } from '../../services/supabase';

/** An internal user row as listed on the management screen (F-S004-1). */
export interface UsuarioRow {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  is_admin: boolean;
  ativo: boolean;
}

/** Lists users (RLS: `is_admin` sees all rows via `usuarios_self_select`). */
export async function listUsuarios(): Promise<UsuarioRow[]> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, role, is_admin, ativo')
    .order('nome', { ascending: true });
  if (error) {
    throw error;
  }
  return data ?? [];
}

/** Provisions a new internal user through the admin Edge Function (US16). */
export async function criarUsuario(
  input: Omit<ConvidarUsuarioInternoInput, 'tipo'>,
): Promise<{ user_id: string }> {
  return invokeFunction('admin-provisionar-usuario', { tipo: 'usuario', ...input });
}
