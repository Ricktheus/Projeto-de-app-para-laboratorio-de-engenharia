import { z } from 'zod';

import { isoDateSchema, uuidSchema } from './common.ts';

/**
 * Concretagem (pour) create form payload. `fck_projeto` is CAPTURED from the NF
 * (not calculated). Slump fields are stored in MILLIMETRES — the UI converts
 * cm→mm (× 10) before validation (PRD §2.4 / §7.4). The nominal mold diameter is
 * the basis of the MPa calculation and defaults to 100 × 200 mm.
 *
 * Out-of-range values are handled as NON-blocking warnings by
 * `engineering/ranges.ts`, so the numeric guards here stay permissive.
 */
export const concretagemSchema = z.object({
  obraId: uuidSchema,
  dataConcretagem: isoDateSchema,
  nfNumero: z.string().trim().min(1, 'Informe o número da NF.'),
  nfFotoUrl: z.string().url().nullish(),
  fckProjeto: z.number().positive('Informe o FCK de projeto.'),
  volumeM3: z.number().positive('Informe o volume.'),
  concreteira: z.string().trim().nullish(),
  slumpProjetoMm: z.number().nonnegative().nullish(),
  slumpToleranciaMm: z.number().nonnegative().nullish(),
  slumpMedidoMm: z.number().nonnegative().nullish(),
  diametroNominalMm: z.number().positive().default(100),
  alturaNominalMm: z.number().positive().default(200),
  quadra: z.string().trim().nullish(),
  lote: z.string().trim().nullish(),
  traco: z.string().trim().nullish(),
  placaCaminhao: z.string().trim().nullish(),
  lacreCaminhao: z.string().trim().nullish(),
  aditivo: z.string().trim().nullish(),
});

export type ConcretagemInput = z.infer<typeof concretagemSchema>;
