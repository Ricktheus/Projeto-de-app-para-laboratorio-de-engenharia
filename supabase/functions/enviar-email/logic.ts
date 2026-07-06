/**
 * Pure e-mail queue logic (no I/O) so the retry policy is unit-testable without
 * a DB or the provider (SPEC §7.2 spirit). The orchestrator (index.ts) wires
 * these decisions to `email_events` and Resend.
 */
import { type EmailPayload, isEmailEvento } from '@concreto/shared';

/** Max delivery attempts before a row is left as a permanent failure (US24-CA5). */
export const MAX_EMAIL_ATTEMPTS = 3;

/** Statuses a queued row can hold. */
export type EmailStatus = 'pendente' | 'enviado' | 'falhou';

/** A queued e-mail row as read from `email_events`. */
export interface EmailEventRow {
  id: string;
  evento: string;
  destinatario: string;
  payload: EmailPayload | null;
  status: string;
  tentativas: number;
}

/**
 * Whether a row is still eligible for a delivery attempt: pending or previously
 * failed but under the attempt cap. Already-sent rows and exhausted failures are
 * skipped (they will not be retried, US24-CA5).
 */
export function shouldAttempt(row: Pick<EmailEventRow, 'status' | 'tentativas'>): boolean {
  if (row.status === 'enviado') {
    return false;
  }
  return row.tentativas < MAX_EMAIL_ATTEMPTS;
}

/** A recognized, deliverable row carries a known event and a recipient. */
export function isDeliverable(row: EmailEventRow): boolean {
  return isEmailEvento(row.evento) && row.destinatario.trim().length > 0;
}
