import { z } from 'zod';

import { CP_STATUSES, LAUDO_STATUSES, LAUDO_TIPOS, TIPO_FRATURAS, USER_ROLES } from '../enums.ts';
import { isValidCnpj } from '../lib/cnpj.ts';

/**
 * Builds a `z.enum` from a readonly `as const` tuple while preserving the literal
 * union type. zod's `enum` is typed against a mutable tuple, so a single narrow
 * cast keeps our single-source-of-truth enum arrays reusable without widening.
 */
function zodEnum<T extends string>(
  values: readonly [T, ...T[]] | readonly T[],
): z.ZodEnum<[T, ...T[]]> {
  return z.enum(values as unknown as [T, ...T[]]);
}

export const uuidSchema = z.string().uuid();

/** ISO calendar date, 'YYYY-MM-DD'. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida. Use o formato AAAA-MM-DD.');

export const emailSchema = z.string().email('E-mail inválido.');

/** CNPJ validated by its check digits; message per Appendix A #6. */
export const cnpjSchema = z.string().refine(isValidCnpj, { message: 'CNPJ inválido.' });

export const userRoleSchema = zodEnum(USER_ROLES);
export const cpStatusSchema = zodEnum(CP_STATUSES);
export const laudoStatusSchema = zodEnum(LAUDO_STATUSES);
export const laudoTipoSchema = zodEnum(LAUDO_TIPOS);
export const tipoFraturaSchema = zodEnum(TIPO_FRATURAS);
