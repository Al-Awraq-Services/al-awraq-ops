"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { serviceSchema } from "@/lib/validation/service";
import { requireRoleForAction } from "@/lib/auth/guard";
import { writeAuditLog } from "@/lib/audit/log";

/**
 * Service CRUD — Admin-only, per the approved Phase C scope (unlike
 * Customer/Lead, which are Admin + Staff). Every action re-checks the role
 * server-side via requireRoleForAction, reachable directly by a forged POST
 * regardless of what the UI shows, per docs/SECURITY_BASELINE.md.
 *
 * No delete action exists — deactivate only, via `isActive`. No reactivate
 * action exists either: it was not requested for this subphase, unlike
 * Customer (which also has no reactivate) — see docs/OPEN_DECISIONS.md.
 */

export type ServiceActionState = { error?: string } | undefined;

function parseServiceForm(formData: FormData) {
  return serviceSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    description: formData.get("description"),
    placeholderPrice: formData.get("placeholderPrice"),
    priceSource: formData.get("priceSource"),
    priceSourceDate: formData.get("priceSourceDate"),
  });
}

/**
 * Only the fields this action is allowed to write, built explicitly field
 * by field from validated data — never a spread of raw form input — so an
 * extra form field (e.g. a forged `isActive` or `createdByUserId`) can never
 * reach the database. `isActive` is intentionally absent here: it is only
 * ever changed by deactivateServiceAction.
 */
function toWriteValues(parsed: {
  name: string;
  category?: string;
  description?: string;
  placeholderPrice?: number;
  priceSource?: string;
  priceSourceDate?: Date;
}) {
  return {
    name: parsed.name,
    category: parsed.category ?? null,
    description: parsed.description ?? null,
    placeholderPrice: parsed.placeholderPrice ?? null,
    priceSource: parsed.priceSource ?? null,
    priceSourceDate: parsed.priceSourceDate ?? null,
  };
}

export async function createServiceAction(
  _prevState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const actor = await requireRoleForAction(["ADMIN"]);

  const parsed = parseServiceForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.$transaction(async (tx) => {
    const service = await tx.service.create({
      data: {
        ...toWriteValues(parsed.data),
        createdByUserId: actor.id,
      },
    });
    await writeAuditLog(
      {
        actorUserId: actor.id,
        action: "SERVICE_CREATED",
        targetType: "Service",
        targetId: service.id,
        metadata: { name: service.name },
      },
      tx,
    );
  });

  revalidatePath("/services");
  redirect("/services");
}

export async function updateServiceAction(
  serviceId: string,
  _prevState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const actor = await requireRoleForAction(["ADMIN"]);

  const existing = await db.service.findUnique({ where: { id: serviceId } });
  if (!existing) {
    return { error: "Service not found." };
  }

  const parsed = parseServiceForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const nextValues = toWriteValues(parsed.data);

  // Normalize both sides to plain comparable values before diffing —
  // `existing.placeholderPrice` is a Prisma Decimal and
  // `existing.priceSourceDate` is a Date, neither of which compares
  // correctly with `!==` against the plain number/Date coming out of zod.
  const existingComparable = {
    name: existing.name,
    category: existing.category,
    description: existing.description,
    placeholderPrice:
      existing.placeholderPrice === null
        ? null
        : existing.placeholderPrice.toNumber(),
    priceSource: existing.priceSource,
    priceSourceDate:
      existing.priceSourceDate === null
        ? null
        : existing.priceSourceDate.getTime(),
  };
  const nextComparable = {
    ...nextValues,
    priceSourceDate:
      nextValues.priceSourceDate === null
        ? null
        : nextValues.priceSourceDate.getTime(),
  };

  const changedFields = (
    Object.keys(nextComparable) as (keyof typeof nextComparable)[]
  ).filter((field) => existingComparable[field] !== nextComparable[field]);

  await db.$transaction(async (tx) => {
    await tx.service.update({ where: { id: serviceId }, data: nextValues });
    if (changedFields.length > 0) {
      await writeAuditLog(
        {
          actorUserId: actor.id,
          action: "SERVICE_UPDATED",
          targetType: "Service",
          targetId: serviceId,
          metadata: { changedFields },
        },
        tx,
      );
    }
  });

  revalidatePath("/services");
  revalidatePath(`/services/${serviceId}`);
  return undefined;
}

export async function deactivateServiceAction(serviceId: string): Promise<void> {
  const actor = await requireRoleForAction(["ADMIN"]);

  const existing = await db.service.findUnique({ where: { id: serviceId } });
  if (!existing) throw new Error("Service not found.");

  await db.$transaction(async (tx) => {
    await tx.service.update({
      where: { id: serviceId },
      data: { isActive: false },
    });
    await writeAuditLog(
      {
        actorUserId: actor.id,
        action: "SERVICE_DEACTIVATED",
        targetType: "Service",
        targetId: serviceId,
        metadata: { name: existing.name },
      },
      tx,
    );
  });

  revalidatePath("/services");
  revalidatePath(`/services/${serviceId}`);
}
