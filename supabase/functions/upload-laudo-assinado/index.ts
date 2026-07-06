/**
 * POST /functions/v1/upload-laudo-assinado (SPEC §5.4 / F-S008-2 / US15).
 *
 * Multipart upload of the gov.br-signed PDF. Stores it at
 * `laudos/<id>/assinado.pdf`, fills `pdf_assinado_url` + `assinatura_rt_url` and
 * moves the report `pronto_assinatura → assinado` — but ONLY when a valid PDF is
 * present (one RT signature is enough). An optional 2nd file (`pdf_elaborador`)
 * fills `assinatura_elaborador_url`. On publication it enqueues the
 * `laudo_assinado` e-mail to the client (US24-CA1); the actual delivery is the
 * S009 `enviar-email` worker, so a failed enqueue never blocks publication
 * (US24-CA5 spirit).
 *
 * Exact envelopes (SPEC §5.4):
 *   415 ARQUIVO_INVALIDO   — "Envie um arquivo PDF válido."
 *   409 SEM_PDF_ASSINADO   — "Faça o upload do PDF assinado antes de publicar o laudo."
 *
 * RBAC: engineers only (eng_lab / eng_escritorio).
 */
import { MESSAGES, uploadLaudoAssinadoFieldsSchema } from '@concreto/shared';

import { errorResponse, handlePreflight, jsonResponse } from '../_shared/http.ts';
import { resolveCaller, serviceClient } from '../_shared/supabase.ts';

const LAUDOS_BUCKET = 'laudos';
const MAX_PDF_BYTES = 20 * 1024 * 1024; // SPEC §7.1: PDF ≤ 20 MB.
const PDF_MAGIC = '%PDF-';

async function isEngineer(
  service: ReturnType<typeof serviceClient>,
  userId: string,
): Promise<boolean> {
  const { data } = await service.from('usuarios').select('role').eq('id', userId).maybeSingle();
  const role = (data as { role?: string } | null)?.role;
  return role === 'eng_lab' || role === 'eng_escritorio';
}

