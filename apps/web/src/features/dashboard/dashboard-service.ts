import {
  addDaysIso,
  countPeriod,
  isCollectionDue,
  messageForSupabaseError,
  selectProximosRompimentos,
  startOfUtcWeekDayNumber,
  toUtcDayNumber,
  type PeriodCount,
} from '@concreto/shared';

import { supabase } from '../../services/supabase';

/** Today (UTC day) + the current week's Monday, as ISO calendar dates. */
function periodBounds(now: Date = new Date()): {
  today: Date;
  todayIso: string;
  weekStartIso: string;
} {
  const todayNum = toUtcDayNumber(now);
  const weekStartIso = addDaysIso(now, startOfUtcWeekDayNumber(todayNum) - todayNum);
  return { today: now, todayIso: now.toISOString().slice(0, 10), weekStartIso };
}

/** Today/week counters for the three specimen stages (F-S010-1, card 1). */
export interface CpCounters {
  moldados: PeriodCount;
  coletados: PeriodCount;
  rompidos: PeriodCount;
}

/**
 * Counts specimens molded/collected and ruptures registered in the current week
 * (each split into today vs the whole week). Only rows from this week are pulled;
 * the today/week split is computed by the shared `countPeriod` (DRY). RLS scopes
 * every query to the office engineers.
 */
export async function loadCpCounters(): Promise<CpCounters> {
  const { today, weekStartIso } = periodBounds();

  const [moldados, coletados, rompidos] = await Promise.all([
    supabase.from('corpos_prova').select('data_moldagem').gte('data_moldagem', weekStartIso),
    supabase.from('corpos_prova').select('coletado_em').gte('coletado_em', weekStartIso),
    supabase.from('rupturas').select('data_ruptura_real').gte('data_ruptura_real', weekStartIso),
  ]);

  for (const result of [moldados, coletados, rompidos]) {
    if (result.error) {
      throw new Error(messageForSupabaseError(result.error));
    }
  }

  return {
    moldados: countPeriod(
      (moldados.data ?? []).map((r) => r.data_moldagem),
      today,
    ),
    coletados: countPeriod(
      (coletados.data ?? []).map((r) => r.coletado_em),
      today,
    ),
    rompidos: countPeriod(
      (rompidos.data ?? []).map((r) => r.data_ruptura_real),
      today,
    ),
  };
}

/** A report awaiting the RT's signature (F-S010-1, card 2). */
export interface LaudoPendenteRow {
  id: string;
  numero: string;
  obraSigla: string | null;
  obraNome: string | null;
}

interface ObraSlim {
  sigla: string;
  nome: string;
}
interface LaudoPendenteJoin {
  id: string;
  numero: string;
  obras: ObraSlim | ObraSlim[] | null;
}

function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Reports sitting in `pronto_assinatura`, oldest first (waiting longest). */
export async function loadLaudosPendentes(): Promise<LaudoPendenteRow[]> {
  const { data, error } = await supabase
    .from('laudos')
    .select('id, numero, obras(sigla, nome)')
    .eq('status', 'pronto_assinatura')
    .order('updated_at', { ascending: true });
  if (error) {
    throw new Error(messageForSupabaseError(error));
  }
  return ((data as unknown as LaudoPendenteJoin[] | null) ?? []).map((row) => {
    const obra = firstOrSelf(row.obras);
    return {
      id: row.id,
      numero: row.numero,
      obraSigla: obra?.sigla ?? null,
      obraNome: obra?.nome ?? null,
    };
  });
}

/** A concretagem whose specimens are overdue for collection (F-S010-1, card 3). */
export interface ConcretagemSemColetaRow {
  concretagemId: string;
  nfNumero: string | null;
  obraSigla: string | null;
}

interface ConcretagemSlim {
  nf_numero: string;
  obras: { sigla: string } | { sigla: string }[] | null;
}
interface CpColetaJoin {
  concretagem_id: string;
  status: 'moldado' | 'coletado' | 'rompido' | 'descartado' | 'expurgado';
  created_at: string;
  concretagens: ConcretagemSlim | ConcretagemSlim[] | null;
}

/**
 * Distinct concretagens with at least one specimen still `moldado` more than 24h
 * after molding. The ">24h" rule is the shared `isCollectionDue` — the exact rule
 * the collection agenda and the daily e-mail cron use (no duplicated threshold).
 */
export async function loadConcretagensSemColeta(): Promise<ConcretagemSemColetaRow[]> {
  const { data, error } = await supabase
    .from('corpos_prova')
    .select('concretagem_id, status, created_at, concretagens(nf_numero, obras(sigla))')
    .eq('status', 'moldado');
  if (error) {
    throw new Error(messageForSupabaseError(error));
  }

  const now = new Date();
  const overdue = new Map<string, ConcretagemSemColetaRow>();
  for (const cp of (data as unknown as CpColetaJoin[] | null) ?? []) {
    if (!isCollectionDue({ status: cp.status, moldedAt: cp.created_at }, now)) {
      continue;
    }
    if (!overdue.has(cp.concretagem_id)) {
      const conc = firstOrSelf(cp.concretagens);
      const obra = firstOrSelf(conc?.obras ?? null);
      overdue.set(cp.concretagem_id, {
        concretagemId: cp.concretagem_id,
        nfNumero: conc?.nf_numero ?? null,
        obraSigla: obra?.sigla ?? null,
      });
    }
  }
  return [...overdue.values()];
}

/** A collected specimen scheduled for an upcoming rupture (F-S010-1, card 4). */
export interface ProximoRompimentoRow {
  codigoRastreio: string;
  dataRupturaPlanejada: string;
  obraSigla: string | null;
  status: 'moldado' | 'coletado' | 'rompido' | 'descartado' | 'expurgado';
}

interface ObraSiglaJoin {
  sigla: string;
}
interface ConcObrasJoin {
  obras: ObraSiglaJoin | ObraSiglaJoin[] | null;
}
interface CpProgramadoJoin {
  codigo_rastreio: string;
  data_ruptura_planejada: string;
  status: ProximoRompimentoRow['status'];
  concretagens: ConcObrasJoin | ConcObrasJoin[] | null;
}

/**
 * Next scheduled ruptures: collected specimens whose planned rupture date is
 * today or later, soonest first (capped at 5). The upcoming/ordering rule is the
 * shared `selectProximosRompimentos`; SQL pre-filters for efficiency.
 */
export async function loadProximosRompimentos(): Promise<ProximoRompimentoRow[]> {
  const { todayIso } = periodBounds();
  const { data, error } = await supabase
    .from('corpos_prova')
    .select('codigo_rastreio, data_ruptura_planejada, status, concretagens(obras(sigla))')
    .eq('status', 'coletado')
    .gte('data_ruptura_planejada', todayIso)
    .order('data_ruptura_planejada', { ascending: true })
    .limit(5);
  if (error) {
    throw new Error(messageForSupabaseError(error));
  }

  const rows: ProximoRompimentoRow[] = ((data as unknown as CpProgramadoJoin[] | null) ?? []).map(
    (cp) => {
      const conc = firstOrSelf(cp.concretagens);
      const obra = firstOrSelf(conc?.obras ?? null);
      return {
        codigoRastreio: cp.codigo_rastreio,
        dataRupturaPlanejada: cp.data_ruptura_planejada,
        obraSigla: obra?.sigla ?? null,
        status: cp.status,
      };
    },
  );
  // Authoritative domain selector (also guards against any relaxed SQL filter).
  return selectProximosRompimentos(rows);
}
