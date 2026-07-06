/**
 * Thin Resend REST client (SPEC §2.2: Resend for transactional e-mail). Calls
 * the provider directly via fetch — no SDK dependency — and NEVER throws: it
 * returns a discriminated result so the worker records failure on the queue and
 * keeps going (US24-CA5). The API key lives only in the function environment
 * (SPEC §7.1).
 */
import type { EmailContent } from '@concreto/shared';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Laboratório de Concreto <no-reply@laboratorio.example.com>';

/** Outcome of a delivery attempt. */
export type SendResult = { ok: true; id: string | null } | { ok: false; error: string };

/**
 * Sends one e-mail via Resend. A missing API key, a non-2xx response or a
 * network error all resolve to `{ ok: false }` with a short reason — the caller
 * marks the row `falhou` and moves on.
 */
export async function sendEmail(to: string, content: EmailContent): Promise<SendResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY ausente' };
  }
  const from = Deno.env.get('EMAIL_FROM') ?? DEFAULT_FROM;

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: content.assunto,
        text: content.corpo,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return { ok: false, error: `Resend ${response.status}: ${detail.slice(0, 200)}` };
    }
    const data = (await response.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: data.id ?? null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'erro de rede' };
  }
}
