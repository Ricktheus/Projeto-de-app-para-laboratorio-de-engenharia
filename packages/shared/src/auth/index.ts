export {
  type Platform,
  type NavArea,
  ROLE_ALLOWED_AREAS,
  roleHome,
  canAccessArea,
} from './navigation';
export {
  type LoginThrottleConfig,
  type LoginThrottleState,
  DEFAULT_LOGIN_THROTTLE,
  evaluateLoginThrottle,
  pruneLoginAttempts,
} from './login-throttle';
export { type AuthErrorCode, type AuthErrorLike, mapSupabaseAuthError } from './auth-errors';
export { authErrorMessage } from './auth-messages';