/** True when the blob looks like a real PDF (magic bytes) within the size cap. */
async function isValidPdf(file: File): Promise<boolean> {
  if (file.size === 0 || file.size > MAX_PDF_BYTES) {
    return false;
  }
  const head = new Uint8Array(await file.slice(0, PDF_MAGIC.length).arrayBuffer());
  return new TextDecoder().decode(head) === PDF_MAGIC;
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

  const service = serviceClient();

  // ----- Authorization: engineers only.
  if (!(await isEngineer(service, caller.id))) {
    return errorResponse(403, 'SEM_PERMISSAO', MESSAGES.http.forbidden);
  }

  // ----- Parse the multipart body.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return errorResponse(400, 'PAYLOAD_INVALIDO', MESSAGES.http.validation);
  }

  const fields = uploadLaudoAssinadoFieldsSchema.safeParse({ laudo_id: form.get('laudo_id') });
  if (!fields.success) {
    return errorResponse(400, 'PAYLOAD_INVALIDO', MESSAGES.http.validation);
  }
  const laudoId = fields.data.laudo_id;

  // ----- The signed PDF is mandatory (US15-CA3): missing ⇒ SEM_PDF_ASSINADO.
  const pdf = form.get('pdf');
  if (!(pdf instanceof File) || pdf.size === 0) {
    return errorResponse(409, 'SEM_PDF_ASSINADO', MESSAGES.domain.SEM_PDF_ASSINADO);
  }
  // Not a real PDF (or too large) ⇒ ARQUIVO_INVALIDO.
  if (!(await isValidPdf(pdf))) {
    return errorResponse(415, 'ARQUIVO_INVALIDO', MESSAGES.domain.ARQUIVO_INVALIDO);
  }

  // ----- Optional 2nd signature (elaborador): validated the same way if present.
  const elaborador = form.get('pdf_elaborador');
  const hasElaborador = elaborador instanceof File && elaborador.size > 0;
  if (hasElaborador && !(await isValidPdf(elaborador as File))) {
    return errorResponse(415, 'ARQUIVO_INVALIDO', MESSAGES.domain.ARQUIVO_INVALIDO);
  }

  // ----- The laudo must exist; capture the client e-mail for the notification.
  const { data: laudo } = await service
    .from('laudos')
    .select('id, status, clientes(email)')
    .eq('id', laudoId)
    .maybeSingle<{
      id: string;
      status: string;
      clientes: { email: string | null } | { email: string | null }[] | null;
    }>();
  if (!laudo) {
    return errorResponse(404, 'LAUDO_NAO_ENCONTRADO', MESSAGES.http.notFound);
  }

  // ----- Store the signed PDF(s) in the private bucket.
  const signedPath = `${laudoId}/assinado.pdf`;
  const { error: uploadError } = await service.storage
    .from(LAUDOS_BUCKET)
    .upload(signedPath, pdf, { contentType: 'application/pdf', upsert: true });
  if (uploadError) {
    console.error('[upload-laudo-assinado] falha ao salvar PDF assinado:', uploadError);
    return errorResponse(500, 'ERRO_INTERNO', MESSAGES.http.serverError);
  }
  const pdfAssinadoUrl = `${LAUDOS_BUCKET}/${signedPath}`;

  let elaboradorUrl: string | null = null;
  if (hasElaborador) {
    const elabPath = `${laudoId}/assinado_elaborador.pdf`;
    const { error: elabError } = await service.storage
      .from(LAUDOS_BUCKET)
      .upload(elabPath, elaborador as File, { contentType: 'application/pdf', upsert: true });
    if (elabError) {
      console.error('[upload-laudo-assinado] falha ao salvar 2ª assinatura:', elabError);
      return errorResponse(500, 'ERRO_INTERNO', MESSAGES.http.serverError);
    }
    elaboradorUrl = `${LAUDOS_BUCKET}/${elabPath}`;
  }

  // ----- Publish: pronto_assinatura → assinado, guarded atomically by the state
  // (only a pronto_assinatura report can be published). The signed PDF also
  // stands as the RT signature (gov.br PAdES embeds it in the document).
  const { data: updated, error: updateError } = await service
    .from('laudos')
    .update({
      status: 'assinado',
      pdf_assinado_url: pdfAssinadoUrl,
      assinatura_rt_url: pdfAssinadoUrl,
      assinatura_elaborador_url: elaboradorUrl,
      data_emissao: new Date().toISOString().slice(0, 10),
    })
    .eq('id', laudoId)
    .eq('status', 'pronto_assinatura')
    .select('id')
    .maybeSingle();

  if (updateError) {
    console.error('[upload-laudo-assinado] falha ao publicar laudo:', updateError);
    return errorResponse(500, 'ERRO_INTERNO', MESSAGES.http.serverError);
  }
  if (!updated) {
    // Not in `pronto_assinatura` (already signed / still draft / changed) ⇒ conflict.
    return errorResponse(409, 'LAUDO_NAO_PUBLICAVEL', MESSAGES.http.conflict);
  }

  // ----- Enqueue the client notification (US24-CA1). Best-effort: a failed
  // enqueue is logged but never blocks publication (US24-CA5). Delivery is S009.
  const cliente = Array.isArray(laudo.clientes) ? laudo.clientes[0] : laudo.clientes;
  const destinatario = cliente?.email ?? null;
  if (destinatario) {
    const { error: emailError } = await service.from('email_events').insert({
      evento: 'laudo_assinado',
      destinatario,
      payload: { laudo_id: laudoId },
      status: 'pendente',
    });
    if (emailError) {
      console.error(
        '[upload-laudo-assinado] falha ao enfileirar e-mail (não bloqueia):',
        emailError,
      );
    }
  }

  return jsonResponse({ status: 'assinado', pdf_assinado_url: pdfAssinadoUrl }, 200);
});
