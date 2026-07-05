import { describe, expect, it } from 'vitest';

import { messageForRegistrarRupturaError } from './ruptura-errors';

describe('messageForRegistrarRupturaError (F-S006-2, SPEC §5.2)', () => {
  it('maps CP_NAO_ENCONTRADO to the exact copy', () => {
    expect(messageForRegistrarRupturaError({ message: 'CP_NAO_ENCONTRADO' })).toBe(
      'CP não encontrado.',
    );
  });

  it('maps CP_ESTADO_INVALIDO to "Este CP não está disponível para ruptura."', () => {
    expect(messageForRegistrarRupturaError({ message: 'CP_ESTADO_INVALIDO' })).toBe(
      'Este CP não está disponível para ruptura.',
    );
  });

  it('maps CARGA_INVALIDA to "Informe uma carga de ruptura válida."', () => {
    expect(messageForRegistrarRupturaError({ message: 'CARGA_INVALIDA' })).toBe(
      'Informe uma carga de ruptura válida.',
    );
  });

  it('interpolates age + date into the mandatory-28d block from the DETAIL (US08-CA4)', () => {
    expect(
      messageForRegistrarRupturaError({
        message: 'CP_MANDATORIO_28D',
        details: '28|2026-06-17',
      }),
    ).toBe(
      'Este CP de 28d é obrigatório e não pode ser rompido antes da idade prevista (2026-06-17).',
    );
  });

  it('handles a mandatory block for a non-28 age (e.g. 63d)', () => {
    expect(
      messageForRegistrarRupturaError({
        message: 'CP_MANDATORIO_28D',
        details: '63|2026-08-01',
      }),
    ).toBe(
      'Este CP de 63d é obrigatório e não pode ser rompido antes da idade prevista (2026-08-01).',
    );
  });

  it('falls back to the mandatory base copy when the DETAIL is missing', () => {
    expect(messageForRegistrarRupturaError({ message: 'CP_MANDATORIO_28D' })).toBe(
      'Este CP de 28d é obrigatório e não pode ser rompido antes da idade prevista.',
    );
  });

  it('falls back to the generic HTTP/Supabase mapping for unknown errors', () => {
    expect(messageForRegistrarRupturaError({ code: '42501' })).toBe(
      'Você não tem permissão para executar esta ação.',
    );
    expect(messageForRegistrarRupturaError({ status: 500 })).toBe(
      'Erro inesperado. Tente novamente em instantes.',
    );
  });
});
