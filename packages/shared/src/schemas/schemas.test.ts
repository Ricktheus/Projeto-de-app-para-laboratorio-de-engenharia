import { describe, expect, it } from 'vitest';

import { isValidCnpj } from '../lib/cnpj';

import { clienteSchema } from './cliente';
import { concretagemSchema } from './concretagem';
import { registrarRupturaRequestSchema } from './edge-functions';
import { rupturaSchema } from './ruptura';

describe('Zod schemas (F-S002-4)', () => {
  describe('CNPJ', () => {
    it('accepts a valid formatted CNPJ', () => {
      expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
      expect(clienteSchema.safeParse({ nome: 'AGEHAB', cnpj: '11.222.333/0001-81' }).success).toBe(
        true,
      );
    });

    it('rejects an invalid CNPJ with the exact message', () => {
      const result = clienteSchema.safeParse({ nome: 'X', cnpj: '11.222.333/0001-99' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('CNPJ inválido.');
      }
    });

    it('rejects repeated-digit sequences', () => {
      expect(isValidCnpj('00.000.000/0000-00')).toBe(false);
    });
  });

  describe('concretagem', () => {
    it('applies the default 100×200 mold and stores slump in mm', () => {
      const parsed = concretagemSchema.parse({
        obraId: '00000000-0000-4000-8000-000000000000',
        dataConcretagem: '2026-05-20',
        nfNumero: '123456',
        fckProjeto: 30,
        volumeM3: 8,
        slumpMedidoMm: 120,
      });
      expect(parsed.diametroNominalMm).toBe(100);
      expect(parsed.alturaNominalMm).toBe(200);
      expect(parsed.slumpMedidoMm).toBe(120);
    });

    it('rejects a non-positive fck', () => {
      const result = concretagemSchema.safeParse({
        obraId: '00000000-0000-4000-8000-000000000000',
        dataConcretagem: '2026-05-20',
        nfNumero: '1',
        fckProjeto: 0,
        volumeM3: 8,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ruptura', () => {
    it('requires a positive integer load and a valid fracture type', () => {
      expect(
        rupturaSchema.safeParse({ cargaRupturaKgf: 23562, tipoFratura: 'ruptura_cisalhamento' })
          .success,
      ).toBe(true);
      expect(
        rupturaSchema.safeParse({ cargaRupturaKgf: 0, tipoFratura: 'ruptura_total' }).success,
      ).toBe(false);
      expect(
        rupturaSchema.safeParse({ cargaRupturaKgf: 100, tipoFratura: 'inexistente' }).success,
      ).toBe(false);
    });
  });

  describe('registrar_ruptura RPC payload (snake_case wire contract)', () => {
    it('validates the exact §5.2 shape', () => {
      const ok = registrarRupturaRequestSchema.safeParse({
        cp_id: '00000000-0000-4000-8000-000000000000',
        dados: {
          peso_g: 3820,
          diametro_mm: 100.2,
          altura_mm: 200.1,
          carga_ruptura_kgf: 23562,
          tipo_fratura: 'ruptura_cisalhamento',
        },
      });
      expect(ok.success).toBe(true);
    });
  });
});
