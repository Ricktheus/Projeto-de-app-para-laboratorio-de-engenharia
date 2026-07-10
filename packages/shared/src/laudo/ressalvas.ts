import { checkSlumpTolerance } from '../engineering/ranges.ts';

/**
 * Report "considerações finais" composition (F-S008-1 / US14-CA3, PRD §11). The
 * closing section of every laudo is the standard NBR 5739 text plus the
 * AUTOMATIC caveats ("ressalvas") the SPEC prescribes: a specimen collected more
 * than 24h after molding, or a measured slump outside the design tolerance.
 *
 * Pure domain: the rules (WHICH caveats apply and their EXACT wording) live once
 * here so the PDF Edge Function and any web preview render the same text (DRY).
 * The Portuguese strings are report copy, kept next to the rule that emits them.
 */

/** Standard NBR 5739 closing paragraph, always present in the report. */
export const CONSIDERACOES_FINAIS_PADRAO =
  'Os corpos de prova foram moldados, curados e ensaiados à compressão conforme a ' +
  'ABNT NBR 5739. Os resultados deste relatório referem-se exclusivamente às amostras ensaiadas.';

/** Caveat added when any specimen was collected more than 24h after molding. */
export const RESSALVA_COLETA_ATRASADA =
  'Ressalva: uma ou mais amostras foram coletadas mais de 24 horas após a moldagem, ' +
  'o que pode ter afetado a cura e a resistência do concreto.';

/** Caveat added when a measured slump fell outside the design tolerance. */
export const RESSALVA_SLUMP_FORA_TOLERANCIA =
  'Ressalva: o abatimento (slump) medido de uma ou mais amostras ficou fora da ' +
  'tolerância de projeto especificada.';

/** Slump fields of a concretagem, used to detect an out-of-tolerance reading. */
export interface RessalvaSlumpInput {
  /** Measured slump (mm); `null` when it was not recorded. */
  slumpMedidoMm?: number | null;
  /** Design slump target (mm); `null` when not specified. */
  slumpProjetoMm?: number | null;
  /** Allowed deviation around the target (mm); `null` when not specified. */
  slumpToleranciaMm?: number | null;
}

/**
 * True when the measured slump of a concretagem is outside the design tolerance
 * (reuses the shared {@link checkSlumpTolerance} rule). Returns `false` when any
 * of the three slump values is missing — an unmeasured slump raises no caveat.
 */
export function isSlumpForaTolerancia(input: RessalvaSlumpInput): boolean {
  const { slumpMedidoMm, slumpProjetoMm, slumpToleranciaMm } = input;
  if (
    typeof slumpMedidoMm !== 'number' ||
    typeof slumpProjetoMm !== 'number' ||
    typeof slumpToleranciaMm !== 'number'
  ) {
    return false;
  }
  return !checkSlumpTolerance({ slumpMedidoMm, slumpProjetoMm, slumpToleranciaMm }).ok;
}

/** True when at least one concretagem of the report has an out-of-tolerance slump. */
export function algumSlumpForaTolerancia(concretagens: readonly RessalvaSlumpInput[]): boolean {
  return concretagens.some(isSlumpForaTolerancia);
}

/** Inputs deciding which automatic caveats are appended to the report. */
export interface ConsideracoesFinaisInput {
  /** True when any specimen of the report was collected late (> 24h). */
  algumaColetaAtrasada: boolean;
  /** True when any concretagem's measured slump is outside its tolerance. */
  algumSlumpForaTolerancia: boolean;
}

/**
 * Builds the report's "considerações finais" paragraphs (F-S008-1 / US14-CA3):
 * the standard NBR 5739 text first, then each applicable caveat in a fixed order
 * (late collection, then out-of-tolerance slump). The PDF renders one paragraph
 * per entry.
 */
export function buildConsideracoesFinais(input: ConsideracoesFinaisInput): string[] {
  const paragrafos: string[] = [CONSIDERACOES_FINAIS_PADRAO];
  if (input.algumaColetaAtrasada) {
    paragrafos.push(RESSALVA_COLETA_ATRASADA);
  }
  if (input.algumSlumpForaTolerancia) {
    paragrafos.push(RESSALVA_SLUMP_FORA_TOLERANCIA);
  }
  return paragrafos;
}
