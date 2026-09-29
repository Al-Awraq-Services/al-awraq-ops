/**
 * Validation constants that both server code (zod schemas, password
 * hashing) and client components (form `minLength` hints) need to share.
 *
 * Deliberately has zero imports and zero "server-only" dependencies — it
 * must be safe to bundle into the browser. Anything that actually touches
 * a secret or a native module (src/lib/auth/password.ts) must NOT be
 * imported from a Client Component; this file exists specifically so
 * components never need to.
 */
export const MIN_PASSWORD_LENGTH = 12;
