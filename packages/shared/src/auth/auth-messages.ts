/**
 * Resolves an {@link AuthErrorCode} to its exact Portuguese message from the
 * central catalog (SPEC §3). Kept next to the auth domain so apps import a
 * single helper instead of reaching into the catalog shape.
 */
import { MESSAGES } from '../messages/messages.ts';

import { type AuthErrorCode } from './auth-errors.ts';

const AUTH_CODE_MESSAGE: Readonly<Record<AuthErrorCode, string>> = {
  invalidCredentials: MESSAGES.auth.invalidCredentials,
  tooManyAttempts: MESSAGES.auth.tooManyAttempts,
  sessionExpired: MESSAGES.auth.sessionExpired,
  generic: MESSAGES.http.serverError,
};

/** Maps a stable auth code to the exact PT copy shown to the user. */
export function authErrorMessage(code: AuthErrorCode): string {
  return AUTH_CODE_MESSAGE[code];
}
