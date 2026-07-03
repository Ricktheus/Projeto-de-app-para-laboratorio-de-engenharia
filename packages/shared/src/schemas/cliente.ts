import { z } from 'zod';

import { cnpjSchema, emailSchema } from './common';

/**
 * Client create/update form payload. `id`, `created_at`, `updated_at` are
 * server-managed and intentionally absent. Reused by the web form and any
 * Edge Function that writes a client (DRY).
 */
export const clienteSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do cliente.'),
  cnpj: cnpjSchema.nullish(),
  email: emailSchema.nullish(),
  ativo: z.boolean().optional(),
});

export type ClienteInput = z.infer<typeof clienteSchema>;
