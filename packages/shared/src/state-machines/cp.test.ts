import { describe, expect, it } from 'vitest';

import type { CpStatus } from '../enums';

import { canRomper, canTransitionCp, cpAllowedTransitions, isCpTerminal } from './cp';
import { canTransition } from './transition';

const MOTIVO = { motivo: 'CP danificado na cura' };

describe('CP state machine (F-S002-3)', () => {
  describe('valid transitions', () => {
    it.each([
      ['moldado', 'coletado', {}],
      ['moldado', 'descartado', MOTIVO],
      ['coletado', 'rompido', {}],
      ['coletado', 'descartado', MOTIVO],
      ['rompido', 'expurgado', MOTIVO],
    ] as const)('allows %s → %s', (from, to, ctx) => {
      expect(canTransitionCp(from, to, ctx)).toEqual({ ok: true });
      expect(canTransition('cp', from, to, ctx)).toEqual({ ok: true });
    });
  });

  describe('invalid transitions', () => {
    it.each([
      ['moldado', 'rompido'],
      ['moldado', 'expurgado'],
      ['coletado', 'coletado'],
      ['coletado', 'expurgado'],
      ['rompido', 'coletado'],
      ['rompido', 'rompido'],
      ['descartado', 'coletado'],
      ['expurgado', 'rompido'],
    ] as const)('blocks %s → %s with TRANSICAO_INVALIDA', (from, to) => {
      expect(canTransitionCp(from, to, MOTIVO)).toEqual({
        ok: false,
        reason: 'TRANSICAO_INVALIDA',
      });
    });

    it('treats an unknown status as TRANSICAO_INVALIDA via the unified entry', () => {
      expect(canTransition('cp', 'inexistente' as CpStatus, 'coletado')).toEqual({
        ok: false,
        reason: 'TRANSICAO_INVALIDA',
      });
    });
  });

  describe('motivo guard', () => {
    it('requires a motivo to discard a specimen', () => {
      expect(canTransitionCp('moldado', 'descartado')).toEqual({
        ok: false,
        reason: 'MOTIVO_OBRIGATORIO',
      });
      expect(canTransitionCp('coletado', 'descartado', { motivo: '   ' })).toEqual({
        ok: false,
        reason: 'MOTIVO_OBRIGATORIO',
      });
    });

    it('requires a motivo to expunge a result', () => {
      expect(canTransitionCp('rompido', 'expurgado')).toEqual({
        ok: false,
        reason: 'MOTIVO_OBRIGATORIO',
      });
    });
  });

  describe('mandatory 28d guard', () => {
    const base = {
      idadeAlvoDias: 28,
      dataMoldagem: '2026-05-20', // target rupture date: 2026-06-17
    };

    it('blocks early rupture of a mandatory 28d specimen', () => {
      expect(
        canTransitionCp('coletado', 'rompido', {
          ...base,
          mandatorio28d: true,
          today: '2026-06-10',
        }),
      ).toEqual({ ok: false, reason: 'CP_MANDATORIO_28D' });
    });

    it('allows rupture of a mandatory 28d specimen at/after the target age', () => {
      expect(
        canTransitionCp('coletado', 'rompido', {
          ...base,
          mandatorio28d: true,
          today: '2026-06-17',
        }),
      ).toEqual({ ok: true });
    });

    it('allows EARLY rupture of a non-mandatory specimen (warning, not block)', () => {
      expect(
        canTransitionCp('coletado', 'rompido', {
          ...base,
          mandatorio28d: false,
          today: '2026-06-10',
        }),
      ).toEqual({ ok: true });
    });
  });

  describe('canRomper (press list guard)', () => {
    it('blocks a specimen that is not collected', () => {
      expect(canRomper({ status: 'moldado' })).toEqual({
        ok: false,
        reason: 'CP_ESTADO_INVALIDO',
      });
    });

    it('blocks a mandatory 28d specimen before its age', () => {
      expect(
        canRomper({
          status: 'coletado',
          mandatorio28d: true,
          idadeAlvoDias: 28,
          dataMoldagem: '2026-05-20',
          today: '2026-06-01',
        }),
      ).toEqual({ ok: false, reason: 'CP_MANDATORIO_28D' });
    });

    it('allows a collected, non-mandatory specimen', () => {
      expect(canRomper({ status: 'coletado' })).toEqual({ ok: true });
    });
  });

  describe('helpers', () => {
    it('reports terminal states', () => {
      expect(isCpTerminal('rompido')).toBe(true);
      expect(isCpTerminal('descartado')).toBe(true);
      expect(isCpTerminal('expurgado')).toBe(true);
      expect(isCpTerminal('moldado')).toBe(false);
      expect(isCpTerminal('coletado')).toBe(false);
    });

    it('lists allowed transitions per state', () => {
      expect(cpAllowedTransitions('moldado')).toEqual(['coletado', 'descartado']);
      expect(cpAllowedTransitions('descartado')).toEqual([]);
    });
  });
});
