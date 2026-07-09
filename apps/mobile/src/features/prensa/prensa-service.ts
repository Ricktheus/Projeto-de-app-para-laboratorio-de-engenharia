import {
  messageForDescarteError,
  messageForRegistrarRupturaError,
  messageForSupabaseError,
  selectRupturaAgenda,
  type CpStatus,
  type RupturaInput,
  type TipoFratura,
} from '@concreto/shared';

import { supabase } from '../../services/supabase';

/** A specimen due for rupture, as shown on the press list (F-S006-1). */
export interface PrensaCpRow {
  cpId: string;
  codigoRastreio: string;
  obraSigla: string;
  obraNome: string;
  nfNumero: string;
  idadeAlvoDias: number;
  dataRupturaPlanejada: string;
  /** Nominal mold diameter (mm) — basis of the live MPa preview (never measured). */
  diametroNominalMm: number;
  /** Specified design strength (fck) from the NF/project (MPa) — for the fck verdict. */
  fckProjeto: number | null;
  mandatorio28d: boolean;
  status: CpStatus;
  /** Present when the CP is already `rompido` — its 1:1 rupture result. */
  rupturaId: string | null;
  mpaCalculado: number | null;
}

/** Result of a successful `registrar_ruptura` RPC (SPEC §5.2). */
export interface RegistrarRupturaResult {
  rupturaId: string;
  mpaCalculado: number;
  areaMm2: number;
  cpStatus: CpStatus;
  laudoRascunhoId: string;
}

interface ObraEmbed {
  sigla: string;
  nome: string;
}
interface ConcretagemEmbed {
  nf_numero: string;
  diametro_nominal_mm: number;
  fck_projeto: number | null;
  obras: ObraEmbed | ObraEmbed[] | null;
}
interface RupturaEmbed {
  id: string;
  mpa_calculado: number;
}
interface CpPrensaRow {
  id: string;
  codigo_rastreio: string;
  idade_alvo_dias: number;
  data_ruptura_planejada: string;
  status: CpStatus;
  mandatorio_28d: boolean;
  concretagens: ConcretagemEmbed | ConcretagemEmbed[] | null;
  rupturas: RupturaEmbed | RupturaEmbed[] | null;
}

const CP_PRENSA_SELECT =
  'id, codigo_rastreio, idade_alvo_dias, data_ruptura_planejada, status, mandatorio_28d, ' +
  'concretagens(nf_numero, diametro_nominal_mm, fck_projeto, obras(sigla, nome)), rupturas(id, mpa_calculado)';

function concretagemOf(embed: CpPrensaRow['concretagens']): ConcretagemEmbed | null {
  const concretagem = Array.isArray(embed) ? embed[0] : embed;
  return concretagem ?? null;
}

function rupturaOf(embed: CpPrensaRow['rupturas']): RupturaEmbed | null {
  const ruptura = Array.isArray(embed) ? embed[0] : embed;
  return ruptura ?? null;
}

function toPrensaRow(cp: CpPrensaRow): PrensaCpRow {
  const concretagem = concretagemOf(cp.concretagens);
  const obra = concretagem
    ? Array.isArray(concretagem.obras)
      ? concretagem.obras[0]
      : concretagem.obras
    : null;
  const ruptura = rupturaOf(cp.rupturas);
  return {
    cpId: cp.id,
    codigoRastreio: cp.codigo_rastreio,
    obraSigla: obra?.sigla ?? '',
    obraNome: obra?.nome ?? '',
    nfNumero: concretagem?.nf_numero ?? '',
    idadeAlvoDias: cp.idade_alvo_dias,
    dataRupturaPlanejada: cp.data_ruptura_planejada,
    diametroNominalMm: concretagem?.diametro_nominal_mm ?? 100,
    fckProjeto: concretagem?.fck_projeto ?? null,
    mandatorio28d: cp.mandatorio_28d,
    status: cp.status,
    rupturaId: ruptura?.id ?? null,
    mpaCalculado: ruptura ? Number(ruptura.mpa_calculado) : null,
  };
}

