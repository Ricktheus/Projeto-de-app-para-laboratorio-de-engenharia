import { z } from 'zod';

import { laudoTipoSchema, uuidSchema } from './common';

/**
 * Laudo (report) create form payload. `codigo_verificacao`, `status`, `versao`
 * and the PDF/signature URLs are server-managed. `numero` is controlled by the
 * partner (PRD §3). At least one concretagem composes the report (junction
 * `laudo_concretagens`).
 */
export const laudoSchema = z.object({
  clienteId: uuidSchema,
  obraId: uuidSchema,
  tipoLaudo: laudoTipoSchema,
  numero: z.string().trim().min(1, 'Informe o número do laudo.'),
  substituiLaudoId: uuidSchema.nullish(),
  concretagemIds: z.array(uuidSchema).min(1, 'Selecione ao menos uma concretagem.'),
});

export type LaudoInput = z.infer<typeof laudoSchema>;
