import "server-only";

/**
 * Per-account login + permissions (see prisma/schema.prisma `User`).
 *
 * Password is hashed (argon2id) into `User.passwordHash`. A successful
 * login issues a signed, stateless cookie carrying that user's id (see
 * src/lib/auth/sessionToken.ts) — the same signature-verification logic
 * also runs in src/proxy.ts, but only this module (which can reach the
 * database) resolves the cookie into an actual `User` row and checks
 * permissions. Every Server Action re-derives the current user from the
 * cookie itself — never from a client-submitted id or role.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hash as argon2Hash, verify as argon2Verify } from "@node-rs/argon2";
import { db } from "@/lib/db";
import { signSessionToken, verifySessionToken } from "./sessionToken";
import type { User } from "@/generated/prisma/client";

export const SESSION_COOKIE_NAME = "aa_app_session";
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type PermissionKey =
  | "canViewInvoices"
  | "canManageInvoices"
  | "canViewCustomers"
  | "canManageCustomers"
  | "canViewInquiries"
  | "canManageInquiries"
  | "canViewPurchaseOrders"
  | "canManagePurchaseOrders";

export async function hashPassword(raw: string): Promise<string> {
  return argon2Hash(raw);
}

export async function verifyPasswordAgainstHash(
  raw: string,
  hash: string,
): Promise<boolean> {
  return argon2Verify(hash, raw);
}

export async function createAppSessionCookie(userId: string): Promise<void> {
  const token = await signSessionToken(userId, SESSION_LIFETIME_MS);
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

/**
 * Resolves the signed cookie into a real, live `User` row — null if the
 * cookie is missing/invalid/expired, or if the account it names no longer
 * exists (e.g. deleted by the main account since the cookie was issued).
 * Always re-read from the database, never cached across requests, so a
 * permission change or account deletion takes effect on the very next
 * request.
 */
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const result = await verifySessionToken(store.get(SESSION_COOKIE_NAME)?.value);
  if (!result) return null;
  return db.user.findUnique({ where: { id: result.userId } });
}

export function userHasPermission(user: User, key: PermissionKey): boolean {
  // The main account implicitly has every permission — the four `can…`
  // flags only matter for non-main accounts.
  return user.isMainAccount || user[key];
}

/** Server Components: redirect to /login if there's no valid session. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/** Server Components: redirect to /invoices unless this is the main account. */
export async function requireMainAccount(): Promise<User> {
  const user = await requireUser();
  if (!user.isMainAccount) {
    redirect("/invoices");
  }
  return user;
}

/** Server Components: redirect to /login (or /invoices if logged in but lacking
 * the permission) unless the current account has `key`. */
export async function requirePermission(key: PermissionKey): Promise<User> {
  const user = await requireUser();
  if (!userHasPermission(user, key)) {
    redirect("/invoices");
  }
  return user;
}

/** Server Actions: throw (no redirect available) if there's no valid session. */
export async function requireUserForAction(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated.");
  }
  return user;
}

/** Server Actions: throw unless this is the main account. */
export async function requireMainAccountForAction(): Promise<User> {
  const user = await requireUserForAction();
  if (!user.isMainAccount) {
    throw new Error("Only the main account can do this.");
  }
  return user;
}

/** Server Actions: throw unless the current account has `key`. */
export async function requirePermissionForAction(key: PermissionKey): Promise<User> {
  const user = await requireUserForAction();
  if (!userHasPermission(user, key)) {
    throw new Error("You don't have permission to do this.");
  }
  return user;
}
