import { describe, expect, it } from 'vitest';

import { FixedWindowRateLimiter } from './rate-limit';

describe('FixedWindowRateLimiter', () => {
  it('allows up to the limit then blocks within the same window (429 surface)', () => {
    const clock = 1_000;
    const limiter = new FixedWindowRateLimiter({ limit: 3, windowMs: 1_000, now: () => clock });

    expect(limiter.hit('ip').allowed).toBe(true); // 1
    expect(limiter.hit('ip').allowed).toBe(true); // 2
    const third = limiter.hit('ip'); // 3 (last allowed)
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);

    const fourth = limiter.hit('ip'); // 4 — blocked
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
  });

  it('resets once the window elapses', () => {
    let clock = 0;
    const limiter = new FixedWindowRateLimiter({ limit: 2, windowMs: 1_000, now: () => clock });

    expect(limiter.hit('ip').allowed).toBe(true);
    expect(limiter.hit('ip').allowed).toBe(true);
    expect(limiter.hit('ip').allowed).toBe(false);

    clock += 1_000; // window elapsed
    const afterReset = limiter.hit('ip');
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(1);
  });

  it('counts each key (IP) independently', () => {
    const clock = 0;
    const limiter = new FixedWindowRateLimiter({ limit: 1, windowMs: 1_000, now: () => clock });

    expect(limiter.hit('ip-a').allowed).toBe(true);
    expect(limiter.hit('ip-a').allowed).toBe(false);
    // A different IP still has its full budget.
    expect(limiter.hit('ip-b').allowed).toBe(true);
  });

  it('sweeps elapsed windows to bound memory', () => {
    let clock = 0;
    const limiter = new FixedWindowRateLimiter({ limit: 1, windowMs: 1_000, now: () => clock });
    limiter.hit('ip');
    clock += 2_000;
    limiter.sweep();
    // After the sweep the key starts a fresh window.
    expect(limiter.hit('ip').remaining).toBe(0);
    expect(limiter.hit('ip').allowed).toBe(false);
  });
});
