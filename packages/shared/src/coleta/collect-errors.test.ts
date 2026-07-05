import { describe, expect, it } from 'vitest';

import { MESSAGES } from '../messages/messages';

import { messageForColetarCpError } from './collect-errors';

describe('messageForColetarCpError (F-S005-4 exact copy)', () => {
  it('maps CP_NAO_ENCONTRADO to "CP não encontrado."', () => {
    expect(messageForColetarCpError({ message: 'CP_NAO_ENCONTRADO' })).toBe('CP não encontrado.');
  });

  it('maps CP_JA_COLETADO to "CP já coletado."', () => {
    expect(messageForColetarCpError({ message: 'CP_JA_COLETADO' })).toBe('CP já coletado.');
  });

  it('interpolates the current status for CP_NAO_COLETAVEL (from error DETAIL)', () => {
    expect(messageForColetarCpError({ message: 'CP_NAO_COLETAVEL', details: 'rompido' })).toBe(
      'Este CP não pode ser coletado (status atual: rompido).',
    );
    expect(messageForColetarCpError({ message: 'CP_NAO_COLETAVEL', details: 'descartado' })).toBe(
      'Este CP não pode ser coletado (status atual: descartado).',
    );
  });

  it('falls back to the generic HTTP/permission mapping for other errors', () => {
    expect(messageForColetarCpError({ code: '42501' })).toBe(MESSAGES.http.forbidden);
    expect(messageForColetarCpError({ status: 401 })).toBe(MESSAGES.http.unauthorized);
    expect(messageForColetarCpError({})).toBe(MESSAGES.http.serverError);
  });
});
