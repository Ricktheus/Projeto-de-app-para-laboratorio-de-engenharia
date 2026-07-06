/**
 * Deno unit tests for the e-mail queue retry policy (F-S009-4 / US24-CA5).
 * Run with: deno test supabase/functions/enviar-email/logic.test.ts
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { isDeliverable, MAX_EMAIL_ATTEMPTS, shouldAttempt } from './logic.ts';

Deno.test('shouldAttempt: pending rows are attempted', () => {
  assertEquals(shouldAttempt({ status: 'pendente', tentativas: 0 }), true);
});

Deno.test('shouldAttempt: failed rows are retried under the cap', () => {
  assertEquals(shouldAttempt({ status: 'falhou', tentativas: MAX_EMAIL_ATTEMPTS - 1 }), true);
});

Deno.test('shouldAttempt: exhausted failures are not retried', () => {
  assertEquals(shouldAttempt({ status: 'falhou', tentativas: MAX_EMAIL_ATTEMPTS }), false);
});

Deno.test('shouldAttempt: already sent rows are skipped', () => {
  assertEquals(shouldAttempt({ status: 'enviado', tentativas: 0 }), false);
});

Deno.test('isDeliverable: known event + recipient', () => {
  assertEquals(
    isDeliverable({
      id: '1',
      evento: 'laudo_assinado',
      destinatario: 'cliente@x.test',
      payload: null,
      status: 'pendente',
      tentativas: 0,
    }),
    true,
  );
});

Deno.test('isDeliverable: unknown event or empty recipient is not deliverable', () => {
  assertEquals(
    isDeliverable({
      id: '1',
      evento: 'evento_desconhecido',
      destinatario: 'x@x.test',
      payload: null,
      status: 'pendente',
      tentativas: 0,
    }),
    false,
  );
  assertEquals(
    isDeliverable({
      id: '2',
      evento: 'laudo_assinado',
      destinatario: '   ',
      payload: null,
      status: 'pendente',
      tentativas: 0,
    }),
    false,
  );
});
