/**
 * Loads the ruptured results feeding the per-concreteira comparison
 * (F-S009-3 / US23), applying the report filters (período, concreteira, fck
 * alvo, obra) at the query level. Only VALID (`rompido`) specimens with a
 * measured MPa contribute — expurgado/descartado are excluded, mirroring the
 * laudo average. The aggregation itself is `buildComparativoConcreteira`
 * (packages/shared, DRY).
 */
import type { ComparativoInputRow, ExportarExcelRequest } from '@concreto/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

interface RupturaJoin {
  mpa_calculado: number | null;
}
interface CorpoProvaJoin {
  idade_alvo_dias: number;
  status: string;
  rupturas: RupturaJoin | RupturaJoin[] | null;
}
interface ConcretagemRow {
  concreteira: string | null;
  fck_projeto: number;
  corpos_prova: CorpoProvaJoin[] | null;
}

function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Fetches the concretagens in range (with their specimens + rupture readings)
 * and flattens them into the comparison's input rows. Filters are applied
 * server-side; the caller decides SEM_DADOS from the aggregation result.
 */
export async function loadComparativoRows(
  service: SupabaseClient,
  filtros: ExportarExcelRequest,
): Promise<ComparativoInputRow[]> {
  let query = service
    .from('concretagens')
    .select(
      'concreteira, fck_projeto, corpos_prova(idade_alvo_dias, status, rupturas(mpa_calculado))',
    )
    .gte('data_concretagem', filtros.periodo.de)
    .lte('data_concretagem', filtros.periodo.ate);

  if (filtros.concreteira) {
    query = query.eq('concreteira', filtros.concreteira);
  }
  if (typeof filtros.fckAlvo === 'number') {
    query = query.eq('fck_projeto', filtros.fckAlvo);
  }
  if (filtros.obraId) {
    query = query.eq('obra_id', filtros.obraId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const rows: ComparativoInputRow[] = [];
  for (const conc of (data as ConcretagemRow[] | null) ?? []) {
    for (const cp of conc.corpos_prova ?? []) {
      if (cp.status !== 'rompido') {
        continue; // only valid results count toward the comparison
      }
      const ruptura = firstOrSelf(cp.rupturas);
      rows.push({
        concreteira: conc.concreteira,
        fckProjeto: conc.fck_projeto,
        idadeAlvoDias: cp.idade_alvo_dias,
        mpaCalculado: ruptura?.mpa_calculado ?? null,
      });
    }
  }
  return rows;
}
