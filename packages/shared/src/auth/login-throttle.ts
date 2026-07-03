/**
 * Client-side login throttle (F-S003-1 sad path).
 *
 * SPEC §3 rule: "3+ tentativas erradas em 5 min ⇒ 'Muitas tentativas. Aguarde
 * 1 minuto e tente novamente.'". This is a `[PREMISSA]` client-side guard that
 * complements Supabase Auth's own rate limiting — it gives the user the exact
 * Portuguese message instantly, before another network round-trip.
 *
 * The function is PURE: the caller owns the list of failed-attempt timestamps
 * (persisted in a store) and passes `now`; this module only decides the verdict.
 */

/** Tunables for the login throttle. */
export interface LoginThrottleConfig {
  /** Sliding window in which failed attempts are counted. */
  windowMs: number;
  /** Failed attempts within the window that trigger a block. */
  maxAttempts: number;
  /** How long the block lasts, measured from the most recent failed attempt. */
  blockMs: number;
}

/** SPEC defaults: 3 failures in 5 min ⇒ blocked for 1 min. */
export const DEFAULT_LOGIN_THROTTLE: LoginThrottleConfig = {
  windowMs: 5 * 60_000,
  maxAttempts: 3,
  blockMs: 60_000,
};

/** Verdict returned by {@link evaluateLoginThrottle}. */
export interface LoginThrottleState {
  /** Whether the user is currently blocked from submitting. */
  blocked: boolean;
  /** Milliseconds until the block lifts (0 when not blocked). */
  retryAfterMs: number;
}

/**
 * Decides whether a login submit must be blocked given past failed attempts.
 *
 * @param failedAttemptTimestamps epoch-ms timestamps of previous failed logins.
 * @param now current epoch-ms.
 * @param config throttle tunables (defaults to {@link DEFAULT_LOGIN_THROTTLE}).
 */
export function evaluateLoginThrottle(
  failedAttemptTimestamps: readonly number[],
  now: number,
  config: LoginThrottleConfig = DEFAULT_LOGIN_THROTTLE,
): LoginThrottleState {
  const recent = failedAttemptTimestamps.filter((t) => now - t < config.windowMs);
  if (recent.length < config.maxAttempts) {
    return { blocked: false, retryAfterMs: 0 };
  }

  const newest = recent.reduce((max, t) => (t > max ? t : max), recent[0] ?? now);
  const unblockAt = newest + config.blockMs;
  if (now >= unblockAt) {
    return { blocked: false, retryAfterMs: 0 };
  }
  return { blocked: true, retryAfterMs: unblockAt - now };
}

/**
 * Drops timestamps that fell out of the sliding window. Callers use this to
 * keep the persisted attempt list from growing unbounded.
 */
export function pruneLoginAttempts(
  failedAttemptTimestamps: readonly number[],
  now: number,
  config: LoginThrottleConfig = DEFAULT_LOGIN_THROTTLE,
): number[] {
  return failedAttemptTimestamps.filter((t) => now - t < config.windowMs);
}
