"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  quoteSchema,
  quoteEditSchema,
  quoteItemSchema,
} from "@/lib/validation/quote";
import { requireRoleForAction } from "@/lib/auth/guard";
import { writeAuditLog } from "@/lib/audit/log";

/**
 * Quote + QuoteItem CRUD — Phase D1. Admin + Staff only, and a Quote always
 * requires a Customer: both are documented assumptions made because the
 * sponsor had not yet answered the two blocking Phase D questions when
 * this was built (see docs/OPEN_DECISIONS.md "Phase D, D1"), not a silent
 * scope decision.
 *
 * No delete action exists for Quote itself, mirroring Lead. QuoteItem
 * lines can be added, edited, and removed freely — a line is not its own
 * aggregate root with independent history value the way Customer, Lead,
 * Service, and Quote are, so it gets simpler CRUD than they do.
 *
 * Invoicing pass (2026-09-13): a Quote reaching `APPROVED` now
 * auto-generates exactly one Invoice, and — new — a Quote can no longer be
 * edited (fields or line items) once it's Approved. `requireQuoteEditable`
 * is the single place that lock is enforced; every mutating action below
 * calls it first. See the Quote model comment in schema.prisma for why.
 */

export type QuoteActionState = { error?: string } | undefined;
export type QuoteItemActionState = { error?: string } | undefined;

async function resolveCustomerId(
  customerId: string,
): Promise<{ ok: true; customerId: string } | { ok: false; error: string }> {
  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { ok: false, error: "Selected customer not found." };
  return { ok: true, customerId: customer.id };
}

async function resolveLeadId(
  leadId: string | undefined,
): Promise<{ ok: true; leadId: string | null } | { ok: false; error: string }> {
  if (!leadId) return { ok: true, leadId: null };
  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, error: "Selected lead not found." };
  return { ok: true, leadId: lead.id };
}

async function resolveServiceId(
  serviceId: string | undefined,
): Promise<{ ok: true; serviceId: string | null } | { ok: false; error: string }> {
  if (!serviceId) return { ok: true, serviceId: null };
  const service = await db.service.findUnique({ where: { id: serviceId } });
  if (!service) return { ok: false, error: "Selected service not found." };
  return { ok: true, serviceId: service.id };
}

/**
 * Blocks any further edit to a Quote (its own fields, or any of its line
 * items) once it has reached `APPROVED` — that status means an Invoice now
 * exists for it, and an invoice is a financial record that must not
 * silently drift out of sync with a Quote someone kept editing after the
 * fact. Returns the loaded Quote row (callers need it either way) or an
 * error string.
 */
async function requireQuoteEditable(
  quoteId: string,
): Promise<
  | { ok: true; quote: NonNullable<Awaited<ReturnType<typeof db.quote.findUnique>>> }
  | { ok: false; error: string }
> {
  const quote = await db.quote.findUnique({ where: { id: quoteId } });
  if (!quote) return { ok: false, error: "Quote not found." };
  if (quote.status === "APPROVED") {
    return {
      ok: false,
      error: "This quote is approved and invoiced — it can no longer be edited.",
    };
  }
  return { ok: true, quote };
}

/**
 * Unlike Customer/Lead/Service create actions (which stay on the list
 * page), a new Quote redirects straight to its own detail page — creating
 * a Quote is step one of a two-step flow (create, then add line items),
 * and there is nothing useful to show on the list page immediately after.
 */