/**
 * Lists the specimens due for rupture today (F-S006-1, US07-CA1): still
 * `coletado` with `data_ruptura_planejada ≤ hoje`, across ALL clients (no
 * client filter — the press list of the day). RLS scopes the rows the engineer
 * may see; the shared `selectRupturaAgenda` applies the "due" rule and ordering
 * (single definition — DRY). An empty result drives the Empty state.
 */
export async function listRupturaAgenda(): Promise<PrensaCpRow[]> {
  const { data, error } = await supabase
    .from('corpos_prova')
    .select(CP_PRENSA_SELECT)
    .eq('status', 'coletado');
  if (error) {
    throw new Error(messageForSupabaseError(error));
  }
  // The double-nested embed exceeds supabase-js's select-string type inference,
  // so we assert the runtime shape (validated by the mapping helpers) here.
  const rows = ((data as unknown as CpPrensaRow[] | null) ?? []).map(toPrensaRow);
  return selectRupturaAgenda(rows);
}

/**
 * Loads a single specimen for the rupture form. Returns `null` when there is no
 * matching CP (surfaced as "CP não encontrado." by the caller).
 */
export async function getCpForRuptura(cpId: string): Promise<PrensaCpRow | null> {
  const { data, error } = await supabase
    .from('corpos_prova')
    .select(CP_PRENSA_SELECT)
    .eq('id', cpId)
    .maybeSingle();
  if (error) {
    throw new Error(messageForSupabaseError(error));
  }
  return data ? toPrensaRow(data as unknown as CpPrensaRow) : null;
}

/**
 * Finds a specimen by its scanned/typed QR `codigo_rastreio` (F-S006-1,
 * US07-CA2 — "busca por QR localiza o CP imediatamente"). Returns `null` when
 * no CP matches.
 */
export async function findCpByCodigo(codigoRastreio: string): Promise<PrensaCpRow | null> {
  const { data, error } = await supabase
    .from('corpos_prova')
    .select(CP_PRENSA_SELECT)
    .eq('codigo_rastreio', codigoRastreio.trim())
    .maybeSingle();
  if (error) {
    throw new Error(messageForSupabaseError(error));
  }
  return data ? toPrensaRow(data as unknown as CpPrensaRow) : null;
}

/**
 * Registers the rupture via the guarded `registrar_ruptura` RPC (F-S006-2/3).
 * MPa is (re)computed server-side from the nominal diameter — the client sends
 * only the measured inputs, the load and the fracture type. Business errors are
 * mapped to the exact F-S006-2 copy (mandatory-28d block, invalid state, invalid
 * load…).
 */
export async function registrarRuptura(
  cpId: string,
  input: RupturaInput,
): Promise<RegistrarRupturaResult> {
  const dados = {
    peso_g: input.pesoG ?? null,
    diametro_mm: input.diametroMm ?? null,
    altura_mm: input.alturaMm ?? null,
    carga_ruptura_kgf: input.cargaRupturaKgf,
    tipo_fratura: input.tipoFratura,
  };
  const { data, error } = await supabase.rpc('registrar_ruptura', { cp_id: cpId, dados });
  if (error) {
    throw new Error(messageForRegistrarRupturaError(error));
  }
  const result = data as {
    ruptura_id: string;
    mpa_calculado: number;
    area_mm2: number;
    cp_status: CpStatus;
    laudo_rascunho_id: string;
  };
  return {
    rupturaId: result.ruptura_id,
    mpaCalculado: Number(result.mpa_calculado),
    areaMm2: Number(result.area_mm2),
    cpStatus: result.cp_status,
    laudoRascunhoId: result.laudo_rascunho_id,
  };
}

/** Discards a specimen damaged before testing (F-S006-4, US10-CA2); eng_lab only. */
export async function descartarCp(cpId: string, motivo: string): Promise<void> {
  const { error } = await supabase.rpc('descartar_cp', { cp_id: cpId, motivo });
  if (error) {
    throw new Error(messageForDescarteError(error));
  }
}

/** Purges an anomalous result from the average (F-S006-4, US10-CA1); eng_lab only. */
export async function expurgarResultado(cpId: string, motivo: string): Promise<void> {
  const { error } = await supabase.rpc('expurgar_resultado', { cp_id: cpId, motivo });
  if (error) {
    throw new Error(messageForDescarteError(error));
  }
}

export type { TipoFratura };
