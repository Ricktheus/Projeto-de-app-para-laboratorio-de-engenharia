/**
 * Result of a state-machine guard / transition check.
 *
 * `reason` is a stable machine-readable code (never a localized string) that the
 * UI/infra maps to a Portuguese message or an HTTP status. Codes mirror the RPC
 * guard codes in SPEC §4.6 / §5.2.
 */
export interface GuardResult {
  ok: boolean;
  reason?: TransitionReason;
}

/** All reason codes a guard can emit, across every entity. */
export type TransitionReason =
  // shared
  | 'TRANSICAO_INVALIDA'
  // corpo de prova
  | 'CP_ESTADO_INVALIDO'
  | 'MOTIVO_OBRIGATORIO'
  | 'CP_MANDATORIO_28D'
  // laudo
  | 'CPS_PENDENTES'
  | 'SEM_PDF_ASSINADO';

/** The state-machine entities exposed by {@link canTransition}. */
export type StateEntity = 'cp' | 'laudo';

/** Convenience constructor for a successful guard result. */
export const allow = (): GuardResult => ({ ok: true });

/** Convenience constructor for a blocked guard result. */
export const deny = (reason: TransitionReason): GuardResult => ({ ok: false, reason });
