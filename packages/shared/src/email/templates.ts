/**
 * Transactional e-mail templates (F-S009-4 / US24). Maps a queued `email_events`
 * event to its Portuguese subject + body, reusing the exact SPEC copy from the
 * message catalog (DRY). Pure — the `enviar-email` Edge Function renders these
 * and hands the result to Resend; the retry/queue mechanics stay in the function
 * (US24-CA5). Adding a portal link when present keeps the body actionable.
 */
import { cpsPendentesColetaBody, MESSAGES } from '../messages/messages';

/** The e-mail events the worker can deliver (mirror of `email_events.evento`). */
export const EMAIL_EVENTOS = [
  'laudo_assinado',
  'pronto_assinatura',
  'cps_pendentes_coleta',
  'novo_cliente',
] as const;
export type EmailEvento = (typeof EMAIL_EVENTOS)[number];

export const isEmailEvento = (value: unknown): value is EmailEvento =>
  EMAIL_EVENTOS.includes(value as EmailEvento);

/** Optional context carried on the queued `email_events.payload`. */
export interface EmailPayload {
  /** Report number, appended to laudo-related bodies when available. */
  numero?: string | null;
  /** Portal URL, appended as a call-to-action when available. */
  portalUrl?: string | null;
  /** Pending-collection count for `cps_pendentes_coleta`. */
  quantidade?: number | null;
}

/** A rendered e-mail ready for the provider. */
export interface EmailContent {
  assunto: string;
  corpo: string;
}

function withPortal(corpo: string, portalUrl?: string | null): string {
  return portalUrl ? `${corpo}\n\nAcesse o portal: ${portalUrl}` : corpo;
}

function withNumero(corpo: string, numero?: string | null): string {
  return numero ? `${corpo} (Laudo ${numero})` : corpo;
}

/**
 * Renders the subject/body for an event. The first sentence of every body is the
 * exact string the SPEC mandates; optional payload context (report number,
 * portal link, pending count) is appended without altering that sentence.
 */
export function buildEmailContent(evento: EmailEvento, payload: EmailPayload = {}): EmailContent {
  switch (evento) {
    case 'laudo_assinado':
      return {
        assunto: MESSAGES.email.laudoAssinadoAssunto,
        corpo: withPortal(
          withNumero(MESSAGES.email.laudoAssinadoCorpo, payload.numero),
          payload.portalUrl,
        ),
      };
    case 'pronto_assinatura':
      return {
        assunto: MESSAGES.email.prontoAssinaturaAssunto,
        corpo: withNumero(MESSAGES.email.prontoAssinaturaCorpo, payload.numero),
      };
    case 'cps_pendentes_coleta':
      return {
        assunto: MESSAGES.email.cpsPendentesAssunto,
        corpo: cpsPendentesColetaBody(payload.quantidade ?? 0),
      };
    case 'novo_cliente':
      return {
        assunto: MESSAGES.email.novoClienteAssunto,
        corpo: withPortal(MESSAGES.email.novoClienteCorpo, payload.portalUrl),
      };
  }
}
