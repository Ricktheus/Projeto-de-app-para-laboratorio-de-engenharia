import { describe, expect, it } from 'vitest';

import type { CpStatus, LaudoStatus } from '../enums';

import {
  canMarcarAssinado,
  canMarcarProntoAssinatura,
  canTransitionLaudo,
  laudoAllowedTransitions,
} from './laudo';
import { canTransition } from './transition';

const TERMINAL: readonly CpStatus[] = ['rompido', 'descartado', 'expurgado'];
const SIGNED_PDF = { pdfAssinadoUrl: 'laudos/abc/assinado.pdf' };

describe('Laudo state machine (F-S002-3)', () => {
  describe('valid transitions', () => {
    it('rascunho → pronto_assinatura when all covered CPs are terminal', () => {
      expect(canTransitionLaudo('rascunho', 'pronto_assinatura', { cpStatuses: TERMINAL })).toEqual(
        { ok: true },
      );
    });

    it('pronto_assinatura → assinado when the signed PDF exists', () => {
      expect(canTransitionLaudo('pronto_assinatura', 'assinado', SIGNED_PDF)).toEqual({
        ok: true,
      });
    });

    it('assinado → substituido (versioning) is always allowed', () => {
      expect(canTransitionLaudo('assinado', 'substituido')).toEqual({ ok: true });
      expect(canTransition('laudo', 'assinado', 'substituido')).toEqual({ ok: true });
    });
  });

  describe('invalid transitions', () => {
    it.each([
      ['rascunho', 'assinado'],
      ['rascunho', 'substituido'],
      ['pronto_assinatura', 'rascunho'],
      ['pronto_assinatura', 'substituido'],
      ['assinado', 'rascunho'],
      ['assinado', 'pronto_assinatura'],
      ['substituido', 'assinado'],
    ] as const)('blocks %s → %s with TRANSICAO_INVALIDA', (from, to) => {
      expect(canTransitionLaudo(from, to, { ...SIGNED_PDF, cpStatuses: TERMINAL })).toEqual({
        ok: false,
        reason: 'TRANSICAO_INVALIDA',
      });
    });

    it('treats an unknown status as TRANSICAO_INVALIDA via the unified entry', () => {
      expect(canTransition('laudo', 'x' as LaudoStatus, 'assinado')).toEqual({
        ok: false,
        reason: 'TRANSICAO_INVALIDA',
      });
    });
  });

  describe('pronto_assinatura guard (all CPs terminal)', () => {
    it('blocks when any covered CP is still pending', () => {
      expect(canMarcarProntoAssinatura({ cpStatuses: ['rompido', 'coletado'] })).toEqual({
        ok: false,
        reason: 'CPS_PENDENTES',
      });
      expect(
        canTransitionLaudo('rascunho', 'pronto_assinatura', {
          cpStatuses: ['moldado'],
        }),
      ).toEqual({ ok: false, reason: 'CPS_PENDENTES' });
    });

    it('blocks when the specimen list is empty or missing', () => {
      expect(canMarcarProntoAssinatura({ cpStatuses: [] })).toEqual({
        ok: false,
        reason: 'CPS_PENDENTES',
      });
      expect(canMarcarProntoAssinatura({})).toEqual({ ok: false, reason: 'CPS_PENDENTES' });
    });
  });

  describe('assinado guard (signed PDF required)', () => {
    it('blocks when the signed PDF url is missing/empty', () => {
      expect(canMarcarAssinado({})).toEqual({ ok: false, reason: 'SEM_PDF_ASSINADO' });
      expect(canMarcarAssinado({ pdfAssinadoUrl: '   ' })).toEqual({
        ok: false,
        reason: 'SEM_PDF_ASSINADO',
      });
      expect(canTransitionLaudo('pronto_assinatura', 'assinado', {})).toEqual({
        ok: false,
        reason: 'SEM_PDF_ASSINADO',
      });
    });

    it('allows when the signed PDF url is present', () => {
      expect(canMarcarAssinado(SIGNED_PDF)).toEqual({ ok: true });
    });
  });

  it('lists allowed transitions per state', () => {
    expect(laudoAllowedTransitions('rascunho')).toEqual(['pronto_assinatura']);
    expect(laudoAllowedTransitions('substituido')).toEqual([]);
  });
});
