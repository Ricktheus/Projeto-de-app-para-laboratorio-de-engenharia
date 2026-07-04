import { describe, expect, it } from 'vitest';

import { MESSAGES } from '../messages/messages';

import { isObraSiglaConflict, messageForSupabaseError } from './supabase-error';

describe('messageForSupabaseError', () => {
  it('maps the obra sigla unique-violation to the exact copy (US20-CA3)', () => {
    const error = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "uq_obra_sigla_por_cliente"',
    };
    expect(messageForSupabaseError(error)).toBe(MESSAGES.feature.obraSiglaDuplicada);
    expect(isObraSiglaConflict(error)).toBe(true);
  });

  it('maps any other unique-violation to the generic 409 conflict copy', () => {
    const error = { code: '23505', message: 'duplicate key value violates "clientes_cnpj_key"' };
    expect(messageForSupabaseError(error)).toBe(MESSAGES.http.conflict);
    expect(isObraSiglaConflict(error)).toBe(false);
  });

  it('maps an RLS permission denial (42501) to the 403 copy', () => {
    expect(messageForSupabaseError({ code: '42501', message: 'permission denied' })).toBe(
      MESSAGES.http.forbidden,
    );
  });

  it('falls back to the §3.0 status table when only a status is present', () => {
    expect(messageForSupabaseError({ status: 404 })).toBe(MESSAGES.http.notFound);
    expect(messageForSupabaseError({ status: 401 })).toBe(MESSAGES.http.unauthorized);
  });

  it('falls back to the generic server error otherwise', () => {
    expect(messageForSupabaseError({})).toBe(MESSAGES.http.serverError);
  });
});
