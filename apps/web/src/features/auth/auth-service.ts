import type { Session } from '@supabase/supabase-js';

import { supabase } from '../../services/supabase';
import { type AuthProfile } from '../../stores/auth-store';

/**
 * Reads the current user's routing profile from `usuarios` (RLS policy
 * `usuarios_self_select` allows a user to read their own row). This is the
 * "role lida do JWT/usuarios" of SPEC F-S003-2.
 */
export async function fetchProfile(userId: string): Promise<AuthProfile> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('role, nome, is_admin')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw error ?? new Error('Perfil não encontrado.');
  }
  return { role: data.role, nome: data.nome, isAdmin: data.is_admin };
}

export interface SignInSuccess {
  session: Session;
  profile: AuthProfile;
}

/**
 * Signs in with e-mail + password and resolves the routing profile. Any auth
 * failure is thrown for the caller to map to a generic message (never leaking
 * whether the e-mail exists — US17-CA2).
 */
export async function signInWithCredentials(credentials: {
  email: string;
  password: string;
}): Promise<SignInSuccess> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error || !data.session) {
    throw error ?? new Error('Sessão não criada.');
  }

  const profile = await fetchProfile(data.session.user.id);
  return { session: data.session, profile };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
