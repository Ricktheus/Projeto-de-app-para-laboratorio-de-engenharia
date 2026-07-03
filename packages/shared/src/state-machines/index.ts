export {
  CP_TERMINAL_STATUSES,
  isCpTerminal,
  cpAllowedTransitions,
  isBeforeTargetAge,
  canRomper,
  canTransitionCp,
  type CpGuardContext,
  type CpLike,
} from './cp';
export {
  laudoAllowedTransitions,
  canMarcarProntoAssinatura,
  canMarcarAssinado,
  canTransitionLaudo,
  type LaudoGuardContext,
} from './laudo';
export { canTransition } from './transition';
export { allow, deny, type GuardResult, type TransitionReason, type StateEntity } from './types';
