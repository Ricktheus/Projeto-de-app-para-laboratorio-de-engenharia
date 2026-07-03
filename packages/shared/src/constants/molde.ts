/**
 * Standard cylindrical specimen molds. The NOMINAL diameter is the basis of the
 * official MPa calculation (see `engineering/mpa.ts`) — never the measured one.
 */
export interface MoldePreset {
  /** Nominal diameter in millimetres (basis of the MPa area). */
  readonly diametroNominalMm: number;
  /** Nominal height in millimetres. */
  readonly alturaNominalMm: number;
  /** Human label, e.g. "100 × 200 mm". */
  readonly label: string;
}

const MOLDE_100X200: MoldePreset = {
  diametroNominalMm: 100,
  alturaNominalMm: 200,
  label: '100 × 200 mm',
};
const MOLDE_150X300: MoldePreset = {
  diametroNominalMm: 150,
  alturaNominalMm: 300,
  label: '150 × 300 mm',
};

/** The two molds in use at the lab (matches the `concretagens` defaults). */
export const MOLDE_PRESETS: readonly MoldePreset[] = [MOLDE_100X200, MOLDE_150X300];

/** Default mold when none is chosen (matches `concretagens.diametro_nominal_mm`). */
export const DEFAULT_MOLDE: MoldePreset = MOLDE_100X200;
