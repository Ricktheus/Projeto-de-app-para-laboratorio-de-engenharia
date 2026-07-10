import { z } from 'zod';

import { uuidSchema } from './common.ts';

/**
 * Construction-site (obra) create/update form payload. `criado_por` and GPS are
 * filled from context/device; GPS is optional (denying permission must not
 * block creation — US20-CA2).
 */
export const obraSchema = z.object({
  clienteId: uuidSchema,
  nome: z.string().trim().min(1, 'Informe o nome da obra.'),
  sigla: z.string().trim().min(1, 'Informe a sigla da obra.'),
  endereco: z.string().trim().nullish(),
  contato: z.string().trim().nullish(),
  gpsLatitude: z.number().min(-90).max(90).nullish(),
  gpsLongitude: z.number().min(-180).max(180).nullish(),
});

export type ObraInput = z.infer<typeof obraSchema>;
