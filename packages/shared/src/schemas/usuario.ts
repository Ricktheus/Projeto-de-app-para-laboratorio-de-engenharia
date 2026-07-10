import { z } from 'zod';

import { cnpjSchema, emailSchema } from './common.ts';

/**
 * Payloads for the `admin-provisionar-usuario` Edge Function (F-S004-1). The
 * function creates the auth credential via `inviteUserByEmail` (service_role,
 * server-only) and, for a client, its `clientes` row. A single discriminated
 * union covers both the "novo cliente" and "novo usuário interno" flows so the
 * web form and the function share one contract (DRY).
 *
 * NOTE: there is no §5 contract for this function — the SPEC prescribes
 * `inviteUserByEmail` (an admin-only, service_role operation) but leaves the
 * transport unspecified. Per the SPEC's "adopt the safest standard and document
 * it" rule, we add this Edge Function and document the assumption.
 */

/** The three internal roles an admin can provision (never 'cliente' here). */
export const internalRoleSchema = z.enum(['socio_campo', 'eng_lab', 'eng_escritorio']);
export type InternalRole = z.infer<typeof internalRoleSchema>;

/** New client: creates the `clientes` row and invites the portal user (US16-CA1). */
export const convidarClienteSchema = z.object({
  tipo: z.literal('cliente'),
  nome: z.string().trim().min(1, 'Informe o nome do cliente.'),
  cnpj: cnpjSchema,
  email: emailSchema,
});
export type ConvidarClienteInput = z.infer<typeof convidarClienteSchema>;

/** New internal user: invites the credential with the chosen internal role. */
export const convidarUsuarioInternoSchema = z.object({
  tipo: z.literal('usuario'),
  nome: z.string().trim().min(1, 'Informe o nome do usuário.'),
  email: emailSchema,
  role: internalRoleSchema,
  /** `true` only for the 2 engineer partners (user-management privilege). */
  isAdmin: z.boolean().optional().default(false),
});
export type ConvidarUsuarioInternoInput = z.infer<typeof convidarUsuarioInternoSchema>;

/** Discriminated request accepted by `admin-provisionar-usuario`. */
export const provisionarUsuarioRequestSchema = z.discriminatedUnion('tipo', [
  convidarClienteSchema,
  convidarUsuarioInternoSchema,
]);
export type ProvisionarUsuarioRequest = z.infer<typeof provisionarUsuarioRequestSchema>;

/** Success response: the created ids (cliente_id present only for a client). */
export const provisionarUsuarioResponseSchema = z.object({
  user_id: z.string().uuid(),
  cliente_id: z.string().uuid().nullish(),
});
export type ProvisionarUsuarioResponse = z.infer<typeof provisionarUsuarioResponseSchema>;
