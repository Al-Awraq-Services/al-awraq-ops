import "server-only";

/**
 * Login attempt rate limiting, per docs/SECURITY_BASELINE.md — the one
 * abuse control marked "mandatory now" rather than deferred, because it
 * protects the single credential set every other control depends on.
 *
 * Deliberately in-memory for the prototype: a Map keyed by lowercased
 * email, checked and updated per attempt. This is a real, working limiter,
 * not a placeholder — but it has two known, documented limits appropriate
 * to a single local dev instance and inappropriate beyond that:
 *   1. It resets on every server restart.
 *   2. It does not share state across multiple server instances.
 * Both must be revisited (a shared store, e.g. the database or Redis)
 * before this app runs anywhere other than one local process — tracked in
 * docs/OPEN_DECISIONS.md.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

type AttemptRecord = {
  count: number;
  windowStartedAt: number;
  lockedUntil: number | null;
};

const attempts = new Map<string, AttemptRecord>();

function keyFor(email: string): string {
  return email.trim().toLowerCase();
}

export function checkLoginRateLimit(email: string): {
  allowed: boolean;
  retryAfterSeconds?: number;
} {
  const record = attempts.get(keyFor(email));
  if (!record) return { allowed: true };

  const now = Date.now();
  if (record.lockedUntil && record.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((record.lockedUntil - now) / 1000),
    };
  }
  return { allowed: true };
}

export function recordLoginFailure(email: string): void {
  const key = keyFor(email);
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now - record.windowStartedAt > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStartedAt: now, lockedUntil: null });
    return;
  }

  const count = record.count + 1;
  if (count >= MAX_ATTEMPTS) {
    attempts.set(key, {
      count,
      windowStartedAt: record.windowStartedAt,
      lockedUntil: now + LOCKOUT_MS,
    });
  } else {
    attempts.set(key, { ...record, count });
  }
}

export function resetLoginAttempts(email: string): void {
  attempts.delete(keyFor(email));
}
