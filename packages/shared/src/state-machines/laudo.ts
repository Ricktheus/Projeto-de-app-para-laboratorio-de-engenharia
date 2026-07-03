import type { CpStatus, LaudoStatus } from '../enums';

import { isCpTerminal } from './cp';
import { allow, deny, type GuardResult } from './types';

/**
 * Laudo (report) state machine — transitions per PRD §5.2:
 *
 *   rascunho          → pronto_assinatura
 *   pronto_assinatura → assinado
 *   assinado          → substituido
 *   substituido       → (terminal)
 */
const LAUDO_TRANSITIONS: Readonly<Record<LaudoStatus, readonly LaudoStatus[]>> = {
  rascunho: ['pronto_assinatura'],
  pronto_assinatura: ['assinado'],
  assinado: ['substituido'],
  substituido: [],
};

/** The states reachable from `from` (empty for terminal states). */
export function laudoAllowedTransitions(from: LaudoStatus): readonly LaudoStatus[] {
  return LAUDO_TRANSITIONS[from];
}

export interface LaudoGuardContext {
  /** Statuses of ALL specimens covering the report's ages. */
  cpStatuses?: readonly CpStatus[];
  /** URL of the uploaded signed PDF — required to mark the report `assinado`. */
  pdfAssinadoUrl?: string | null;
}

/**
 * Guard for `rascunho → pronto_assinatura`: every specimen covering the
 * report's ages must be in a terminal state (no pending specimens). An empty /
 * missing specimen list is treated as pending (`CPS_PENDENTES`).
 */
export function canMarcarProntoAssinatura(context: LaudoGuardContext): GuardResult {
  const statuses = context.cpStatuses;
  if (statuses === undefined || statuses.length === 0) {
    return deny('CPS_PENDENTES');
  }
  return statuses.every(isCpTerminal) ? allow() : deny('CPS_PENDENTES');
}

/**
 * Guard for `pronto_assinatura → assinado`: the signed PDF must already exist
 * (never mark a report signed without the upload). Missing → `SEM_PDF_ASSINADO`.
 */
export function canMarcarAssinado(context: LaudoGuardContext): GuardResult {
  const url = context.pdfAssinadoUrl;
  if (typeof url !== 'string' || url.trim().length === 0) {
    return deny('SEM_PDF_ASSINADO');
  }
  return allow();
}

/**
 * Evaluates a laudo status transition and its guards (PRD §5.2):
 * - unknown transition → `TRANSICAO_INVALIDA`
 * - `pronto_assinatura` requires all covered CPs terminal → `CPS_PENDENTES`
 * - `assinado` requires `pdfAssinadoUrl` → `SEM_PDF_ASSINADO`
 * - `substituido` (versioning) is always allowed from `assinado`
 */
export function canTransitionLaudo(
  from: LaudoStatus,
  to: LaudoStatus,
  context: LaudoGuardContext = {},
): GuardResult {
  if (!LAUDO_TRANSITIONS[from].includes(to)) {
    return deny('TRANSICAO_INVALIDA');
  }
  if (to === 'pronto_assinatura') {
    return canMarcarProntoAssinatura(context);
  }
  if (to === 'assinado') {
    return canMarcarAssinado(context);
  }
  return allow();
}
