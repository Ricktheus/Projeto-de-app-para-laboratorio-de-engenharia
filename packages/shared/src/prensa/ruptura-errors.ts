import { cpMandatorio28dMessage, MESSAGES } from '../messages/messages.ts';
import { messageForSupabaseError, type SupabaseErrorLike } from '../net/supabase-error.ts';

/**
 * Machine tokens the `registrar_ruptura` RPC raises as the exception MESSAGE
 * (SPEC §4.6 / §5.2). Like `coletar_cp`, the RPC signals the exact business
 * condition so the press screen can render the precise Portuguese string
 * F-S006-2 prescribes. For the mandatory-28d block the specimen's target age
 * and earliest allowed rupture date travel in the error DETAIL as `idade|data`.
 */
export const REGISTRAR_RUPTURA_TOKENS = [
  'CP_NAO_ENCONTRADO',
  'CP_ESTADO_INVALIDO',
  'CP_MANDATORIO_28D',
  'CARGA_INVALIDA',
] as const;
export type RegistrarRupturaToken = (typeof REGISTRAR_RUPTURA_TOKENS)[number];

/**
 * Parses the `idade|data` DETAIL the RPC attaches to a `CP_MANDATORIO_28D`
 * error, e.g. `28|2026-06-17`. Missing/invalid parts fall back to `undefined`
 * so {@link cpMandatorio28dMessage} uses its own defaults.
 */
function parseMandatorioDetail(detail: string): { idade?: number; data?: string } {
  const [idadeRaw = '', dataRaw = ''] = detail.split('|');
  const idade = Number.parseInt(idadeRaw.trim(), 10);
  const data = dataRaw.trim();
  return {
    idade: Number.isFinite(idade) && idade > 0 ? idade : undefined,
    data: data.length > 0 ? data : undefined,
  };
}

/**
 * Resolves the exact Portuguese message for a failed `registrar_ruptura` call
 * (F-S006-2, SPEC §5.2):
 *  - `CP_NAO_ENCONTRADO`  ⇒ "CP não encontrado."
 *  - `CP_ESTADO_INVALIDO` ⇒ "Este CP não está disponível para ruptura."
 *  - `CARGA_INVALIDA`     ⇒ "Informe uma carga de ruptura válida."
 *  - `CP_MANDATORIO_28D`  ⇒ "Este CP de {idade}d é obrigatório e não pode ser
 *                            rompido antes da idade prevista ({data})."
 *  - anything else        ⇒ the generic Supabase/HTTP mapping (401/403/500…).
 *
 * Keeping this in the shared domain guarantees the interpolation and the
 * fallback behave identically wherever rupture registration runs (DRY / SOLID).
 */
export function messageForRegistrarRupturaError(error: SupabaseErrorLike): string {
  const token = (error.message ?? '').trim();
  if (token === 'CP_NAO_ENCONTRADO') {
    return MESSAGES.domain.CP_NAO_ENCONTRADO;
  }
  if (token === 'CP_ESTADO_INVALIDO') {
    return MESSAGES.domain.CP_ESTADO_INVALIDO;
  }
  if (token === 'CARGA_INVALIDA') {
    return MESSAGES.domain.CARGA_INVALIDA;
  }
  if (token === 'CP_MANDATORIO_28D') {
    return cpMandatorio28dMessage(parseMandatorioDetail((error.details ?? '').trim()));
  }
  return messageForSupabaseError(error);
}
