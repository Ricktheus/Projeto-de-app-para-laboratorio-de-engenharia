import { describe, expect, it } from 'vitest';

import { type LaudoCpResultado } from './consolidacao';
import { buildValidacaoPublica, resolveVigenteLaudoId } from './validacao-publica';

function cp(
  idade: number,
  status: LaudoCpResultado['status'],
  mpa: number | null,
  codigo: string,
): LaudoCpResultado {
  return { codigoRastreio: codigo, idadeAlvoDias: idade, status, mpaCalculado: mpa };
}

describe('buildValidacaoPublica', () => {
  it('shapes the SPEC §5.5 body with FCM per age and the fck reference', () => {
    const res = buildValidacaoPublica({
      numero: 'N°003AGEHAB',
      versao: 2,
      assinado: true,
      clienteNome: 'AGEHAB',
      obraNome: 'Residencial X',
      dataEmissao: '2026-06-18',
      fckProjeto: 30,
      cps: [
        cp(7, 'rompido', 27.44, 'CP1'),
        cp(28, 'rompido', 32.1, 'CP3'),
        cp(28, 'rompido', 32.1, 'CP4'),
      ],
    });

    expect(res).toEqual({
      autentico: true,
      numero: 'N°003AGEHAB',
      versao: 2,
      cliente: 'AGEHAB',
      obra: 'Residencial X',
      data_emissao: '2026-06-18',
      resultados: [
        { idade_dias: 7, fcm_mpa: 27.44, fck_projeto: 30 },
        { idade_dias: 28, fcm_mpa: 32.1, fck_projeto: 30 },
      ],
    });
  });

  it('omits ages without a valid FCM (pending / expurgada)', () => {
    const res = buildValidacaoPublica({
      numero: 'N-1',
      versao: 1,
      assinado: true,
      clienteNome: 'X',
      obraNome: 'O',
      dataEmissao: '2026-06-01',
      fckProjeto: 25,
      cps: [
        cp(7, 'rompido', 20, 'CP1'),
        cp(28, 'moldado', null, 'CP2'), // pending → no row
        cp(14, 'expurgado', null, 'CP3'), // expurgada → no row
      ],
    });

    expect(res.resultados).toEqual([{ idade_dias: 7, fcm_mpa: 20, fck_projeto: 25 }]);
  });
});

describe('resolveVigenteLaudoId', () => {
  // Chain: v1 -> v2 -> v3 (v3 is current; getSubstituto points old -> newer).
  const substitui: Record<string, string> = { v1: 'v2', v2: 'v3' };
  const getSubstituto = (id: string) => Promise.resolve(substitui[id] ?? null);

  it('walks forward from any version to the current one', async () => {
    expect(await resolveVigenteLaudoId('v1', getSubstituto)).toBe('v3');
    expect(await resolveVigenteLaudoId('v2', getSubstituto)).toBe('v3');
    expect(await resolveVigenteLaudoId('v3', getSubstituto)).toBe('v3');
  });

  it('is safe against a cyclic/corrupt chain (seen guard + maxHops)', async () => {
    const cyclic = (id: string) => Promise.resolve(id === 'a' ? 'b' : 'a');
    // a -> b -> a -> ... must terminate without looping forever.
    expect(await resolveVigenteLaudoId('a', cyclic, 5)).toBe('b');
  });
});

describe('buildValidacaoPublica (autenticidade)', () => {
  it('marks autentico=false when the resolved version is not published', () => {
    const res = buildValidacaoPublica({
      numero: 'N-1',
      versao: 3,
      assinado: false, // correction in progress (current version not yet signed)
      clienteNome: 'X',
      obraNome: 'O',
      dataEmissao: null,
      fckProjeto: 30,
      cps: [cp(7, 'rompido', 28, 'CP1')],
    });

    expect(res.autentico).toBe(false);
  });
});
