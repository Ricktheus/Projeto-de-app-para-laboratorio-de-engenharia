import { cpNaoColetavelMessage, MESSAGES } from '../messages/messages';
import { messageForSupabaseError, type SupabaseErrorLike } from '../net/supabase-error';

/**
 * Machine tokens the `coletar_cp` RPC raises as the exception MESSAGE (SPEC
 * §4.6 / F-S005-4). The RPC refines the SPEC's umbrella `CP_ESTADO_INVALIDO`
 * into three distinct signals so the scanner can render the three EXACT
 * Portuguese strings F-S005-4 prescribes. For the terminal case the current
 * status travels in the error DETAIL.
 */
export const COLETAR_CP_TOKENS = [
  'CP_NAO_ENCONTRADO',
  'CP_JA_COLETADO',
  'CP_NAO_COLETAVEL',
] as const;
export type ColetarCpToken = (typeof COLETAR_CP_TOKENS)[number];

/**
 * Resolves the exact Portuguese message for a failed `coletar_cp` call
 * (F-S005-4):
 *  - `CP_NAO_ENCONTRADO` ⇒ "CP não encontrado." (QR without a matching CP)
 *  - `CP_JA_COLETADO`    ⇒ "CP já coletado." (nothing changed)
 *  - `CP_NAO_COLETAVEL`  ⇒ "Este CP não pode ser coletado (status atual: {status})."
 *  - anything else       ⇒ the generic Supabase/HTTP mapping (401/403/500…).
 *
 * Keeps this mapping in the shared domain so both the interpolation and the
 * fallback behave identically wherever collection runs (DRY / SOLID).
 */
export function messageForColetarCpError(error: SupabaseErrorLike): string {
  const token = (error.message ?? '').trim();
  if (token === 'CP_NAO_ENCONTRADO') {
    return MESSAGES.domain.CP_NAO_ENCONTRADO;
  }
  if (token === 'CP_JA_COLETADO') {
    return MESSAGES.domain.CP_JA_COLETADO;
  }
  if (token === 'CP_NAO_COLETAVEL') {
    return cpNaoColetavelMessage((error.details ?? '').trim());
  }
  return messageForSupabaseError(error);
}
