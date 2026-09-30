/**
 * Stateless, signed session-token math for the single-password app gate.
 *
 * Deliberately edge-runtime-safe (Web Crypto only, no `node:crypto`, no
 * `next/headers`) so the exact same verification logic runs in both
 * `middleware.ts` (Edge runtime) and `src/lib/auth/appAuth.ts` (Node
 * runtime, Server Components/Actions) without duplication or drift.
 *
 * There is no session table — the token itself is a signed
 * `expiresAt.hmac` pair. A stolen/expired cookie can't be extended (the
 * expiry is inside the signed payload), and there's nothing to look up or
 * invalidate server-side (acceptable for a single-owner app with one
 * shared password; see docs/SECURITY_BASELINE.md for the tradeoff).
 */

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return bufToHex(sig);
}

function getSecret(): string {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "APP_SESSION_SECRET is not set. Add a long random value to .env — see .env.example.",
    );
  }
  return secret;
}

export async function signSessionToken(lifetimeMs: number): Promise<string> {
  const expiresAt = Date.now() + lifetimeMs;
  const mac = await hmacHex(getSecret(), String(expiresAt));
  return `${expiresAt}.${mac}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;
  const [expiresAtRaw, mac] = token.split(".");
  if (!expiresAtRaw || !mac) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expectedMac = await hmacHex(getSecret(), expiresAtRaw);
  return timingSafeEqualHex(mac, expectedMac);
}
