import { checkRange, type RangeSeverity } from '../engineering/ranges';
import { MESSAGES } from '../messages/messages';

/**
 * Below this many kgf a rupture load was almost certainly typed in kN instead
 * of kgf (1 kN ≈ 102 kgf, and any real cylinder break is well above 1000 kgf).
 * Matches the lower bound of the §7.4 `cargaRupturaKgf` range.
 */
export const CARGA_KN_SUSPEITA_KGF = 1000;

/** A non-blocking advisory about the entered rupture load. */
export interface CargaWarning {
  /** Portuguese advisory to show the operator. */
  message: string;
  /** How the UI should react (warn vs. ask for confirmation). */
  severity: RangeSeverity;
}

/**
 * Non-blocking advisory for the entered rupture load (F-S006-2, US08-CA2):
 *  - a suspiciously LOW load (< 1000 kgf) ⇒ the specific kN-vs-kgf warning
 *    "Valor muito baixo. Você digitou em kN em vez de kgf?";
 *  - otherwise the §7.4 engineering-range check ("Carga fora da faixa típica…").
 *
 * Returns `null` when the load is within the usual range. This NEVER blocks the
 * save and NEVER changes the MPa result (the calc always uses the nominal
 * diameter), so a mistyped value cannot corrupt the report — it only warns.
 */
export function checkCargaRuptura(cargaKgf: number): CargaWarning | null {
  if (cargaKgf > 0 && cargaKgf < CARGA_KN_SUSPEITA_KGF) {
    return { message: MESSAGES.feature.cargaMuitoBaixaKn, severity: 'aviso' };
  }
  const range = checkRange('cargaRupturaKgf', cargaKgf);
  if (!range.ok && range.message && range.severity) {
    return { message: range.message, severity: range.severity };
  }
  return null;
}
