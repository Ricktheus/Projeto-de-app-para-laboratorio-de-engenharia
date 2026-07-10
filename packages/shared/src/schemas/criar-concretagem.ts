import { z } from 'zod';

import { isoDateSchema, uuidSchema } from './common.ts';

/**
 * Wire contract for the `criar_concretagem_com_cps` RPC (SPEC §4.6). Keys are
 * snake_case because the object is passed straight to Postgres as `jsonb`; the
 * RPC reads these column names. The client validates the payload with this
 * schema before the call, and the same schema documents the shape for the SQL
 * side (single source of truth for the boundary).
 *
 * The RPC fills `cadastrado_por` (from `auth.uid()`), each CP's `data_moldagem`
 * (= `data_concretagem`), `data_ruptura_planejada`, `codigo_rastreio` and the
 * `mandatorio_28d` flags — so they are intentionally absent here.
 */
export const criarConcretagemPayloadSchema = z.object({
  obra_id: uuidSchema,
  data_concretagem: isoDateSchema,
  nf_numero: z.string().trim().min(1, 'Informe o número da NF.'),
  nf_foto_url: z.string().url().nullish(),
  fck_projeto: z.number().positive('Informe o FCK de projeto.'),
  volume_m3: z.number().positive('Informe o volume.'),
  concreteira: z.string().trim().nullish(),
  // Slump stored in MILLIMETRES (UI converts cm→mm before building this payload).
  slump_projeto: z.number().nonnegative().nullish(),
  slump_tolerancia: z.number().nonnegative().nullish(),
  slump_medido: z.number().nonnegative().nullish(),
  diametro_nominal_mm: z.number().positive().nullish(),
  altura_nominal_mm: z.number().positive().nullish(),
  quadra: z.string().trim().nullish(),
  lote: z.string().trim().nullish(),
  traco: z.string().trim().nullish(),
  placa_caminhao: z.string().trim().nullish(),
  lacre_caminhao: z.string().trim().nullish(),
  aditivo: z.string().trim().nullish(),
});
export type CriarConcretagemPayload = z.infer<typeof criarConcretagemPayloadSchema>;

/** A single specimen to mold: only its target age; the RPC derives the rest. */
export const cpConfigSchema = z.object({
  idade_alvo_dias: z.number().int().positive(),
});
export type CpConfig = z.infer<typeof cpConfigSchema>;

/** Full argument set for the `criar_concretagem_com_cps` RPC. */
export const criarConcretagemComCpsSchema = z.object({
  concretagem: criarConcretagemPayloadSchema,
  cps: z.array(cpConfigSchema).min(1, 'Configure ao menos um corpo de prova.'),
});
export type CriarConcretagemComCps = z.infer<typeof criarConcretagemComCpsSchema>;
