/**
 * Domain enums — the framework-agnostic mirror of the Postgres enums declared
 * in `supabase/migrations/0001_enums.sql`. These are the single source of truth
 * for enum shapes in the domain core; schemas, constants and state machines all
 * derive from them so the app, web and Edge Functions never drift from the DB.
 *
 * Keep these values byte-for-byte identical to the SQL enums.
 */

export const USER_ROLES = ['socio_campo', 'eng_lab', 'eng_escritorio', 'cliente'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const CP_STATUSES = ['moldado', 'coletado', 'rompido', 'descartado', 'expurgado'] as const;
export type CpStatus = (typeof CP_STATUSES)[number];

export const LAUDO_STATUSES = ['rascunho', 'pronto_assinatura', 'assinado', 'substituido'] as const;
export type LaudoStatus = (typeof LAUDO_STATUSES)[number];

export const LAUDO_TIPOS = ['parcial_7d', 'parcial_14d', 'final_28d'] as const;
export type LaudoTipo = (typeof LAUDO_TIPOS)[number];

export const AUDIT_ACTIONS = ['INSERT', 'UPDATE', 'DELETE'] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const TIPO_FRATURAS = [
  'ruptura_cabeca',
  'ruptura_face',
  'ruptura_parcial',
  'ruptura_total',
  'ruptura_cisalhamento',
  'ruptura_trinca',
] as const;
export type TipoFratura = (typeof TIPO_FRATURAS)[number];

export const isUserRole = (value: unknown): value is UserRole =>
  USER_ROLES.includes(value as UserRole);
export const isCpStatus = (value: unknown): value is CpStatus =>
  CP_STATUSES.includes(value as CpStatus);
export const isLaudoStatus = (value: unknown): value is LaudoStatus =>
  LAUDO_STATUSES.includes(value as LaudoStatus);
export const isLaudoTipo = (value: unknown): value is LaudoTipo =>
  LAUDO_TIPOS.includes(value as LaudoTipo);
export const isTipoFratura = (value: unknown): value is TipoFratura =>
  TIPO_FRATURAS.includes(value as TipoFratura);
