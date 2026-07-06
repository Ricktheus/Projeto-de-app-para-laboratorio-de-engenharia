import { MESSAGES } from '../messages/messages';
import { messageForSupabaseError, type SupabaseErrorLike } from '../net/supabase-error';

/**
 * Machine tokens the `descartar_cp` / `expurgar_resultado` RPCs raise as the
 * exception MESSAGE (SPEC §4.6 / F-S006-4). The `motivo`-required guard is the
 * primary sad path (US10 edge case); the state/not-found tokens are
 * defense-in-depth for calls the UI already prevents.
 */
export const DESCARTE_TOKENS = [
  'MOTIVO_OBRIGATORIO',
  'CP_NAO_ENCONTRADO',
  'CP_ESTADO_INVALIDO',
] as const;
export type DescarteToken = (typeof DESCARTE_TOKENS)[number];

/**
 * Resolves the exact Portuguese message for a failed discard/purge call
 * (F-S006-4):
 *  - `MOTIVO_OBRIGATORIO` ⇒ "Informe o motivo do descarte/expurgo." (blocks)
 *  - `CP_NAO_ENCONTRADO`  ⇒ "CP não encontrado."
 *  - `CP_ESTADO_INVALIDO` ⇒ "Este corpo de prova não está em um estado válido
 *                            para esta ação."
 *  - anything else        ⇒ the generic Supabase/HTTP mapping (401/403/500…).
 *
 * Lives in the shared domain so the discard and purge flows render identical
 * copy wherever they run (DRY / SOLID).
 */
export function messageForDescarteError(error: SupabaseErrorLike): string {
  const token = (error.message ?? '').trim();
  if (token === 'MOTIVO_OBRIGATORIO') {
    return MESSAGES.feature.motivoDescarteObrigatorio;
  }
  if (token === 'CP_NAO_ENCONTRADO') {
    return MESSAGES.domain.CP_NAO_ENCONTRADO;
  }
  if (token === 'CP_ESTADO_INVALIDO') {
    return MESSAGES.feature.cpEstadoInvalidoAcao;
  }
  return messageForSupabaseError(error);
}
