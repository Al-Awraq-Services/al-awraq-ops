import "server-only";

/**
 * Single-password app gate — no accounts, no roles, no Session table.
 *
 * Password is hashed (argon2id) into `BusinessProfile.passwordHash`.
 * A successful check issues a signed, stateless cookie (see
 * src/lib/auth/sessionToken.ts) — the same verification logic also runs
 * in middleware.ts on every request.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hash as argon2Hash, verify as argon2Verify } from "@node-rs/argon2";
import { signSessionToken, verifySessionToken } from "./sessionToken";

export const SESSION_COOKIE_NAME = "aa_app_session";
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function hashPassword(raw: string): Promise<string> {
  return argon2Hash(raw);
}

export async function verifyPasswordAgainstHash(
  raw: string,
  hash: string,
): Promise<boolean> {
  return argon2Verify(hash, raw);
}

export async function createAppSessionCookie(): Promise<void> {
  const token = await signSessionToken(SESSION_LIFETIME_MS);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_LIFETIME_MS / 1000,
  });
}

export async function destroyAppSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

export async function hasValidAppSession(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE_NAME)?.value);
}

/** Server Components: redirect to /login if the app session is missing/expired. */
export async function requireAppSession(): Promise<void> {
  if (!(await hasValidAppSession())) {
    redirect("/login");
  }
}

/** Server Actions: throw (no redirect available) if the app session is invalid. */
export async function requireAppSessionForAction(): Promise<void> {
  if (!(await hasValidAppSession())) {
    throw new Error("Not authenticated.");
  }
}
