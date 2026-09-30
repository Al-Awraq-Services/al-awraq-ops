"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  hashPassword,
  verifyPasswordAgainstHash,
  createAppSessionCookie,
  destroyAppSessionCookie,
} from "@/lib/auth/appAuth";

const passwordSchema = z.string().min(8, "Password must be at least 8 characters.");

export type AuthActionState = { error?: string } | undefined;

/** First-run only: sets the one app password. Refuses if one already exists. */
export async function setInitialPasswordAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const profile = await db.businessProfile.findUnique({ where: { id: "singleton" } });
  if (profile?.passwordHash) {
    return { error: "A password is already set. Use the login form instead." };
  }

  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const passwordHash = await hashPassword(parsed.data);
  await db.businessProfile.upsert({
    where: { id: "singleton" },
    update: { passwordHash },
    create: { id: "singleton", passwordHash },
  });

  await createAppSessionCookie();
  redirect("/");
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const profile = await db.businessProfile.findUnique({ where: { id: "singleton" } });
  if (!profile?.passwordHash) {
    return { error: "No password has been set yet." };
  }

  const password = String(formData.get("password") ?? "");
  const ok = await verifyPasswordAgainstHash(password, profile.passwordHash);
  if (!ok) {
    return { error: "Incorrect password." };
  }

  await createAppSessionCookie();
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await destroyAppSessionCookie();
  redirect("/login");
}

/**
 * Settings-page password change — requires the current password, unlike
 * setInitialPasswordAction (which only runs once, before any password
 * exists). Shared here since it's the same BusinessProfile.passwordHash
 * field; src/actions/settings.ts (Agent C) calls this rather than
 * duplicating the hashing/verification logic.
 */
export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
): Promise<{ error?: string }> {
  const parsed = passwordSchema.safeParse(newPassword);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }

  const profile = await db.businessProfile.findUnique({ where: { id: "singleton" } });
  if (!profile?.passwordHash) {
    return { error: "No password is set yet." };
  }

  const ok = await verifyPasswordAgainstHash(currentPassword, profile.passwordHash);
  if (!ok) {
    return { error: "Current password is incorrect." };
  }

  const passwordHash = await hashPassword(parsed.data);
  await db.businessProfile.update({ where: { id: "singleton" }, data: { passwordHash } });
  return {};
}
