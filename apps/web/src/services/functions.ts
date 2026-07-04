import { messageForHttpStatus, MESSAGES } from '@concreto/shared';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from './supabase';

/** An error carrying the machine code and the ready-to-render PT message. */
export class EdgeFunctionError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'EdgeFunctionError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Invokes an Edge Function and unwraps the standard `{ error, message }`
 * envelope (SPEC §5). On failure it throws an {@link EdgeFunctionError} whose
 * `message` is the exact Portuguese string the function returned — so the UI
 * shows the specified copy (e.g. "Já existe um usuário com este e-mail."). The
 * session's JWT is attached automatically by supabase-js.
 */
export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });

  if (!error) {
    return data as T;
  }

  if (error instanceof FunctionsHttpError) {
    const status = error.context.status as number;
    let envelope: { error?: string; message?: string } | null = null;
    try {
      envelope = await error.context.json();
    } catch {
      envelope = null;
    }
    throw new EdgeFunctionError(
      envelope?.message ?? messageForHttpStatus(status),
      envelope?.error ?? 'ERRO',
      status,
    );
  }

  // Network / relay failure (no HTTP response).
  throw new EdgeFunctionError(MESSAGES.http.serverError, 'ERRO_REDE', 0);
}
