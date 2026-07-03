import { isCpStatus, isLaudoStatus, type CpStatus, type LaudoStatus } from '../enums';

import { canTransitionCp, type CpGuardContext } from './cp';
import { canTransitionLaudo, type LaudoGuardContext } from './laudo';
import { deny, type GuardResult, type StateEntity } from './types';

/**
 * Unified entry point for state-machine transitions. Typed overloads keep each
 * entity's status union and context shape strict; the implementation dispatches
 * to the per-entity guard and validates raw inputs (e.g. values arriving from an
 * Edge Function) so an unknown status yields `TRANSICAO_INVALIDA` instead of
 * throwing.
 */
export function canTransition(
  entity: 'cp',
  from: CpStatus,
  to: CpStatus,
  context?: CpGuardContext,
): GuardResult;
export function canTransition(
  entity: 'laudo',
  from: LaudoStatus,
  to: LaudoStatus,
  context?: LaudoGuardContext,
): GuardResult;
export function canTransition(
  entity: StateEntity,
  from: string,
  to: string,
  context: CpGuardContext | LaudoGuardContext = {},
): GuardResult {
  if (entity === 'cp') {
    if (!isCpStatus(from) || !isCpStatus(to)) {
      return deny('TRANSICAO_INVALIDA');
    }
    return canTransitionCp(from, to, context as CpGuardContext);
  }
  if (!isLaudoStatus(from) || !isLaudoStatus(to)) {
    return deny('TRANSICAO_INVALIDA');
  }
  return canTransitionLaudo(from, to, context as LaudoGuardContext);
}
