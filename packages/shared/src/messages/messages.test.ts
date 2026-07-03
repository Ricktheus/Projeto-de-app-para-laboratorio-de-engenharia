import { describe, expect, it } from 'vitest';

import { FRATURA_TIPOS } from '../constants/fratura';

import {
  MESSAGES,
  cpMandatorio28dMessage,
  messageForDomainCode,
  messageForHttpStatus,
} from './messages';

describe('message catalog & constants (F-S002-4)', () => {
  it('exposes the exact §3.0 HTTP messages', () => {
    expect(MESSAGES.http.forbidden).toBe('Você não tem permissão para executar esta ação.');
    expect(MESSAGES.http.conflict).toBe(
      'Dados foram alterados por outro usuário. Recarregue a página.',
    );
    expect(MESSAGES.http.rateLimit).toBe(
      'Limite de tentativas atingido. Tente novamente mais tarde.',
    );
    expect(MESSAGES.http.offline).toBe('Sem conexão com a internet.');
  });

  it('maps HTTP status codes to their message (default = server error)', () => {
    expect(messageForHttpStatus(403)).toBe(MESSAGES.http.forbidden);
    expect(messageForHttpStatus(404)).toBe('Registro não encontrado.');
    expect(messageForHttpStatus(418)).toBe(MESSAGES.http.serverError);
  });

  it('maps domain/Edge codes to their exact message', () => {
    expect(messageForDomainCode('CARGA_INVALIDA')).toBe('Informe uma carga de ruptura válida.');
    expect(messageForDomainCode('OCR_LIMITE')).toBe(
      'Limite de 3 tentativas de leitura atingido. Preencha manualmente.',
    );
    expect(messageForDomainCode('SEM_PDF_ASSINADO')).toBe(
      'Faça o upload do PDF assinado antes de publicar o laudo.',
    );
    expect(messageForDomainCode('DESCONHECIDO')).toBe(MESSAGES.http.serverError);
  });

  it('builds the mandatory-28d message with an optional date', () => {
    expect(cpMandatorio28dMessage()).toBe(
      'Este CP de 28d é obrigatório e não pode ser rompido antes da idade prevista.',
    );
    expect(cpMandatorio28dMessage('2026-06-17')).toBe(
      'Este CP de 28d é obrigatório e não pode ser rompido antes da idade prevista (2026-06-17).',
    );
  });

  it('lists the 6 laboratory fracture labels in order (US09-CA1)', () => {
    expect(FRATURA_TIPOS.map((f) => f.label)).toEqual([
      'Ruptura de Cabeça',
      'Ruptura de Face',
      'Ruptura Parcial',
      'Ruptura Total',
      'Ruptura de Cisalhamento',
      'Ruptura de Trinca',
    ]);
    expect(FRATURA_TIPOS).toHaveLength(6);
  });
});
