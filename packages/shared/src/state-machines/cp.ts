import type { CpStatus } from '../enums.ts';
import { toUtcDayNumber, type DateInput } from '../lib/date.ts';

import { allow, deny, type GuardResult } from './types.ts';

/**
 * Corpo de prova (specimen) state machine — transitions per PRD §5.1:
 *
 *   moldado   → coletado | descartado
 *   coletado  → rompido   | descartado
 *   rompido   → expurgado
 *   descartado, expurgado → (terminal)
 */
const CP_TRANSITIONS: Readonly<Record<CpStatus, readonly CpStatus[]>> = {
  moldado: ['coletado', 'descartado'],
  coletado: ['rompido', 'descartado'],
  rompido: ['expurgado'],
  descartado: [],
  expurgado: [],
};

/** States from which no further transition is possible (removed from any report if discarded/expunged). */
export const CP_TERMINAL_STATUSES: readonly CpStatus[] = ['rompido', 'descartado', 'expurgado'];

/** True when a specimen is in a terminal state. */
export function isCpTerminal(status: CpStatus): boolean {
  return CP_TERMINAL_STATUSES.includes(status);
}

/** The states reachable from `from` (empty for terminal states). */
export function cpAllowedTransitions(from: CpStatus): readonly CpStatus[] {
  return CP_TRANSITIONS[from];
}

/** Context needed to evaluate CP transition guards. */
export interface CpGuardContext {
  /** Whether this is one of the 2 mandatory 28-day specimens. */
  mandatorio28d?: boolean;
  /** Target rupture age, in days. */
  idadeAlvoDias?: number;
  /** Molding date — basis of the target rupture date. */
  dataMoldagem?: DateInput;
  /** "Now" — injectable for deterministic tests; defaults to the current date. */
  today?: DateInput;
  /** Reason text — required to discard (`descartado`) or expunge (`expurgado`). */
  motivo?: string | null;
}

/** A specimen-shaped object carrying its current status plus guard context. */
export interface CpLike extends CpGuardContext {
  status: CpStatus;
}

function hasMotivo(motivo?: string | null): boolean {
  return typeof motivo === 'string' && motivo.trim().length > 0;
}

/**
 * True when the specimen has NOT yet reached its target age. Used to block
 * early rupture of the mandatory 28-day specimens. When the age cannot be
 * determined (missing/invalid data) it returns `true` (conservative: block).
 */
export function isBeforeTargetAge(context: CpGuardContext): boolean {
  const { idadeAlvoDias, dataMoldagem, today } = context;
  if (idadeAlvoDias === undefined || dataMoldagem === undefined) {
    return true;
  }
  const targetDay = toUtcDayNumber(dataMoldagem) + idadeAlvoDias;
  const todayDay = toUtcDayNumber(today ?? new Date());
  if (Number.isNaN(targetDay) || Number.isNaN(todayDay)) {
    return true;
  }
  return todayDay < targetDay;
}

/**
 * Full rupture guard used by the press list (S006): a specimen can be ruptured
 * only from `coletado`, and a mandatory 28-day specimen cannot be ruptured
 * before its target age (`CP_MANDATORIO_28D`). Early rupture of non-mandatory
 * specimens is permitted (the UI shows a warning, not a block).
 */
export function canRomper(cp: CpLike): GuardResult {
  if (cp.status !== 'coletado') {
    return deny('CP_ESTADO_INVALIDO');
  }
  if (cp.mandatorio28d && isBeforeTargetAge(cp)) {
    return deny('CP_MANDATORIO_28D');
  }
  return allow();
}

/**
 * Evaluates a CP status transition and its guards (PRD §5.1):
 * - unknown transition → `TRANSICAO_INVALIDA`
 * - `descartado`/`expurgado` require a non-empty `motivo` → `MOTIVO_OBRIGATORIO`
 * - `rompido` blocks a mandatory 28-day specimen before age → `CP_MANDATORIO_28D`
 */
export function canTransitionCp(
  from: CpStatus,
  to: CpStatus,
  context: CpGuardContext = {},
): GuardResult {
  if (!CP_TRANSITIONS[from].includes(to)) {
    return deny('TRANSICAO_INVALIDA');
  }
  if ((to === 'descartado' || to === 'expurgado') && !hasMotivo(context.motivo)) {
    return deny('MOTIVO_OBRIGATORIO');
  }
  if (to === 'rompido' && context.mandatorio28d && isBeforeTargetAge(context)) {
    return deny('CP_MANDATORIO_28D');
  }
  return allow();
}
