import { z } from 'zod';

import { tipoFraturaSchema } from './common';

/**
 * Rupture data entered by the lab engineer at the press. `mpa_calculado` and
 * `area_mm2` are computed SERVER-SIDE from `carga_ruptura_kgf` and the nominal
 * diameter (never trusted from the client). Measured diameter/height/weight are
 * recorded for traceability only. Load must be > 0 (else `CARGA_INVALIDA`).
 */
export const rupturaSchema = z.object({
  pesoG: z.number().positive().nullish(),
  diametroMm: z.number().positive().nullish(),
  alturaMm: z.number().positive().nullish(),
  cargaRupturaKgf: z
    .number()
    .int('A carga deve ser um número inteiro (kgf).')
    .positive('Informe uma carga de ruptura válida.'),
  tipoFratura: tipoFraturaSchema,
});

export type RupturaInput = z.infer<typeof rupturaSchema>;
