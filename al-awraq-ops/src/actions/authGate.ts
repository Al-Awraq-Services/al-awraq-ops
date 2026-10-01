"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  hashPassword,
  verifyPasswordAgainstHash,
  createAppSessionCookie,
  destroyAppSessionCookie,
  requireUserForAction,
} from "@/lib/auth/appAuth";

const passwordSchema = z.string().min(8, "Password must be at least 8 characters.");

export type AuthActionState = { error?: string } | undefined;

/**
 * Plain username + password login against `User`. Accounts are never
 * self-service — they only come from prisma/seed.ts (the main account and
 * the first private sub-account) or the Users screen (main-account-only,
 * src/actions/users.ts) — so there is no "first run, set a password"
 * branch here the way the single-password version had.
 */
export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) {
    return { error: "Enter a username and password." };
  }

  const user = await db.user.findUnique({ where: { username } });
  if (!user) {
    return { error: "Incorrect username or password." };
  }

  const ok = await verifyPasswordAgainstHash(password, user.passwordHash);
  if (!ok) {
    return { error: "Incorrect username or password." };
  }

  await createAppSessionCookie(user.id);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await destroyAppSessionCookie();
  redirect("/login");
}

/**
 * Settings-page "change my password" — acts on whichever account is
 * currently logged in (re-derived from the session, never trusted from
 * the client), requires the current password. Every account, including
 * non-main ones, can change their own password this way; only the main
 * account can reset *someone else's* password, via src/actions/users.ts.
 */
export async function changeMyPasswordAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const user = await requireUserForAction();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = formData.get("newPassword");
  const confirmNewPassword = formData.get("confirmNewPassword");

  const parsed = passwordSchema.safeParse(newPassword);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }
  if (newPassword !== confirmNewPassword) {
    return { error: "New passwords do not match." };
  }

  const ok = await verifyPasswordAgainstHash(currentPassword, user.passwordHash);
  if (!ok) {
    return { error: "Current password is incorrect." };
  }

  const passwordHash = await hashPassword(parsed.data);
  await db.user.update({ where: { id: user.id }, data: { passwordHash } });
  return {};
}
