export {
  CP_TERMINAL_STATUSES,
  isCpTerminal,
  cpAllowedTransitions,
  isBeforeTargetAge,
  canRomper,
  canTransitionCp,
  type CpGuardContext,
  type CpLike,
} from './cp.ts';
export {
  laudoAllowedTransitions,
  canMarcarProntoAssinatura,
  canMarcarAssinado,
  canTransitionLaudo,
  type LaudoGuardContext,
} from './laudo.ts';
export { canTransition } from './transition.ts';
export { allow, deny, type GuardResult, type TransitionReason, type StateEntity } from './types.ts';
