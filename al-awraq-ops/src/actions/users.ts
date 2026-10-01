"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireMainAccountForAction, hashPassword } from "@/lib/auth/appAuth";
import {
  parseCreateUserFormData,
  parseUpdatePermissionsFormData,
  parseResetPasswordFormData,
} from "@/lib/validation/user";

export type UserActionState = { error?: string; success?: boolean } | undefined;

/** True if a Prisma error is the unique-constraint violation on User.username. */
function isDuplicateUsername(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    Array.isArray((err.meta as { target?: unknown })?.target) &&
    ((err.meta as { target: unknown[] }).target as unknown[]).includes("username")
  );
}

/**
 * All four actions here are main-account-only (requireMainAccountForAction)
 * — creating accounts and setting their permissions is, like the Dashboard,
 * one of the things this app treats as a hard admin-only capability rather
 * than something delegable through the permission flags themselves (you
 * can't grant someone "canManageUsers" — there is no such flag).
 */
export async function createUserAction(
  _prevState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  await requireMainAccountForAction();

  const parsed = parseCreateUserFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid account details." };
  }
  const data = parsed.data;

  let newId: string;
  try {
    const user = await db.user.create({
      data: {
        name: data.name,
        username: data.username,
        passwordHash: await hashPassword(data.password),
        isMainAccount: false,
        canViewInvoices: data.canViewInvoices,
        canManageInvoices: data.canManageInvoices,
        canViewCustomers: data.canViewCustomers,
        canManageCustomers: data.canManageCustomers,
        canViewInquiries: data.canViewInquiries,
        canManageInquiries: data.canManageInquiries,
        canViewPurchaseOrders: data.canViewPurchaseOrders,
        canManagePurchaseOrders: data.canManagePurchaseOrders,
      },
    });
    newId = user.id;
  } catch (err) {
    if (isDuplicateUsername(err)) {
      return { error: "That username is already taken." };
    }
    throw err;
  }

  revalidatePath("/users");
  redirect(`/users/${newId}`);
}

export async function updateUserPermissionsAction(
  userId: string,
  _prevState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  await requireMainAccountForAction();

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) {
    return { error: "Account not found." };
  }
  if (target.isMainAccount) {
    return { error: "The main account's access can't be changed — it always has full access." };
  }

  const parsed = parseUpdatePermissionsFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid permissions." };
  }

  await db.user.update({ where: { id: userId }, data: parsed.data });

  revalidatePath("/users");
  revalidatePath(`/users/${userId}`);
  return { success: true };
}

export async function resetUserPasswordAction(
  userId: string,
  _prevState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  await requireMainAccountForAction();

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) {
    return { error: "Account not found." };
  }

  const parsed = parseResetPasswordFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }

  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });

  return { success: true };
}

/**
 * Blocked for the main account (there must always be exactly one) and for
 * deleting the account currently performing the delete (can't lock
 * yourself out — you'd need another main-account session to undo it).
 */
export async function deleteUserAction(userId: string): Promise<UserActionState> {
  const actingUser = await requireMainAccountForAction();

  if (userId === actingUser.id) {
    return { error: "You can't delete the account you're currently signed in as." };
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) {
    return { error: "Account not found." };
  }
  if (target.isMainAccount) {
    return { error: "The main account can't be deleted." };
  }

  await db.user.delete({ where: { id: userId } });

  revalidatePath("/users");
  redirect("/users");
}
