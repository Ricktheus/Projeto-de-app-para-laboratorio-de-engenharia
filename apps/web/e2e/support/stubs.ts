import { type Page, type Route } from '@playwright/test';

/**
 * Network stubs for the Supabase/Edge boundary (F-S010-2). The E2E specs drive
 * the real UI in a real browser; only the requests to the (dummy) Supabase host
 * are intercepted here, so the flows are deterministic and need no live backend.
 * Cross-origin requests require CORS headers on every fulfilled response, and the
 * custom `apikey`/`authorization` headers trigger a preflight — handled below.
 */

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
};

async function fulfillJson(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  });
}

/** Registers a JSON stub for `glob`, answering CORS preflight automatically. */
export async function stubJson(
  page: Page,
  glob: string,
  respond: (route: Route) => { status: number; body: unknown },
): Promise<void> {
  await page.route(glob, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
      return;
    }
    const { status, body } = respond(route);
    await fulfillJson(route, status, body);
  });
}

/** A GoTrue-shaped session response for the password grant. */
function sessionBody(user: { id: string; email: string }) {
  return {
    access_token: 'e2e-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'e2e-refresh-token',
    user: {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      app_metadata: { provider: 'email' },
      user_metadata: {},
      created_at: '2026-01-01T00:00:00Z',
    },
  };
}

/** Profile row shape read by `fetchProfile` (`usuarios`, `.single()` → object). */
export interface StubProfile {
  role: 'socio_campo' | 'eng_lab' | 'eng_escritorio' | 'cliente';
  nome: string;
  is_admin: boolean;
}

/** Stubs a successful sign-in: token grant + `usuarios` profile lookup. */
export async function stubLoginSuccess(
  page: Page,
  opts: { user?: { id: string; email: string }; profile: StubProfile },
): Promise<void> {
  const user = opts.user ?? { id: '11111111-1111-1111-1111-111111111111', email: 'user@lab.test' };
  await stubJson(page, '**/auth/v1/token**', () => ({ status: 200, body: sessionBody(user) }));
  await stubJson(page, '**/rest/v1/usuarios**', () => ({ status: 200, body: opts.profile }));
}

/** Stubs a failed sign-in (bad credentials → GoTrue 400). */
export async function stubLoginFailure(page: Page): Promise<void> {
  await stubJson(page, '**/auth/v1/token**', () => ({
    status: 400,
    body: {
      error: 'invalid_grant',
      error_description: 'Invalid login credentials',
      message: 'Invalid login credentials',
    },
  }));
}

/** Stubs every `laudos` list query with the given rows (PostgREST array). */
export async function stubLaudosList(page: Page, rows: unknown[]): Promise<void> {
  await stubJson(page, '**/rest/v1/laudos**', () => ({ status: 200, body: rows }));
}

/** Stubs the dashboard's specimen/rupture queries as empty (login redirect tests). */
export async function stubDashboardEmpty(page: Page): Promise<void> {
  await stubJson(page, '**/rest/v1/corpos_prova**', () => ({ status: 200, body: [] }));
  await stubJson(page, '**/rest/v1/rupturas**', () => ({ status: 200, body: [] }));
  await stubLaudosList(page, []);
}

/** Stubs the PUBLIC `validar-laudo` Edge Function with a status + body. */
export async function stubValidarLaudo(page: Page, status: number, body: unknown): Promise<void> {
  await stubJson(page, '**/functions/v1/validar-laudo**', () => ({ status, body }));
}
