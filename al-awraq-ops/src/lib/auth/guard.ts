import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "@/lib/auth/session";
import type { Role } from "@/generated/prisma/enums";

/**
 * Server-side authorization guards, per docs/SECURITY_BASELINE.md:
 * "Never rely only on hidden buttons or route guards" — these run on every
 * protected page load and inside every sensitive server action. The UI
 * hiding a nav item or a button is a convenience on top of these checks,
 * never a substitute for them.
 *
 * Two families are exported deliberately:
 *  - requireUser / requireRole: for Server Components (pages, layouts).
 *    On failure they redirect, because a page render has nowhere else to
 *    send a rejected request.
 *  - requireUserForAction / requireRoleForAction: for Server Actions.
 *    On failure they throw, because an action is a direct mutation request
 *    (reachable by a forged POST, per the Next.js Server Actions warning)
 *    and must fail loudly rather than silently redirect.
 */

export class UnauthenticatedError extends Error {
  constructor() {
    super("UNAUTHENTICATED");
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("FORBIDDEN");
  }
}

// --- Page / layout guards ---

export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(allowed: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!allowed.includes(user.role)) {
    redirect("/dashboard");
  }
  return user;
}

// --- Server Action guards ---

export async function requireUserForAction(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new UnauthenticatedError();
  return user;
}

export async function requireRoleForAction(
  allowed: Role[],
): Promise<SessionUser> {
  const user = await requireUserForAction();
  if (!allowed.includes(user.role)) throw new ForbiddenError();
  return user;
}
