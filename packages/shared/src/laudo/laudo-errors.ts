import { MESSAGES } from '../messages/messages';
import { messageForSupabaseError, type SupabaseErrorLike } from '../net/supabase-error';

/**
 * Machine tokens the laudo lifecycle RPCs (`marcar_pronto_assinatura`,
 * `emitir_laudo_parcial`, `agrupar_laudo` — SPEC §4.6 + F-S007-3) raise as the
 * exception MESSAGE. As with the press RPCs, the server signals the exact
 * business condition so the office panel renders the precise Portuguese string
 * F-S007-3 prescribes (DRY: the copy lives once in the shared catalog).
 */
export const LAUDO_RPC_TOKENS = [
  'CPS_PENDENTES',
  'SEM_RESULTADOS',
  'IDADE_PARCIAL_INVALIDA',
  'OBRAS_DIFERENTES',
  'POUCAS_CONCRETAGENS',
  'LAUDO_NAO_ENCONTRADO',
  'LAUDO_NAO_RASCUNHO',
  'LAUDO_NAO_ASSINADO',
  'NUMERO_INVALIDO',
  'NUMERO_DUPLICADO',
  'LAUDO_NAO_EDITAVEL',
] as const;
export type LaudoRpcToken = (typeof LAUDO_RPC_TOKENS)[number];

/**
 * Resolves the exact Portuguese message for a failed laudo lifecycle RPC
 * (F-S007-3):
 *  - `CPS_PENDENTES`          ⇒ "Existem CPs pendentes nesta(s) idade(s)…" (sad path).
 *  - `SEM_RESULTADOS`         ⇒ "Não há resultados válidos para gerar o laudo."
 *  - `IDADE_PARCIAL_INVALIDA` ⇒ partial only for 7/14 days.
 *  - `OBRAS_DIFERENTES`       ⇒ grouping requires the same obra (US13-CA3).
 *  - `POUCAS_CONCRETAGENS`    ⇒ grouping requires ≥ 2 NFs.
 *  - `LAUDO_NAO_ENCONTRADO`   ⇒ generic 404 "Registro não encontrado.".
 *  - `LAUDO_NAO_RASCUNHO`     ⇒ the draft moved on; reload.
 *  - `LAUDO_NAO_ASSINADO`     ⇒ only a signed report can be corrected (F-S008-3).
 *  - anything else            ⇒ the generic Supabase/HTTP mapping (401/403/500…).
 */
export function messageForLaudoRpcError(error: SupabaseErrorLike): string {
  const token = (error.message ?? '').trim();
  switch (token) {
    case 'CPS_PENDENTES':
      return MESSAGES.domain.CPS_PENDENTES;
    case 'SEM_RESULTADOS':
      return MESSAGES.domain.SEM_RESULTADOS;
    case 'IDADE_PARCIAL_INVALIDA':
      return MESSAGES.feature.laudoParcialIdadeInvalida;
    case 'OBRAS_DIFERENTES':
      return MESSAGES.feature.laudoAgruparObrasDiferentes;
    case 'POUCAS_CONCRETAGENS':
      return MESSAGES.feature.laudoAgruparPoucas;
    case 'LAUDO_NAO_ENCONTRADO':
      return MESSAGES.http.notFound;
    case 'LAUDO_NAO_RASCUNHO':
      return MESSAGES.feature.laudoNaoRascunho;
    case 'LAUDO_NAO_ASSINADO':
      return MESSAGES.domain.LAUDO_NAO_ASSINADO;
    case 'NUMERO_INVALIDO':
      return MESSAGES.feature.laudoNumeroInvalido;
    case 'NUMERO_DUPLICADO':
      return MESSAGES.feature.laudoNumeroDuplicado;
    case 'LAUDO_NAO_EDITAVEL':
      return MESSAGES.feature.laudoNaoEditavel;
    default:
      return messageForSupabaseError(error);
  }
}
