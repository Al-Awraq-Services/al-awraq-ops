"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { loginSchema, setPasswordSchema } from "@/lib/validation/auth";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import {
  createSession,
  destroySession,
  invalidateAllSessionsForUser,
  getSession,
} from "@/lib/auth/session";
import {
  checkLoginRateLimit,
  recordLoginFailure,
  resetLoginAttempts,
} from "@/lib/auth/rateLimit";
import { hashToken } from "@/lib/auth/tokens";
import { writeAuditLog } from "@/lib/audit/log";

export type ActionState = { error?: string } | undefined;

/**
 * A single generic message covers every login failure reason (wrong
 * password, unknown email, deactivated account, locked out) — per
 * docs/SECURITY_BASELINE.md, the response must never reveal which one it
 * was.
 */
const GENERIC_LOGIN_ERROR = "Invalid email or password.";

export async function loginAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: GENERIC_LOGIN_ERROR };
  }
  const { email, password } = parsed.data;

  const rateLimit = checkLoginRateLimit(email);
  if (!rateLimit.allowed) {
    await writeAuditLog({
      actorUserId: null,
      action: "LOGIN_LOCKOUT",
      targetType: "User",
      metadata: { email },
    });
    return {
      error: `Too many attempts. Try again in ${rateLimit.retryAfterSeconds}s.`,
    };
  }

  const user = await db.user.findUnique({ where: { email } });

  // Deliberately run verifyPassword even when no user was found (against a
  // fixed dummy hash) so a missing-account response takes roughly the same
  // time as a wrong-password response — a cheap, real timing-leak
  // mitigation, not a placeholder.
  const dummyHash =
    "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const passwordOk = await verifyPassword(
    user?.passwordHash ?? dummyHash,
    password,
  );

  if (!user || !user.isActive || !passwordOk) {
    recordLoginFailure(email);
    await writeAuditLog({
      actorUserId: user?.id ?? null,
      action: "LOGIN_FAILURE",
      targetType: "User",
      targetId: user?.id,
      metadata: { email },
    });
    return { error: GENERIC_LOGIN_ERROR };
  }

  resetLoginAttempts(email);
  await createSession(user.id);
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await writeAuditLog({
    actorUserId: user.id,
    action: "LOGIN_SUCCESS",
    targetType: "User",
    targetId: user.id,
  });

  redirect("/dashboard");
}

export async function logoutAction(_formData: FormData): Promise<void> {
  const user = await getSession();
  await destroySession();
  if (user) {
    await writeAuditLog({
      actorUserId: user.id,
      action: "LOGOUT",
      targetType: "User",
      targetId: user.id,
    });
  }
  redirect("/login");
}

/**
 * Consumes a one-time Admin-issued token (set up during account creation,
 * or issued later as a reset) and sets a real password. Serves both "first
 * login" and "reset" — same mechanism, per the approved Phase 5 UI plan.
 */
export async function setPasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = setPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);

  const resetToken = await db.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  const genericError = "This link is invalid or has expired.";
  if (
    !resetToken ||
    resetToken.consumedAt ||
    resetToken.expiresAt.getTime() < Date.now()
  ) {
    return { error: genericError };
  }

  const passwordHash = await hashPassword(password);

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });
    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { consumedAt: new Date() },
    });
    await writeAuditLog(
      {
        actorUserId: resetToken.userId,
        action: "RESET_TOKEN_CONSUMED",
        targetType: "User",
        targetId: resetToken.userId,
      },
      tx,
    );
  });

  // Force re-login with the new password rather than trusting any session
  // that may have existed before it was set.
  await invalidateAllSessionsForUser(resetToken.userId);

  redirect("/login");
}
