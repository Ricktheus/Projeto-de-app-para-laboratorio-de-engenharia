/**
 * Loads the PUBLIC validation view for a verification code (F-S009-2 / §5.5).
 * Uses the service_role client (RLS bypass) but returns ONLY the whitelisted
 * fields — identity + MPa/FCM per age — never evidence photos or internal data.
 * Resolves the CURRENT ("vigente") version by walking the `substitui_laudo_id`
 * chain, and delegates the payload shaping + FCM aggregation to `packages/shared`
 * (DRY).
 */
import {
  buildValidacaoPublica,
  resolveVigenteLaudoId,
  type LaudoCpResultado,
  type ValidacaoPublicaResponse,
} from '@concreto/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Outcome of loading the validation view. */
export type ValidacaoLoadResult =
  { kind: 'ok'; body: ValidacaoPublicaResponse } | { kind: 'not_found' };

interface ClienteJoin {
  nome: string;
}
interface ObraJoin {
  nome: string | null;
  clientes: ClienteJoin | ClienteJoin[] | null;
}
interface VigenteLaudoRow {
  numero: string;
  versao: number;
  status: string;
  data_emissao: string | null;
  obras: ObraJoin | ObraJoin[] | null;
}
interface RupturaJoin {
  mpa_calculado: number | null;
  carga_ruptura_kgf: number | null;
}
interface CorpoProvaRow {
  codigo_rastreio: string;
  idade_alvo_dias: number;
  status: LaudoCpResultado['status'];
  rupturas: RupturaJoin | RupturaJoin[] | null;
}

function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Resolves `codigo` to the current-version laudo and returns the public payload,
 * or `not_found` when no laudo carries that code.
 */
export async function loadValidacao(
  service: SupabaseClient,
  codigo: string,
): Promise<ValidacaoLoadResult> {
  // 1) Locate the laudo the scanned code belongs to (any version).
  const { data: start } = await service
    .from('laudos')
    .select('id')
    .eq('codigo_verificacao', codigo)
    .maybeSingle<{ id: string }>();
  if (!start) {
    return { kind: 'not_found' };
  }

  // 2) Walk forward to the current (non-superseded) version (US19-CA2).
  const vigenteId = await resolveVigenteLaudoId(start.id, async (id) => {
    const { data } = await service
      .from('laudos')
      .select('id')
      .eq('substitui_laudo_id', id)
      .maybeSingle<{ id: string }>();
    return data?.id ?? null;
  });

  // 3) Load the current version's public header.
  const { data: laudo } = await service
    .from('laudos')
    .select('numero, versao, status, data_emissao, obras(nome, clientes(nome))')
    .eq('id', vigenteId)
    .maybeSingle<VigenteLaudoRow>();
  if (!laudo) {
    return { kind: 'not_found' };
  }

  const obra = firstOrSelf(laudo.obras);
  const cliente = firstOrSelf(obra?.clientes ?? null);

  // 4) Concretagens of the report (for the reference fck) + their specimens.
  const { data: junction } = await service
    .from('laudo_concretagens')
    .select('concretagem_id')
    .eq('laudo_id', vigenteId);
  const concretagemIds = (junction ?? []).map(
    (r) => (r as { concretagem_id: string }).concretagem_id,
  );

  let fckProjeto: number | null = null;
  let cps: LaudoCpResultado[] = [];
  if (concretagemIds.length > 0) {
    const { data: concretagens } = await service
      .from('concretagens')
      .select('fck_projeto, data_concretagem')
      .in('id', concretagemIds)
      .order('data_concretagem', { ascending: true });
    // Mirror the PDF header: the first (earliest) concretagem's fck is the reference.
    fckProjeto = (concretagens as { fck_projeto: number }[] | null)?.[0]?.fck_projeto ?? null;

    const { data: cpRows } = await service
      .from('corpos_prova')
      .select(
        'codigo_rastreio, idade_alvo_dias, status, rupturas(mpa_calculado, carga_ruptura_kgf)',
      )
      .in('concretagem_id', concretagemIds);
    cps = ((cpRows as CorpoProvaRow[] | null) ?? []).map((cp) => {
      const ruptura = firstOrSelf(cp.rupturas);
      return {
        codigoRastreio: cp.codigo_rastreio,
        idadeAlvoDias: cp.idade_alvo_dias,
        status: cp.status,
        mpaCalculado: ruptura?.mpa_calculado ?? null,
        cargaRupturaKgf: ruptura?.carga_ruptura_kgf ?? null,
      };
    });
  }

  return {
    kind: 'ok',
    body: buildValidacaoPublica({
      numero: laudo.numero,
      versao: laudo.versao,
      assinado: laudo.status === 'assinado',
      clienteNome: cliente?.nome ?? null,
      obraNome: obra?.nome ?? null,
      dataEmissao: laudo.data_emissao,
      fckProjeto,
      cps,
    }),
  };
}
