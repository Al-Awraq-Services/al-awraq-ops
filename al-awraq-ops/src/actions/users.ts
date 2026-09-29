"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createUserSchema } from "@/lib/validation/user";
import { requireRoleForAction } from "@/lib/auth/guard";
import { unusablePasswordHash } from "@/lib/auth/password";
import { invalidateAllSessionsForUser } from "@/lib/auth/session";
import { generateRawToken, hashToken } from "@/lib/auth/tokens";
import { writeAuditLog } from "@/lib/audit/log";
import type { Role } from "@/generated/prisma/enums";

/**
 * Admin-only user management. Every action here re-checks the ADMIN role
 * server-side via requireRoleForAction — reachable directly by a forged
 * POST regardless of what the UI shows, per the Next.js Server Actions
 * warning and docs/SECURITY_BASELINE.md.
 */

const RESET_TOKEN_LIFETIME_MS = 60 * 60 * 1000; // 1 hour

export type CreateUserState = { error?: string } | undefined;

export async function createUserAction(
  _prevState: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const admin = await requireRoleForAction(["ADMIN"]);

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await db.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { error: "A user with that email already exists." };
  }

  // The account exists but cannot be logged into until a setup token is
  // issued and consumed (src/actions/auth.ts setPasswordAction) — no
  // Admin ever sets or sees another user's real password.
  const passwordHash = await unusablePasswordHash();

  await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role as Role,
        passwordHash,
      },
    });
    await writeAuditLog(
      {
        actorUserId: admin.id,
        action: "USER_CREATED",
        targetType: "User",
        targetId: user.id,
        metadata: { email: user.email, role: user.role },
      },
      tx,
    );
  });

  revalidatePath("/users");
  redirect("/users");
}

export type IssueTokenState =
  | { error: string }
  | { token: string; userEmail: string }
  | undefined;

/**
 * Serves both "first-time account setup" and "later password reset" — the
 * same underlying mechanism, per the approved Phase 5 UI plan. The raw
 * token is returned to the caller exactly once and is never stored or
 * logged anywhere in plain form.
 */
export async function issueResetTokenAction(
  userId: string,
  _prevState: IssueTokenState,
  _formData: FormData,
): Promise<IssueTokenState> {
  const admin = await requireRoleForAction(["ADMIN"]);

  const targetUser = await db.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    return { error: "User not found." };
  }

  const raw = generateRawToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_LIFETIME_MS);

  await db.$transaction(async (tx) => {
    await tx.passwordResetToken.create({
      data: {
        userId: targetUser.id,
        tokenHash,
        expiresAt,
        issuedById: admin.id,
      },
    });
    await writeAuditLog(
      {
        actorUserId: admin.id,
        action: "RESET_TOKEN_ISSUED",
        targetType: "User",
        targetId: targetUser.id,
      },
      tx,
    );
  });

  revalidatePath("/users");
  return { token: raw, userEmail: targetUser.email };
}

export async function deactivateUserAction(userId: string): Promise<void> {
  const admin = await requireRoleForAction(["ADMIN"]);

  if (admin.id === userId) {
    throw new Error(
      "You cannot deactivate your own account (self-lockout prevention).",
    );
  }

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    await writeAuditLog(
      {
        actorUserId: admin.id,
        action: "USER_DEACTIVATED",
        targetType: "User",
        targetId: userId,
      },
      tx,
    );
  });

  // Deactivation must take effect immediately, not at next token expiry.
  await invalidateAllSessionsForUser(userId);

  revalidatePath("/users");
}

export async function reactivateUserAction(userId: string): Promise<void> {
  const admin = await requireRoleForAction(["ADMIN"]);

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { isActive: true },
    });
    await writeAuditLog(
      {
        actorUserId: admin.id,
        action: "USER_REACTIVATED",
        targetType: "User",
        targetId: userId,
      },
      tx,
    );
  });

  revalidatePath("/users");
}

export async function changeRoleAction(
  userId: string,
  formData: FormData,
): Promise<void> {
  const admin = await requireRoleForAction(["ADMIN"]);

  const newRole = formData.get("role");
  if (newRole !== "ADMIN" && newRole !== "STAFF" && newRole !== "TECHNICIAN") {
    throw new Error("Invalid role.");
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("User not found.");

  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { role: newRole } });
    await writeAuditLog(
      {
        actorUserId: admin.id,
        action: "USER_ROLE_CHANGED",
        targetType: "User",
        targetId: userId,
        metadata: { oldRole: target.role, newRole },
      },
      tx,
    );
  });

  revalidatePath("/users");
}
