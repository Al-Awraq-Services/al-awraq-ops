import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { generateRawToken, hashToken } from "@/lib/auth/tokens";
import type { Role } from "@/generated/prisma/enums";

const SESSION_COOKIE_NAME = "aa_session";
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

/**
 * DB-backed sessions (not stateless JWT), per docs/SECURITY_BASELINE.md —
 * required so that deactivating a user invalidates their access on the
 * very next request rather than waiting for a token to expire.
 */

export async function createSession(userId: string): Promise<void> {
  const raw = generateRawToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

  await db.session.create({
    data: { userId, tokenHash, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Reads the session cookie and returns the active user, or null if there is
 * no cookie, the session row does not exist, the session has expired, or
 * the user has been deactivated. Every one of those conditions is treated
 * identically by callers — none of them should ever reveal to the browser
 * which specific condition failed.
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  const tokenHash = hashToken(raw);
  const session = await db.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    // Lazily clean up the expired row rather than waiting on a cron job —
    // acceptable at prototype scale.
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (!session.user.isActive) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (raw) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(raw) } });
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Invalidates every active session for a user. Called on deactivation and
 * on password reset — both must immediately end any existing access,
 * per docs/SECURITY_BASELINE.md.
 */
export async function invalidateAllSessionsForUser(
  userId: string,
): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}
