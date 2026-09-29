"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { customerSchema } from "@/lib/validation/customer";
import { requireRoleForAction } from "@/lib/auth/guard";
import { writeAuditLog } from "@/lib/audit/log";

/**
 * Customer CRUD — Admin + Staff only, per the approved Phase C scope.
 * Every action re-checks the role server-side via requireRoleForAction —
 * reachable directly by a forged POST regardless of what the UI shows,
 * per docs/SECURITY_BASELINE.md. Technician has no path into any of these.
 *
 * No delete action exists here, deliberately — archive only.
 */

export type CustomerActionState = { error?: string } | undefined;

function parseCustomerForm(formData: FormData) {
  return customerSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    notes: formData.get("notes"),
  });
}

export async function createCustomerAction(
  _prevState: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const actor = await requireRoleForAction(["ADMIN", "STAFF"]);

  const parsed = parseCustomerForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email ?? null,
        address: parsed.data.address ?? null,
        notes: parsed.data.notes ?? null,
        createdByUserId: actor.id,
      },
    });
    await writeAuditLog(
      {
        actorUserId: actor.id,
        action: "CUSTOMER_CREATED",
        targetType: "Customer",
        targetId: customer.id,
        metadata: { name: customer.name },
      },
      tx,
    );
  });

  revalidatePath("/customers");
  redirect("/customers");
}

export async function updateCustomerAction(
  customerId: string,
  _prevState: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const actor = await requireRoleForAction(["ADMIN", "STAFF"]);

  const existing = await db.customer.findUnique({ where: { id: customerId } });
  if (!existing) {
    return { error: "Customer not found." };
  }

  const parsed = parseCustomerForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const nextValues = {
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email ?? null,
    address: parsed.data.address ?? null,
    notes: parsed.data.notes ?? null,
  };

  const changedFields = (
    Object.keys(nextValues) as (keyof typeof nextValues)[]
  ).filter((field) => existing[field] !== nextValues[field]);

  await db.$transaction(async (tx) => {
    await tx.customer.update({ where: { id: customerId }, data: nextValues });
    if (changedFields.length > 0) {
      await writeAuditLog(
        {
          actorUserId: actor.id,
          action: "CUSTOMER_UPDATED",
          targetType: "Customer",
          targetId: customerId,
          metadata: { changedFields },
        },
        tx,
      );
    }
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  return undefined;
}

export async function archiveCustomerAction(customerId: string): Promise<void> {
  const actor = await requireRoleForAction(["ADMIN", "STAFF"]);

  const existing = await db.customer.findUnique({ where: { id: customerId } });
  if (!existing) throw new Error("Customer not found.");

  await db.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id: customerId },
      data: { isArchived: true },
    });
    await writeAuditLog(
      {
        actorUserId: actor.id,
        action: "CUSTOMER_ARCHIVED",
        targetType: "Customer",
        targetId: customerId,
        metadata: { name: existing.name },
      },
      tx,
    );
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
}
