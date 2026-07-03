/**
 * Login form validation shared by the mobile and web apps (F-S003-1).
 *
 * Kept in `packages/shared` so both clients validate credentials identically
 * (DRY) and surface the same Portuguese field messages. Domain-level input
 * validation only — authentication itself is delegated to Supabase Auth.
 */
import { z } from 'zod';

export const loginCredentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe o e-mail.')
    .email('E-mail inválido.'),
  password: z.string().min(1, 'Informe a senha.'),
});

export type LoginCredentials = z.infer<typeof loginCredentialsSchema>;