export async function createQuoteAction(
  _prevState: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const actor = await requireRoleForAction(["ADMIN", "STAFF"]);

  const parsed = quoteSchema.safeParse({
    customerId: formData.get("customerId"),
    leadId: formData.get("leadId"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const customerResolution = await resolveCustomerId(parsed.data.customerId);
  if (!customerResolution.ok) return { error: customerResolution.error };
  const leadResolution = await resolveLeadId(parsed.data.leadId);
  if (!leadResolution.ok) return { error: leadResolution.error };

  let newQuoteId = "";
  await db.$transaction(async (tx) => {
    const quote = await tx.quote.create({
      data: {
        customerId: customerResolution.customerId,
        leadId: leadResolution.leadId,
        notes: parsed.data.notes ?? null,
        createdByUserId: actor.id,
      },
    });
    newQuoteId = quote.id;
    await writeAuditLog(
      {
        actorUserId: actor.id,
        action: "QUOTE_CREATED",
        targetType: "Quote",
        targetId: quote.id,
        metadata: { customerId: quote.customerId },
      },
      tx,
    );
  });

  revalidatePath("/quotes");
  redirect(`/quotes/${newQuoteId}`);
}

export async function updateQuoteAction(
  quoteId: string,
  _prevState: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const actor = await requireRoleForAction(["ADMIN", "STAFF"]);

  const editable = await requireQuoteEditable(quoteId);
  if (!editable.ok) return { error: editable.error };
  const existing = editable.quote;

  const parsed = quoteEditSchema.safeParse({
    customerId: formData.get("customerId"),
    leadId: formData.get("leadId"),
    notes: formData.get("notes"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const customerResolution = await resolveCustomerId(parsed.data.customerId);
  if (!customerResolution.ok) return { error: customerResolution.error };
  const leadResolution = await resolveLeadId(parsed.data.leadId);
  if (!leadResolution.ok) return { error: leadResolution.error };

  const nextValues = {
    customerId: customerResolution.customerId,
    leadId: leadResolution.leadId,
    notes: parsed.data.notes ?? null,
  };

  const changedFields = (
    Object.keys(nextValues) as (keyof typeof nextValues)[]
  ).filter((field) => existing[field] !== nextValues[field]);
  const approving = parsed.data.status === "APPROVED" && existing.status !== "APPROVED";
  const statusChanged = existing.status !== parsed.data.status;

  // Approving requires at least one line item — invoicing nothing makes no
  // sense, and this is the point where that gets enforced, not silently
  // allowed through to generate an empty Invoice.
  if (approving) {
    const itemCount = await db.quoteItem.count({ where: { quoteId } });
    if (itemCount === 0) {
      return { error: "Add at least one line item before approving this quote." };
    }
  }

  await db.$transaction(async (tx) => {
    await tx.quote.update({
      where: { id: quoteId },
      data: { ...nextValues, status: parsed.data.status },
    });

    if (changedFields.length > 0) {
      await writeAuditLog(
        {
          actorUserId: actor.id,
          action: "QUOTE_UPDATED",
          targetType: "Quote",
          targetId: quoteId,
          metadata: { changedFields },
        },
        tx,
      );
    }

    if (statusChanged) {
      await writeAuditLog(
        {
          actorUserId: actor.id,
          action: "QUOTE_STATUS_CHANGED",
          targetType: "Quote",
          targetId: quoteId,
          metadata: { oldStatus: existing.status, newStatus: parsed.data.status },
        },
        tx,
      );
    }

    if (approving) {
      const items = await tx.quoteItem.findMany({ where: { quoteId } });
      const invoice = await tx.invoice.create({
        data: {
          quoteId,
          customerId: customerResolution.customerId,
          createdByUserId: actor.id,
          items: {
            create: items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
      });
      await writeAuditLog(
        {
          actorUserId: actor.id,
          action: "INVOICE_CREATED",
          targetType: "Invoice",
          targetId: invoice.id,
          metadata: { quoteId },
        },
        tx,
      );
    }
  });

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  if (approving) revalidatePath("/invoices");
  return undefined;
}

function parseQuoteItemForm(formData: FormData) {
  return quoteItemSchema.safeParse({
    description: formData.get("description"),
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"),
    serviceId: formData.get("serviceId"),
  });
}

export async function addQuoteItemAction(
  quoteId: string,
  _prevState: QuoteItemActionState,
  formData: FormData,
): Promise<QuoteItemActionState> {
  const actor = await requireRoleForAction(["ADMIN", "STAFF"]);

  const editable = await requireQuoteEditable(quoteId);
  if (!editable.ok) return { error: editable.error };

  const parsed = parseQuoteItemForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const serviceResolution = await resolveServiceId(parsed.data.serviceId);
  if (!serviceResolution.ok) return { error: serviceResolution.error };

  await db.$transaction(async (tx) => {
    const item = await tx.quoteItem.create({
      data: {
        quoteId,
        description: parsed.data.description,
        quantity: parsed.data.quantity,
        unitPrice: parsed.data.unitPrice,
        serviceId: serviceResolution.serviceId,
      },
    });
    await writeAuditLog(
      {
        actorUserId: actor.id,
        action: "QUOTE_ITEM_ADDED",
        targetType: "QuoteItem",
        targetId: item.id,
        metadata: { quoteId },
      },
      tx,
    );
  });

  revalidatePath(`/quotes/${quoteId}`);
  return undefined;
}

export async function updateQuoteItemAction(
  quoteId: string,
  itemId: string,
  _prevState: QuoteItemActionState,
  formData: FormData,
): Promise<QuoteItemActionState> {
  const actor = await requireRoleForAction(["ADMIN", "STAFF"]);

  const editable = await requireQuoteEditable(quoteId);
  if (!editable.ok) return { error: editable.error };

  const existing = await db.quoteItem.findUnique({ where: { id: itemId } });
  if (!existing || existing.quoteId !== quoteId) {
    return { error: "Line item not found." };
  }

  const parsed = parseQuoteItemForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const serviceResolution = await resolveServiceId(parsed.data.serviceId);
  if (!serviceResolution.ok) return { error: serviceResolution.error };

  const nextValues = {
    description: parsed.data.description,
    quantity: parsed.data.quantity,
    unitPrice: parsed.data.unitPrice,
    serviceId: serviceResolution.serviceId,
  };

  const existingComparable = {
    description: existing.description,
    quantity: existing.quantity,
    unitPrice: existing.unitPrice.toNumber(),
    serviceId: existing.serviceId,
  };

  const changedFields = (
    Object.keys(nextValues) as (keyof typeof nextValues)[]
  ).filter((field) => existingComparable[field] !== nextValues[field]);

  await db.$transaction(async (tx) => {
    await tx.quoteItem.update({ where: { id: itemId }, data: nextValues });
    if (changedFields.length > 0) {
      await writeAuditLog(
        {
          actorUserId: actor.id,
          action: "QUOTE_ITEM_UPDATED",
          targetType: "QuoteItem",
          targetId: itemId,
          metadata: { quoteId, changedFields },
        },
        tx,
      );
    }
  });

  revalidatePath(`/quotes/${quoteId}`);
  return undefined;
}

export async function removeQuoteItemAction(
  quoteId: string,
  itemId: string,
): Promise<void> {
  const actor = await requireRoleForAction(["ADMIN", "STAFF"]);

  const editable = await requireQuoteEditable(quoteId);
  if (!editable.ok) throw new Error(editable.error);

  const existing = await db.quoteItem.findUnique({ where: { id: itemId } });
  if (!existing || existing.quoteId !== quoteId) {
    throw new Error("Line item not found.");
  }

  await db.$transaction(async (tx) => {
    await tx.quoteItem.delete({ where: { id: itemId } });
    await writeAuditLog(
      {
        actorUserId: actor.id,
        action: "QUOTE_ITEM_REMOVED",
        targetType: "QuoteItem",
        targetId: itemId,
        metadata: { quoteId },
      },
      tx,
    );
  });

  revalidatePath(`/quotes/${quoteId}`);
}
