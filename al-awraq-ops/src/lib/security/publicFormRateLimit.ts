import "server-only";

/**
 * Rate limiting for the public "Request a Quote" form — the app's first
 * unauthenticated write path (see src/actions/public.ts). Same in-memory
 * Map-based approach as src/lib/auth/rateLimit.ts (login attempts), kept as
 * a separate module rather than generalizing that one: login limiting is
 * keyed by email and gates an authentication attempt, this is keyed by IP
 * address and gates an anonymous write — different enough failure modes
 * (a shared IP behind NAT/office wifi legitimately submitting more than
 * once) to warrant a looser threshold, not the same function reused.
 *
 * Same documented limits as the login limiter: in-memory, resets on
 * restart, no cross-instance sharing — correct for a single local dev
 * process, not production-grade. Tracked in docs/OPEN_DECISIONS.md
 * alongside the rest of this feature's "not yet approved for real/public
 * use" flags.
 */

const MAX_SUBMISSIONS = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

type Record_ = { count: number; windowStartedAt: number };

const submissions = new Map<string, Record_>();

export function checkPublicFormRateLimit(ip: string): {
  allowed: boolean;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const record = submissions.get(ip);

  if (!record || now - record.windowStartedAt > WINDOW_MS) {
    return { allowed: true };
  }
  if (record.count >= MAX_SUBMISSIONS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((record.windowStartedAt + WINDOW_MS - now) / 1000),
    };
  }
  return { allowed: true };
}

export function recordPublicFormSubmission(ip: string): void {
  const now = Date.now();
  const record = submissions.get(ip);

  if (!record || now - record.windowStartedAt > WINDOW_MS) {
    submissions.set(ip, { count: 1, windowStartedAt: now });
    return;
  }
  submissions.set(ip, { ...record, count: record.count + 1 });
}
