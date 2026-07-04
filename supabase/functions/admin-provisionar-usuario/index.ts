/**
 * POST /functions/v1/admin-provisionar-usuario (F-S004-1 / US16).
 *
 * Admins-only (eng_lab / eng_escritorio, `is_admin = true`) creation of clients
 * and internal users. Creates the credential via `inviteUserByEmail` (a
 * service_role, server-only Auth Admin operation — NEVER exposed to the browser)
 * and, for a client, its `clientes` row. The welcome e-mail with the portal link
 * and password-setup is the Supabase invite e-mail (US24-CA4).
 *
 * Exact error copy (SPEC F-S004-1):
 *   403 "Você não tem permissão para executar esta ação." (non-admin)
 *   400 "CNPJ inválido."
 *   409 "Já existe um usuário com este e-mail."
 *
 * NOTE: the SPEC has no §5 contract for this endpoint but prescribes
 * `inviteUserByEmail` (admin-only). We add this function per the SPEC's
 * "adopt the safest standard and document it" rule (Apêndice A).
 */
import { MESSAGES, provisionarUsuarioRequestSchema } from '@concreto/shared';

import { errorResponse, handlePreflight, jsonResponse } from '../_shared/http.ts';
import { resolveCaller, serviceClient } from '../_shared/supabase.ts';

/** Heuristic for the Supabase "email already registered" invite error. */
function isEmailAlreadyRegistered(error: {
  message?: string;
  code?: string;
  status?: number;
}): boolean {
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === 'email_exists' ||
    error.status === 422 ||
    msg.includes('already been registered') ||
    msg.includes('already registered') ||
    msg.includes('already exists')
  );
}

Deno.serve(async (req: Request): Promise<Response> => {
  const preflight = handlePreflight(req);
  if (preflight) {
    return preflight;
  }

  // ----- Auth: resolve the caller.
  const caller = await resolveCaller(req.headers.get('Authorization'));
  if (!caller) {
    return errorResponse(401, 'NAO_AUTENTICADO', MESSAGES.http.unauthorized);
  }

  const service = serviceClient();

  // ----- Authorization: admins only (US16-CA2).
  const { data: profile } = await service
    .from('usuarios')
    .select('is_admin')
    .eq('id', caller.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return errorResponse(403, 'SEM_PERMISSAO', MESSAGES.http.forbidden);
  }

  // ----- Validate payload.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, 'PAYLOAD_INVALIDO', MESSAGES.http.validation);
  }
  const parsed = provisionarUsuarioRequestSchema.safeParse(body);
  if (!parsed.success) {
    const cnpjIssue = parsed.error.issues.find((i) => i.path.includes('cnpj'));
    if (cnpjIssue) {
      return errorResponse(400, 'CNPJ_INVALIDO', MESSAGES.feature.cnpjInvalido);
    }
    return errorResponse(400, 'PAYLOAD_INVALIDO', MESSAGES.http.validation);
  }
  const input = parsed.data;

  if (input.tipo === 'usuario') {
    // ----- Internal user: invite with the chosen role/admin flag.
    const { data, error } = await service.auth.admin.inviteUserByEmail(input.email, {
      data: { role: input.role, is_admin: input.isAdmin, nome: input.nome },
    });
    if (error) {
      if (isEmailAlreadyRegistered(error)) {
        return errorResponse(409, 'EMAIL_JA_CADASTRADO', MESSAGES.feature.emailJaCadastrado);
      }
      console.error('[admin-provisionar-usuario] invite (usuario) falhou:', error);
      return errorResponse(500, 'ERRO_INTERNO', MESSAGES.http.serverError);
    }
    return jsonResponse({ user_id: data.user.id }, 201);
  }

  // ----- Client: invite first (so a duplicate e-mail creates nothing), then
  // the `clientes` row, then link the profile. Roll back the auth user if the
  // client row cannot be created.
  const { data: invited, error: inviteError } = await service.auth.admin.inviteUserByEmail(
    input.email,
    { data: { role: 'cliente', nome: input.nome } },
  );
  if (inviteError) {
    if (isEmailAlreadyRegistered(inviteError)) {
      return errorResponse(409, 'EMAIL_JA_CADASTRADO', MESSAGES.feature.emailJaCadastrado);
    }
    console.error('[admin-provisionar-usuario] invite (cliente) falhou:', inviteError);
    return errorResponse(500, 'ERRO_INTERNO', MESSAGES.http.serverError);
  }
  const userId = invited.user.id;

  const { data: cliente, error: clienteError } = await service
    .from('clientes')
    .insert({ nome: input.nome, cnpj: input.cnpj, email: input.email })
    .select('id')
    .single();
  if (clienteError || !cliente) {
    // Roll back the invite (auth.users ON DELETE CASCADE removes the profile).
    await service.auth.admin.deleteUser(userId);
    console.error('[admin-provisionar-usuario] criacao de cliente falhou:', clienteError);
    return errorResponse(409, 'CLIENTE_CONFLITO', MESSAGES.http.conflict);
  }

  // Link the portal user to its client (RLS `clientes_self_select`).
  await service.from('usuarios').update({ cliente_id: cliente.id }).eq('id', userId);
  await service.auth.admin.updateUserById(userId, {
    user_metadata: { role: 'cliente', nome: input.nome, cliente_id: cliente.id },
  });

  return jsonResponse({ user_id: userId, cliente_id: cliente.id }, 201);
});
