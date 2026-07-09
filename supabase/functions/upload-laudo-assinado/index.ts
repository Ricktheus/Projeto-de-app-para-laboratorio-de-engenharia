/**
 * POST /functions/v1/upload-laudo-assinado (SPEC §5.4 / F-S008-2 / US15).
 *
 * Multipart upload of the gov.br-signed PDF. Stores it at
 * `laudos/<id>/assinado.pdf`, then moves the report `pronto_assinatura → assinado`
 * through the `publicar_laudo_assinado` RPC — called with the CALLER's JWT so the
 * audit trail records the real engineer (C3) and the transition is an atomic,
 * row-locked guard (C2). The stored PDF is never overwritten for a laudo that is
 * not publishable: the state is checked BEFORE the upload. A content sha256 is
 * persisted as a lifetime integrity anchor. One RT signature is enough; an
 * optional `pdf_elaborador` fills the 2nd-signature slot. On publication it
 * enqueues the `laudo_assinado` e-mail (US24-CA1); a failed enqueue never blocks
 * publication (US24-CA5).
 *
 * Exact envelopes (SPEC §5.4):
 *   415 ARQUIVO_INVALIDO   — "Envie um arquivo PDF válido."
 *   409 SEM_PDF_ASSINADO   — "Faça o upload do PDF assinado antes de publicar o laudo."
 *
 * RBAC: engineers only (eng_lab / eng_escritorio).
 */
import { MESSAGES, uploadLaudoAssinadoFieldsSchema } from '@concreto/shared';

import { errorResponse, handlePreflight, jsonResponse } from '../_shared/http.ts';
import { resolveCaller, serviceClient, userClient } from '../_shared/supabase.ts';

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

/** Hex sha256 of the file bytes — the lifetime integrity anchor of the signed PDF. */
async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req: Request): Promise<Response> => {
  const preflight = handlePreflight(req);
  if (preflight) {
    return preflight;
  }

  // ----- Auth (JWT required). Keep the header to run the publish RPC AS the user.
  const authHeader = req.headers.get('Authorization');
  const caller = await resolveCaller(authHeader);
  if (!caller || !authHeader) {
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

  // ----- Pre-check the state BEFORE touching Storage (C2): a laudo that is not
  // `pronto_assinatura` must never have its stored PDF overwritten. The final
  // transition is still guarded atomically by the RPC below (defence in depth).
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
  if (laudo.status !== 'pronto_assinatura') {
    return errorResponse(409, 'LAUDO_NAO_PUBLICAVEL', MESSAGES.http.conflict);
  }

  // ----- Store the signed PDF(s) in the private bucket + compute the hash.
  const pdfBytes = await pdf.arrayBuffer();
  const pdfSha256 = await sha256Hex(pdfBytes);
  const signedPath = `${laudoId}/assinado.pdf`;
  const { error: uploadError } = await service.storage
    .from(LAUDOS_BUCKET)
    .upload(signedPath, pdfBytes, { contentType: 'application/pdf', upsert: true });
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

  // ----- Publish through the RPC, AS the caller (auth.uid() ⇒ real actor in the
  // audit trail, C3). The RPC re-checks `pronto_assinatura` under a row lock, so a
  // concurrent publish cannot double-apply.
  const { error: rpcError } = await userClient(authHeader).rpc('publicar_laudo_assinado', {
    laudo_id: laudoId,
    pdf_assinado_url: pdfAssinadoUrl,
    assinatura_elaborador_url: elaboradorUrl,
    pdf_sha256: pdfSha256,
  });
  if (rpcError) {
    const token = (rpcError.message ?? '').trim();
    if (token === 'LAUDO_NAO_PUBLICAVEL') {
      return errorResponse(409, 'LAUDO_NAO_PUBLICAVEL', MESSAGES.http.conflict);
    }
    if (token === 'LAUDO_NAO_ENCONTRADO') {
      return errorResponse(404, 'LAUDO_NAO_ENCONTRADO', MESSAGES.http.notFound);
    }
    console.error('[upload-laudo-assinado] falha ao publicar laudo:', rpcError);
    return errorResponse(500, 'ERRO_INTERNO', MESSAGES.http.serverError);
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
