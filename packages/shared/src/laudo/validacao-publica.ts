/**
 * Public validation view model (F-S009-2 / US19 / SPEC §5.5). Turns the resolved
 * CURRENT ("vigente") laudo version + its specimens into the anonymous,
 * read-only payload the public page renders: identity, authenticity and MPa/FCM
 * per age. Pure domain — reuses `consolidarLaudo` (the FCM-per-age rule lives
 * ONCE, DRY) and never exposes evidence photos or internal fields.
 */
import { consolidarLaudo, type LaudoCpResultado } from './consolidacao.ts';

/** One age row of the public validation response. */
export interface ValidacaoPublicaResultado {
  idade_dias: number;
  fcm_mpa: number;
  fck_projeto: number | null;
}

/** The public validation response (SPEC §5.5 200 body). */
export interface ValidacaoPublicaResponse {
  autentico: boolean;
  numero: string;
  versao: number;
  cliente: string | null;
  obra: string | null;
  data_emissao: string | null;
  resultados: ValidacaoPublicaResultado[];
}

/** The resolved current-version laudo the builder shapes into the public view. */
export interface ValidacaoPublicaInput {
  numero: string;
  versao: number;
  /** True only when the current version is a published (`assinado`) report. */
  assinado: boolean;
  clienteNome: string | null;
  obraNome: string | null;
  dataEmissao: string | null;
  /** Reference project strength (MPa) for the age rows. */
  fckProjeto: number | null;
  /** Specimens of every concretagem the report consolidates. */
  cps: readonly LaudoCpResultado[];
}

/**
 * Builds the public validation payload for a resolved current-version laudo. The
 * age rows carry the ages that already have a valid FCM (the report's published
 * results); pending/expurgada ages are omitted. `autentico` reflects whether the
 * resolved version is actually published (`assinado`).
 */
export function buildValidacaoPublica(input: ValidacaoPublicaInput): ValidacaoPublicaResponse {
  const consolidado = consolidarLaudo(input.cps);
  const resultados: ValidacaoPublicaResultado[] = consolidado.curva.map((ponto) => ({
    idade_dias: ponto.idadeAlvoDias,
    fcm_mpa: ponto.fcm,
    fck_projeto: input.fckProjeto,
  }));

  return {
    autentico: input.assinado,
    numero: input.numero,
    versao: input.versao,
    cliente: input.clienteNome,
    obra: input.obraNome,
    data_emissao: input.dataEmissao,
    resultados,
  };
}

/**
 * Resolves the CURRENT ("vigente") version of a laudo from any version in its
 * chain (F-S009-2 / US19-CA2). A corrected report links its new version to the
 * previous one via `substitui_laudo_id`, so from a scanned (possibly superseded)
 * code we walk FORWARD — `getSubstituto(id)` returns the id of the laudo that
 * supersedes `id`, or `null` at the head — until we reach the version nothing
 * supersedes. A `seen` guard + `maxHops` cap make it safe against a cyclic or
 * corrupt chain. Pure control flow; the actual lookup is injected (DRY: the same
 * resolver is unit-tested here and reused by the `validar-laudo` Edge Function).
 */
export async function resolveVigenteLaudoId(
  startId: string,
  getSubstituto: (id: string) => Promise<string | null>,
  maxHops = 20,
): Promise<string> {
  let currentId = startId;
  const seen = new Set<string>([startId]);
  for (let hop = 0; hop < maxHops; hop += 1) {
    const next = await getSubstituto(currentId);
    if (!next || seen.has(next)) {
      break;
    }
    seen.add(next);
    currentId = next;
  }
  return currentId;
}
