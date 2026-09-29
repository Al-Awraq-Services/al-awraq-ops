import "server-only";
import { hash, verify } from "@node-rs/argon2";
import { randomBytes } from "node:crypto";

/**
 * Password hashing (argon2id) per docs/SECURITY_BASELINE.md.
 *
 * Uses @node-rs/argon2 (napi-rs prebuilt binaries) rather than the plain
 * `argon2` package specifically to avoid a native-toolchain build step on
 * the developer's machine — confirmed working locally (hash/verify
 * round-trip tested directly) before being wired into any auth flow.
 *
 * `import "server-only"` is load-bearing here, not decorative: this module
 * pulls in a native binary and must never reach a browser bundle. A first
 * version of this file re-exported MIN_PASSWORD_LENGTH for convenience,
 * which caused a Client Component to import this whole module and broke
 * the production build trying to bundle the native module for the browser
 * — confirmed by a real failing `npm run build`. Fixed by moving the
 * constant to lib/validation/constants.ts, which has no server-only
 * dependency. See docs/HANDOVER_LOG.md Phase B entry.
 */

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain);
}

export async function verifyPassword(
  passwordHash: string,
  plain: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, plain);
  } catch {
    // A malformed/unusable hash (e.g. the placeholder hash set on account
    // creation before a real password exists) must never throw into the
    // caller — it must simply fail verification.
    return false;
  }
}

/**
 * Generates a passwordHash that cannot be produced by any real password.
 * Used when an Admin creates an account: the account exists but cannot be
 * logged into until the holder consumes a setup token (src/actions/auth.ts)
 * and sets a real password. This avoids ever needing a nullable
 * passwordHash column or a separate "has no password yet" flag.
 */
export async function unusablePasswordHash(): Promise<string> {
  return hash(randomBytes(32).toString("hex"));
}
