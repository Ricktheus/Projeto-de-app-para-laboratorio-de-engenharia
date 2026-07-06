import { describe, expect, it } from 'vitest';

import { MESSAGES } from '../messages/messages';

import { messageForLaudoRpcError } from './laudo-errors';

describe('messageForLaudoRpcError (F-S007-3)', () => {
  it('maps CPS_PENDENTES to the exact SPEC copy', () => {
    expect(messageForLaudoRpcError({ message: 'CPS_PENDENTES' })).toBe(
      'Existem CPs pendentes nesta(s) idade(s). Conclua os rompimentos antes de avançar.',
    );
  });

  it('maps the partial/group guard tokens to their exact messages', () => {
    expect(messageForLaudoRpcError({ message: 'SEM_RESULTADOS' })).toBe(
      MESSAGES.domain.SEM_RESULTADOS,
    );
    expect(messageForLaudoRpcError({ message: 'IDADE_PARCIAL_INVALIDA' })).toBe(
      MESSAGES.feature.laudoParcialIdadeInvalida,
    );
    expect(messageForLaudoRpcError({ message: 'OBRAS_DIFERENTES' })).toBe(
      MESSAGES.feature.laudoAgruparObrasDiferentes,
    );
    expect(messageForLaudoRpcError({ message: 'POUCAS_CONCRETAGENS' })).toBe(
      MESSAGES.feature.laudoAgruparPoucas,
    );
    expect(messageForLaudoRpcError({ message: 'LAUDO_NAO_RASCUNHO' })).toBe(
      MESSAGES.feature.laudoNaoRascunho,
    );
  });

  it('maps a missing laudo to the generic 404 copy', () => {
    expect(messageForLaudoRpcError({ message: 'LAUDO_NAO_ENCONTRADO' })).toBe(
      MESSAGES.http.notFound,
    );
  });

  it('maps LAUDO_NAO_ASSINADO to the exact correction sad-path copy (F-S008-3)', () => {
    expect(messageForLaudoRpcError({ message: 'LAUDO_NAO_ASSINADO' })).toBe(
      'Só é possível corrigir laudos já assinados.',
    );
  });

  it('falls back to the generic HTTP/permission mapping for unknown errors', () => {
    // 42501 -> RLS/permission denial -> 403 copy.
    expect(messageForLaudoRpcError({ code: '42501' })).toBe(MESSAGES.http.forbidden);
    expect(messageForLaudoRpcError({ status: 500 })).toBe(MESSAGES.http.serverError);
  });
});
