/**
 * POST /functions/v1/enviar-email (SPEC §5.7 / F-S009-4 / US24).
 *
 * Transactional e-mail worker. PRODUCERS enqueue rows in `email_events`
 * (S008 `upload-laudo-assinado` → laudo_assinado/CA1; the 0017 trigger →
 * pronto_assinatura/CA2; the 0017 daily cron → cps_pendentes_coleta/CA3; the
 * S004 invite covers the new-client welcome/CA4). This worker DRAINS the queue,
 * renders each row with the shared templates (DRY) and delivers via Resend,
 * recording enviado/falhou + tentativas so failures are retried and NEVER block
 * the operational flow (US24-CA5).
 *
 * Modes (by `evento`):
 *   - `cps_pendentes_coleta` → enqueue the daily pending-collection e-mails first;
 *   - anything else (e.g. `processar_fila`) → just drain.
 *
 * Auth: internal. Either the `x-cron-secret` header matches `EMAIL_CRON_SECRET`
 * (cron / server-to-server) or the caller is an admin engineer.
 */
import {
  buildEmailContent,
  enviarEmailRequestSchema,
  isEmailEvento,
  MESSAGES,
  type EmailPayload,
} from '@concreto/shared';

import { errorResponse, handlePreflight, jsonResponse } from '../_shared/http.ts';
import { isAdmin, resolveCaller, serviceClient } from '../_shared/supabase.ts';
import { type EmailEventRow, isDeliverable, MAX_EMAIL_ATTEMPTS, shouldAttempt } from './logic.ts';
import { sendEmail } from './resend.ts';

const DRAIN_BATCH = 100;

/** Verifies the internal caller: cron secret OR an admin engineer. */
async function isAuthorized(
  req: Request,
  service: ReturnType<typeof serviceClient>,
): Promise<boolean> {
  const cronSecret = Deno.env.get('EMAIL_CRON_SECRET');
  const provided = req.headers.get('x-cron-secret');
  if (cronSecret && provided && provided === cronSecret) {
    return true;
  }
  const caller = await resolveCaller(req.headers.get('Authorization'));
  return caller ? await isAdmin(service, caller.id) : false;
}

/** Enriches the stored payload with the portal link for client-facing events. */
function payloadWithPortal(evento: string, payload: EmailPayload | null): EmailPayload {
  const base = payload ?? {};
  if (evento === 'laudo_assinado' || evento === 'novo_cliente') {
    const site = Deno.env.get('PUBLIC_SITE_URL');
    return {
      ...base,
      portalUrl: base.portalUrl ?? (site ? `${site.replace(/\/+$/, '')}/portal` : null),
    };
  }
  return base;
}

/** Drains eligible queued rows, delivering each and recording the outcome. */
async function drainQueue(
  service: ReturnType<typeof serviceClient>,
): Promise<{ processados: number; enviados: number; falhas: number }> {
  const { data, error } = await service
    .from('email_events')
    .select('id, evento, destinatario, payload, status, tentativas')
    .in('status', ['pendente', 'falhou'])
    .lt('tentativas', MAX_EMAIL_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(DRAIN_BATCH);

  if (error) {
    console.error('[enviar-email] falha ao ler a fila:', error);
    return { processados: 0, enviados: 0, falhas: 0 };
  }

  const rows = (data as EmailEventRow[] | null) ?? [];
  let enviados = 0;
  let falhas = 0;

  for (const row of rows) {
    if (!shouldAttempt(row)) {
      continue;
    }
    // Unrecognized event / missing recipient: stop retrying (mark exhausted).
    if (!isDeliverable(row)) {
      await service
        .from('email_events')
        .update({
          status: 'falhou',
          tentativas: MAX_EMAIL_ATTEMPTS,
          last_error: 'evento ou destinatário inválido',
        })
        .eq('id', row.id);
      falhas += 1;
      continue;
    }

    const content = buildEmailContent(
      // guarded by isDeliverable → isEmailEvento
      isEmailEvento(row.evento) ? row.evento : 'laudo_assinado',
      payloadWithPortal(row.evento, row.payload),
    );
    const result = await sendEmail(row.destinatario, content);

    if (result.ok) {
      await service
        .from('email_events')
        .update({ status: 'enviado', last_error: null })
        .eq('id', row.id);
      enviados += 1;
    } else {
      await service
        .from('email_events')
        .update({ status: 'falhou', tentativas: row.tentativas + 1, last_error: result.error })
        .eq('id', row.id);
      falhas += 1;
    }
  }

  return { processados: rows.length, enviados, falhas };
}

Deno.serve(async (req: Request): Promise<Response> => {
  const preflight = handlePreflight(req);
  if (preflight) {
    return preflight;
  }

  const service = serviceClient();

  // ----- Internal authorization.
  if (!(await isAuthorized(req, service))) {
    return errorResponse(401, 'NAO_AUTORIZADO', MESSAGES.http.unauthorized);
  }

  // ----- Validate the request.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, 'PAYLOAD_INVALIDO', MESSAGES.http.validation);
  }
  const parsed = enviarEmailRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, 'PAYLOAD_INVALIDO', MESSAGES.http.validation);
  }

  // ----- Pre-step: the daily cron enqueues the pending-collection e-mails.
  if (parsed.data.evento === 'cps_pendentes_coleta') {
    const { error } = await service.rpc('enqueue_cps_pendentes_coleta_emails');
    if (error) {
      console.error('[enviar-email] falha ao enfileirar cps_pendentes_coleta:', error);
    }
  }

  // ----- Drain + deliver. A queued-and-delivered run reports `queued: true`
  // (SPEC §5.7); delivery failures are recorded, never propagated (US24-CA5).
  const summary = await drainQueue(service);
  return jsonResponse({ queued: true, ...summary }, 200);
});
