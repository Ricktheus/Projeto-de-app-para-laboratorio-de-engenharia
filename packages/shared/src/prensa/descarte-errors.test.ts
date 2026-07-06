import { describe, expect, it } from 'vitest';

import { messageForDescarteError } from './descarte-errors';

describe('messageForDescarteError (F-S006-4)', () => {
  it('maps MOTIVO_OBRIGATORIO to the exact blocking copy', () => {
    expect(messageForDescarteError({ message: 'MOTIVO_OBRIGATORIO' })).toBe(
      'Informe o motivo do descarte/expurgo.',
    );
  });

  it('maps CP_NAO_ENCONTRADO and CP_ESTADO_INVALIDO', () => {
    expect(messageForDescarteError({ message: 'CP_NAO_ENCONTRADO' })).toBe('CP não encontrado.');
    expect(messageForDescarteError({ message: 'CP_ESTADO_INVALIDO' })).toBe(
      'Este corpo de prova não está em um estado válido para esta ação.',
    );
  });

  it('falls back to the generic mapping for a permission denial', () => {
    expect(messageForDescarteError({ code: '42501' })).toBe(
      'Você não tem permissão para executar esta ação.',
    );
  });
});
