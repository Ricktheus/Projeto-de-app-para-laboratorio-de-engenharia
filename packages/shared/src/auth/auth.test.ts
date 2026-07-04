import { describe, expect, it } from 'vitest';

import { MESSAGES } from '../messages/messages';

import { mapSupabaseAuthError } from './auth-errors';
import { authErrorMessage } from './auth-messages';
import {
  DEFAULT_LOGIN_THROTTLE,
  evaluateLoginThrottle,
  pruneLoginAttempts,
} from './login-throttle';
import { ROLE_ALLOWED_AREAS, canAccessArea, roleHome } from './navigation';

describe('role-based navigation (F-S003-2)', () => {
  it('routes each role to its home area per platform', () => {
    expect(roleHome('socio_campo', 'mobile')).toBe('campo');
    expect(roleHome('socio_campo', 'web')).toBe('campo');
    // eng_lab is platform-sensitive: prensa on mobile, painel on web.
    expect(roleHome('eng_lab', 'mobile')).toBe('prensa');
    expect(roleHome('eng_lab', 'web')).toBe('painel');
    expect(roleHome('eng_escritorio', 'web')).toBe('painel');
    expect(roleHome('cliente', 'web')).toBe('portal');
  });

  it('every home area is an area the role is allowed to open', () => {
    for (const platform of ['mobile', 'web'] as const) {
      for (const role of ['socio_campo', 'eng_lab', 'eng_escritorio', 'cliente'] as const) {
        expect(canAccessArea(role, roleHome(role, platform))).toBe(true);
      }
    }
  });

  it('socio_campo cannot reach user management nor the press screen (DoD)', () => {
    expect(canAccessArea('socio_campo', 'usuarios')).toBe(false);
    expect(canAccessArea('socio_campo', 'prensa')).toBe(false);
    expect(canAccessArea('socio_campo', 'campo')).toBe(true);
  });

  it('denies unlisted areas by default (matches RLS deny-by-default)', () => {
    expect(canAccessArea('cliente', 'painel')).toBe(false);
    expect(canAccessArea('cliente', 'usuarios')).toBe(false);
    expect(canAccessArea('eng_escritorio', 'prensa')).toBe(false);
    expect(ROLE_ALLOWED_AREAS.cliente).toEqual(['portal']);
  });
});

describe('login throttle (F-S003-1 sad path)', () => {
  const now = 1_000_000_000_000;

  it('allows submits below the 3-attempt threshold', () => {
    expect(evaluateLoginThrottle([now - 1_000, now - 2_000], now)).toEqual({
      blocked: false,
      retryAfterMs: 0,
    });
  });

  it('blocks after 3 failures within 5 min, for 1 min from the last failure', () => {
    const attempts = [now - 3_000, now - 2_000, now - 1_000];
    const verdict = evaluateLoginThrottle(attempts, now);
    expect(verdict.blocked).toBe(true);
    // last failure was 1s ago; block is 60s ⇒ ~59s remaining.
    expect(verdict.retryAfterMs).toBe(DEFAULT_LOGIN_THROTTLE.blockMs - 1_000);
  });

  it('lifts the block once 1 min has passed since the last failure', () => {
    const attempts = [now - 63_000, now - 62_000, now - 61_000];
    expect(evaluateLoginThrottle(attempts, now).blocked).toBe(false);
  });

  it('ignores failures older than the 5-min window', () => {
    const attempts = [now - 10 * 60_000, now - 9 * 60_000, now - 8 * 60_000];
    expect(evaluateLoginThrottle(attempts, now).blocked).toBe(false);
    expect(pruneLoginAttempts(attempts, now)).toEqual([]);
  });
});

describe('auth error mapping (US17-CA2 — no user enumeration)', () => {
  it('collapses wrong e-mail and wrong password to the same generic message', () => {
    const code = mapSupabaseAuthError({ status: 400, message: 'Invalid login credentials' });
    expect(code).toBe('invalidCredentials');
    expect(authErrorMessage(code)).toBe('E-mail ou senha inválidos.');
  });

  it('maps 429 / rate-limit to the too-many-attempts message', () => {
    expect(mapSupabaseAuthError({ status: 429 })).toBe('tooManyAttempts');
    expect(mapSupabaseAuthError({ code: 'over_request_rate_limit' })).toBe('tooManyAttempts');
    expect(authErrorMessage('tooManyAttempts')).toBe(MESSAGES.auth.tooManyAttempts);
  });

  it('maps 401 to the expired-session message', () => {
    expect(mapSupabaseAuthError({ status: 401 })).toBe('sessionExpired');
    expect(authErrorMessage('sessionExpired')).toBe('Sua sessão expirou. Faça login novamente.');
  });

  it('maps a null error to the generic server message', () => {
    expect(mapSupabaseAuthError(null)).toBe('generic');
    expect(authErrorMessage('generic')).toBe(MESSAGES.http.serverError);
  });
});
