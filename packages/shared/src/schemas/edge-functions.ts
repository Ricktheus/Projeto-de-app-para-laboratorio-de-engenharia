import { z } from 'zod';

import { isoDateSchema, tipoFraturaSchema, uuidSchema } from './common';

/**
 * Wire contracts for the Edge Functions and RPCs (SPEC §5). Keys match the
 * SPEC's JSON EXACTLY (some snake_case, some camelCase) — these schemas are the
 * shared boundary validators for both the client and the server (DRY).
 */

// ---- §5.1 ocr-nota-fiscal --------------------------------------------------

/** ~10 MB binary ≈ 14 MB of base64 (SPEC §7.1: imagem ≤ 10 MB). Caps payload to
 * protect the OCR quota/cost from an oversized upload. */
export const OCR_IMAGE_BASE64_MAX = 14_000_000;

export const ocrNotaFiscalRequestSchema = z.object({
  imageBase64: z.string().min(1).max(OCR_IMAGE_BASE64_MAX),
  concretagemRef: z.string().min(1).max(200),
});
export type OcrNotaFiscalRequest = z.infer<typeof ocrNotaFiscalRequestSchema>;

/** A single OCR-extracted field with the model's confidence [0..1]. */
const ocrField = <T extends z.ZodTypeAny>(value: T) =>
  z.object({ value, confidence: z.number().min(0).max(1) });

export const ocrNotaFiscalResponseSchema = z.object({
  fields: z
    .object({
      nf_numero: ocrField(z.string()),
      fck_projeto: ocrField(z.number()),
      volume_m3: ocrField(z.number()),
      concreteira: ocrField(z.string()),
      data_concretagem: ocrField(isoDateSchema),
    })
    .partial(),
  lowConfidenceFields: z.array(z.string()),
});
export type OcrNotaFiscalResponse = z.infer<typeof ocrNotaFiscalResponseSchema>;

// ---- §5.2 registrar_ruptura (PostgREST RPC, snake_case) --------------------

export const registrarRupturaDadosSchema = z.object({
  peso_g: z.number().positive().nullish(),
  diametro_mm: z.number().positive().nullish(),
  altura_mm: z.number().positive().nullish(),
  carga_ruptura_kgf: z.number().int().positive(),
  tipo_fratura: tipoFraturaSchema,
});

export const registrarRupturaRequestSchema = z.object({
  cp_id: uuidSchema,
  dados: registrarRupturaDadosSchema,
});
export type RegistrarRupturaRequest = z.infer<typeof registrarRupturaRequestSchema>;

// ---- §5.3 gerar-laudo-pdf --------------------------------------------------

export const gerarLaudoPdfRequestSchema = z.object({ laudo_id: uuidSchema });
export type GerarLaudoPdfRequest = z.infer<typeof gerarLaudoPdfRequestSchema>;

export const gerarLaudoPdfResponseSchema = z.object({
  pdf_original_url: z.string().min(1),
  codigo_verificacao: z.string().min(1),
});
export type GerarLaudoPdfResponse = z.infer<typeof gerarLaudoPdfResponseSchema>;

// ---- §5.4 upload-laudo-assinado (multipart: pdf + laudo_id) ----------------

/** The non-file form fields of the signed-PDF upload (the PDF is a Blob part). */
export const uploadLaudoAssinadoFieldsSchema = z.object({ laudo_id: uuidSchema });
export type UploadLaudoAssinadoFields = z.infer<typeof uploadLaudoAssinadoFieldsSchema>;

export const uploadLaudoAssinadoResponseSchema = z.object({
  status: z.literal('assinado'),
  pdf_assinado_url: z.string().min(1),
});
export type UploadLaudoAssinadoResponse = z.infer<typeof uploadLaudoAssinadoResponseSchema>;

// ---- §5.5 validar-laudo (public) -------------------------------------------

export const validarLaudoQuerySchema = z.object({ codigo: z.string().min(1) });
export type ValidarLaudoQuery = z.infer<typeof validarLaudoQuerySchema>;

/** Public validation 200 body (SPEC §5.5). Read-only; never carries evidence. */
export const validarLaudoResponseSchema = z.object({
  autentico: z.boolean(),
  numero: z.string(),
  versao: z.number().int().positive(),
  cliente: z.string().nullable(),
  obra: z.string().nullable(),
  data_emissao: z.string().nullable(),
  resultados: z.array(
    z.object({
      idade_dias: z.number().int().positive(),
      fcm_mpa: z.number(),
      fck_projeto: z.number().nullable(),
    }),
  ),
});
export type ValidarLaudoResponse = z.infer<typeof validarLaudoResponseSchema>;

// ---- §5.6 exportar-excel ---------------------------------------------------

export const exportarExcelRequestSchema = z.object({
  periodo: z.object({ de: isoDateSchema, ate: isoDateSchema }),
  concreteira: z.string().nullish(),
  fckAlvo: z.number().positive().nullish(),
  obraId: uuidSchema.nullish(),
});
export type ExportarExcelRequest = z.infer<typeof exportarExcelRequestSchema>;

// ---- §5.7 enviar-email (internal) ------------------------------------------

/**
 * Internal e-mail worker request. `evento` selects the mode:
 *   - `processar_fila`        — drain pending `email_events` (retry, US24-CA5);
 *   - `cps_pendentes_coleta`  — compute pending collections + enqueue (cron, CA3);
 *   - a laudo event (`laudo_assinado`/`pronto_assinatura`) with `laudo_id` —
 *     enqueue that notification, then drain.
 * `laudo_id` is only required by the laudo-scoped events, so it is optional here.
 */
export const enviarEmailRequestSchema = z.object({
  evento: z.string().min(1),
  laudo_id: uuidSchema.nullish(),
});
export type EnviarEmailRequest = z.infer<typeof enviarEmailRequestSchema>;
