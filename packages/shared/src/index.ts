/**
 * @concreto/shared — framework-agnostic domain core.
 *
 * The single, once-tested home of the concrete-lab domain: MPa calculation,
 * 7/14→28d projection, engineering ranges, CP/Laudo state machines, Zod schemas,
 * constants and the Portuguese message catalog. Consumed identically by the
 * mobile app, the web app and the Supabase Edge Functions — the domain rules are
 * NEVER reimplemented downstream (DRY / SOLID).
 */

// Enums (mirror of the Postgres enums).
export * from './enums';

// Errors.
export { DomainError, isDomainError, type DomainErrorCode } from './errors';

// Engineering (MPa, projection, ranges, rounding).
export * from './engineering';

// State machines (CP + Laudo guards).
export * from './state-machines';

// Zod schemas (entities + Edge Function/RPC payloads).
export * from './schemas';

// Constants (fracture types, projection factors, molds).
export * from './constants';

// Concretagem (molding-config + OCR-form derivation, S004).
export * from './concretagem';

// Coleta (24h collection agenda + collect-error mapping, S005).
export * from './coleta';

// Dashboard (operational-home metrics: period counters, overdue collection,
// upcoming ruptures — S010).
export * from './dashboard';

// Etiquetas (printable label model, S005).
export * from './etiquetas';

// Prensa (rupture agenda, error mapping, per-age result classification,
// evidence watermark — S006).
export * from './prensa';

// Laudo (report consolidation: FCM per age, resistance curve, RPC error
// mapping — S007; public validation view model — S009).
export * from './laudo';

// Export (per-concreteira Excel comparison aggregation — S009).
export * from './export';

// E-mail (transactional templates — S009).
export * from './email';

// Network error mapping (Supabase/PostgREST → PT messages).
export * from './net';

// Message catalog (PT).
export * from './messages';

// Auth & role-based navigation (login throttle, error mapping, route guards).
export * from './auth';

// Pure utilities (dates, CNPJ).
export * from './lib';
