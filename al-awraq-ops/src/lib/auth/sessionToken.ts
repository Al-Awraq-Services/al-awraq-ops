/**
 * Stateless, signed session-token math for the per-account login (see
 * prisma/schema.prisma `User`).
 *
 * Deliberately edge-runtime-safe (Web Crypto only, no `node:crypto`, no
 * `next/headers`) so the exact same verification logic runs in both
 * `src/proxy.ts` (Edge runtime) and `src/lib/auth/appAuth.ts` (Node
 * runtime, Server Components/Actions) without duplication or drift.
 *
 * There is no session table — the token is a signed `userId.expiresAt.hmac`
 * triple. The edge proxy can confirm a token is validly signed and
 * unexpired without a DB round-trip; only Server Components/Actions (which
 * *can* reach the database) resolve the `userId` into an actual `User` row
 * and check that account's permissions — see appAuth.ts.
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

// userId (cuid) never contains ".", so splitting the token on "." is safe.
export async function signSessionToken(
  userId: string,
  lifetimeMs: number,
): Promise<string> {
  const expiresAt = Date.now() + lifetimeMs;
  const payload = `${userId}.${expiresAt}`;
  const mac = await hmacHex(getSecret(), payload);
  return `${payload}.${mac}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<{ userId: string } | null> {
  if (!token) return null;
  const [userId, expiresAtRaw, mac] = token.split(".");
  if (!userId || !expiresAtRaw || !mac) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  const payload = `${userId}.${expiresAtRaw}`;
  const expectedMac = await hmacHex(getSecret(), payload);
  if (!timingSafeEqualHex(mac, expectedMac)) return null;

  return { userId };
}
