export {
  type Platform,
  type NavArea,
  ROLE_ALLOWED_AREAS,
  roleHome,
  canAccessArea,
} from './navigation.ts';
export {
  type LoginThrottleConfig,
  type LoginThrottleState,
  DEFAULT_LOGIN_THROTTLE,
  evaluateLoginThrottle,
  pruneLoginAttempts,
} from './login-throttle.ts';
export { type AuthErrorCode, type AuthErrorLike, mapSupabaseAuthError } from './auth-errors.ts';
export { authErrorMessage } from './auth-messages.ts';
export { loginCredentialsSchema, type LoginCredentials } from './login-schema.ts';
