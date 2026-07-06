/**
 * Fixed-window in-memory rate limiter (SPEC §7.1). Pure and time-injectable so
 * the public validation endpoint (`validar-laudo`, F-S009-2) can cap requests
 * per IP without a DB round-trip, and so the decision is unit-testable without
 * real timers.
 *
 * `[PREMISSA]` The public page limit is 30 requests/min/IP (SPEC §7.1 / Apêndice
 * A #4). This is best-effort: an Edge Function instance is ephemeral, so the
 * counter is per-instance — enough to blunt scripted abuse of the anonymous
 * surface, documented as a premise.
 */

/** Result of a rate-limit check. */
export interface RateLimitResult {
  /** Whether the request is allowed (under the limit). */
  allowed: boolean;
  /** Requests still available in the current window (0 when blocked). */
  remaining: number;
  /** Epoch ms at which the current window resets. */
  resetAt: number;
}

/** One key's counter state within the current fixed window. */
interface WindowState {
  count: number;
  windowStart: number;
}

/** Default public-page limit: 30 requests per 60s per IP (SPEC §7.1). */
export const PUBLIC_RATE_LIMIT = 30;
export const PUBLIC_RATE_WINDOW_MS = 60_000;

/**
 * A fixed-window counter keyed by an arbitrary string (typically the client IP).
 * `now` is injected so tests drive time deterministically; production passes
 * `Date.now`. Stale windows are pruned lazily on access and via {@link sweep} to
 * bound memory on a long-lived instance.
 */
export class FixedWindowRateLimiter {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly buckets = new Map<string, WindowState>();

  constructor(options: { limit?: number; windowMs?: number; now?: () => number } = {}) {
    this.limit = options.limit ?? PUBLIC_RATE_LIMIT;
    this.windowMs = options.windowMs ?? PUBLIC_RATE_WINDOW_MS;
    this.now = options.now ?? Date.now;
  }

  /**
   * Registers one hit for `key` and returns whether it is allowed. The first
   * request of a window, and every request while the count is below the limit,
   * is allowed; the request that would exceed the limit is blocked (429).
   */
  hit(key: string): RateLimitResult {
    const now = this.now();
    const existing = this.buckets.get(key);

    if (!existing || now - existing.windowStart >= this.windowMs) {
      // New window (first hit or the previous window elapsed).
      this.buckets.set(key, { count: 1, windowStart: now });
      return { allowed: true, remaining: this.limit - 1, resetAt: now + this.windowMs };
    }

    const resetAt = existing.windowStart + this.windowMs;
    if (existing.count >= this.limit) {
      return { allowed: false, remaining: 0, resetAt };
    }
    existing.count += 1;
    return { allowed: true, remaining: this.limit - existing.count, resetAt };
  }

  /** Drops windows that have fully elapsed, bounding memory on a busy instance. */
  sweep(): void {
    const now = this.now();
    for (const [key, state] of this.buckets) {
      if (now - state.windowStart >= this.windowMs) {
        this.buckets.delete(key);
      }
    }
  }
}
