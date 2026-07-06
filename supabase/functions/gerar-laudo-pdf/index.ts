/**
 * POST /functions/v1/gerar-laudo-pdf (SPEC §5.3 / F-S008-1 / US14).
 *
 * Composes the locked report PDF for a `pronto_assinatura` laudo: the §11 layout
 * (header, client/obra meta, per-NF results table, resistance chart with the fck
 * line, considerações + automatic caveats, signatures, footer QR), applies
 * `ReadOnly=true, AllowPrinting=true, AllowCopy=false`, saves it to
 * `laudos/<id>/original.pdf` and fills `pdf_original_url` + `codigo_verificacao`.
 *
 * Exact envelopes (SPEC §5.3):
 *   409 LAUDO_NAO_PRONTO  — "O laudo precisa estar pronto para assinatura antes de gerar o PDF."
 *   422 SEM_RESULTADOS    — "Não há resultados válidos para gerar o laudo."
 *   500                   — chart rasterization / unexpected failure (+ log).
 *
 * RBAC: engineers only (eng_lab / eng_escritorio). The domain aggregation, chart
 * geometry and caveats all come from `packages/shared` (DRY).
 */
import {
  buildLaudoReport,
  buildResistenciaChart,
  gerarLaudoPdfRequestSchema,
  MESSAGES,
} from '@concreto/shared';

import { errorResponse, handlePreflight, jsonResponse } from '../_shared/http.ts';
import { resolveCaller, serviceClient } from '../_shared/supabase.ts';
import { ChartRasterError, generateQrPng, rasterizeChartPng } from './assets.ts';
import { loadReportInput } from './data.ts';
import { composeLaudoPdf } from './pdf.ts';
import { computeCodigoVerificacao, validationUrl } from './verification.ts';

const LAUDOS_BUCKET = 'laudos';

async function isEngineer(
  service: ReturnType<typeof serviceClient>,
  userId: string,
): Promise<boolean> {
  const { data } = await service.from('usuarios').select('role').eq('id', userId).maybeSingle();
  const role = (data as { role?: string } | null)?.role;
  return role === 'eng_lab' || role === 'eng_escritorio';
}

Deno.serve(async (req: Request): Promise<Response> => {
  const preflight = handlePreflight(req);
  if (preflight) {
    return preflight;
  }

  // ----- Auth (JWT required).
  const caller = await resolveCaller(req.headers.get('Authorization'));
  if (!caller) {
    return errorResponse(401, 'NAO_AUTENTICADO', MESSAGES.http.unauthorized);
  }

  // ----- Validate the request body.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, 'PAYLOAD_INVALIDO', MESSAGES.http.validation);
  }
  const parsed = gerarLaudoPdfRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, 'PAYLOAD_INVALIDO', MESSAGES.http.validation);
  }
  const { laudo_id: laudoId } = parsed.data;

  const service = serviceClient();

  // ----- Authorization: engineers only.
  if (!(await isEngineer(service, caller.id))) {
    return errorResponse(403, 'SEM_PERMISSAO', MESSAGES.http.forbidden);
  }

  // ----- Load the report + guards (not found / not ready).
  const loaded = await loadReportInput(service, laudoId);
  if (loaded.kind === 'not_found') {
    return errorResponse(404, 'LAUDO_NAO_ENCONTRADO', MESSAGES.http.notFound);
  }
  if (loaded.kind === 'not_ready') {
    return errorResponse(409, 'LAUDO_NAO_PRONTO', MESSAGES.domain.LAUDO_NAO_PRONTO);
  }

  const report = buildLaudoReport(loaded.input);
  if (!report.temResultado) {
    return errorResponse(422, 'SEM_RESULTADOS', MESSAGES.domain.SEM_RESULTADOS);
  }

  // ----- Anti-fraud verification code (SPEC §7.1): sha256(laudo_id + secret).
  const secret = Deno.env.get('LAUDO_VERIFICATION_SECRET');
  if (!secret) {
    console.error('[gerar-laudo-pdf] LAUDO_VERIFICATION_SECRET ausente');
    return errorResponse(500, 'ERRO_INTERNO', MESSAGES.http.serverError);
  }
  const codigo = await computeCodigoVerificacao(laudoId, secret);
  const siteUrl = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://laboratorio.example.com';

  try {
    // ----- Chart (SVG built in shared) → PNG, and the footer QR → PNG.
    const chart = buildResistenciaChart(report.curva, report.header.fckProjeto);
    const chartPng = await rasterizeChartPng(chart.svg, chart.geometry.width);
    const qrPng = await generateQrPng(validationUrl(siteUrl, codigo));

    // ----- Compose + lock the PDF.
    const pdfBytes = await composeLaudoPdf({
      report,
      chartPng,
      chartGeometry: chart.geometry,
      qrPng,
      codigoVerificacao: codigo,
    });

    // ----- Store it (private bucket) and record the URL + code.
    const path = `${laudoId}/original.pdf`;
    const { error: uploadError } = await service.storage
      .from(LAUDOS_BUCKET)
      .upload(path, pdfBytes, { contentType: 'application/pdf', upsert: true });
    if (uploadError) {
      console.error('[gerar-laudo-pdf] falha ao salvar PDF:', uploadError);
      return errorResponse(500, 'ERRO_INTERNO', MESSAGES.http.serverError);
    }

    const pdfOriginalUrl = `${LAUDOS_BUCKET}/${path}`;
    const { error: updateError } = await service
      .from('laudos')
      .update({ pdf_original_url: pdfOriginalUrl, codigo_verificacao: codigo })
      .eq('id', laudoId);
    if (updateError) {
      console.error('[gerar-laudo-pdf] falha ao atualizar laudo:', updateError);
      return errorResponse(500, 'ERRO_INTERNO', MESSAGES.http.serverError);
    }

    return jsonResponse({ pdf_original_url: pdfOriginalUrl, codigo_verificacao: codigo }, 200);
  } catch (error) {
    // Rasterization failure ⇒ 500 + log (F-S008-1 sad path); same for any other.
    if (error instanceof ChartRasterError) {
      console.error('[gerar-laudo-pdf] falha na rasterização do gráfico:', error);
    } else {
      console.error('[gerar-laudo-pdf] falha inesperada:', error);
    }
    return errorResponse(500, 'ERRO_INTERNO', MESSAGES.http.serverError);
  }
});
