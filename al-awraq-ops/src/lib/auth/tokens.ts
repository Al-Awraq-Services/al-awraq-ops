import "server-only";
import { randomBytes, createHash } from "node:crypto";

/**
 * Shared helpers for anything that hands a one-time secret to a browser
 * (session cookies, setup/reset tokens): generate a high-entropy raw value,
 * store only its SHA-256 hash in the database, and compare by re-hashing
 * the value presented later. The raw value is never persisted anywhere —
 * per docs/SECURITY_BASELINE.md ("never log secrets, tokens, or session
 * values").
 */

export function generateRawToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
