"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { leadSchema, leadEditSchema } from "@/lib/validation/lead";
import { requireRoleForAction } from "@/lib/auth/guard";
import { writeAuditLog } from "@/lib/audit/log";

/**
 * Lead CRUD — Admin + Staff only, per the approved Phase C scope. No
 * delete action exists. No conversion-to-Quote/Job action exists yet
 * (Phase D). Status has no lock — any of the three values may be set at
 * any time, per the approved decision.
 */

export type LeadActionState = { error?: string } | undefined;

/**
 * Shared by create and update: if a customerId was submitted, it must
 * refer to a real Customer row. Zod alone can't check this (it's a
 * database lookup, not a shape check), so it's done here, once, before
 * either write path proceeds.
 */
async function resolveCustomerId(
  customerId: string | undefined,
): Promise<{ ok: true; customerId: string | null } | { ok: false; error: string }> {
  if (!customerId) return { ok: true, customerId: null };
  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { ok: false, error: "Selected customer not found." };
  return { ok: true, customerId: customer.id };
}

export async function createLeadAction(
  _prevState: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const actor = await requireRoleForAction(["ADMIN", "STAFF"]);

  const parsed = leadSchema.safeParse({
    source: formData.get("source"),
    description: formData.get("description"),
    customerId: formData.get("customerId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const customerResolution = await resolveCustomerId(parsed.data.customerId);
  if (!customerResolution.ok) return { error: customerResolution.error };

  await db.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        source: parsed.data.source,
        description: parsed.data.description,
        customerId: customerResolution.customerId,
        createdByUserId: actor.id,
      },
    });
    await writeAuditLog(
      {
        actorUserId: actor.id,
        action: "LEAD_CREATED",
        targetType: "Lead",
        targetId: lead.id,
        metadata: { source: lead.source },
      },
      tx,
    );
  });

  revalidatePath("/leads");
  redirect("/leads");
}

export async function updateLeadAction(
  leadId: string,
  _prevState: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const actor = await requireRoleForAction(["ADMIN", "STAFF"]);

  const existing = await db.lead.findUnique({ where: { id: leadId } });
  if (!existing) {
    return { error: "Lead not found." };
  }

  const parsed = leadEditSchema.safeParse({
    source: formData.get("source"),
    description: formData.get("description"),
    customerId: formData.get("customerId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const customerResolution = await resolveCustomerId(parsed.data.customerId);
  if (!customerResolution.ok) return { error: customerResolution.error };

  const nextValues = {
    source: parsed.data.source,
    description: parsed.data.description,
    customerId: customerResolution.customerId,
  };

  const changedFields = (
    Object.keys(nextValues) as (keyof typeof nextValues)[]
  ).filter((field) => existing[field] !== nextValues[field]);
  const statusChanged = existing.status !== parsed.data.status;

  await db.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: { ...nextValues, status: parsed.data.status },
    });

    if (changedFields.length > 0) {
      await writeAuditLog(
        {
          actorUserId: actor.id,
          action: "LEAD_UPDATED",
          targetType: "Lead",
          targetId: leadId,
          metadata: { changedFields },
        },
        tx,
      );
    }

    if (statusChanged) {
      await writeAuditLog(
        {
          actorUserId: actor.id,
          action: "LEAD_STATUS_CHANGED",
          targetType: "Lead",
          targetId: leadId,
          metadata: { oldStatus: existing.status, newStatus: parsed.data.status },
        },
        tx,
      );
    }
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return undefined;
}
