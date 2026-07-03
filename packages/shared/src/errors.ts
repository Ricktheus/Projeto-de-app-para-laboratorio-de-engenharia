/**
 * Domain-level error codes.
 *
 * Every code maps to an exact Portuguese message in the `MESSAGES` catalog
 * (see `messages/`). The domain layer throws by CODE only; the UI/infra layer
 * resolves the localized message. This keeps the domain framework-agnostic and
 * the catalog the single source of truth (DRY).
 */
export type DomainErrorCode = 'CARGA_INVALIDA' | 'DIAMETRO_INVALIDO' | 'FATOR_PROJECAO_INVALIDO';

/**
 * Error thrown by pure domain functions when an invariant is violated.
 *
 * Carries a stable machine-readable `code` (never a localized string) so
 * callers can map it to a Portuguese message or an HTTP status deterministically.
 */
export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'DomainError';
    this.code = code;
    // Preserve `instanceof DomainError` when the class is transpiled to ES5/ES2015
    // targets (Expo/Metro, older bundlers) where extending built-ins breaks it.
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}

/** Type guard for {@link DomainError}. */
export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
