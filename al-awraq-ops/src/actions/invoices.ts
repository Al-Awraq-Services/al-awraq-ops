"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requirePermissionForAction } from "@/lib/auth/appAuth";
import { parseInvoiceFormData, type InvoiceFormInput } from "@/lib/validation/invoice";

export type InvoiceActionState = { error?: string } | undefined;

/**
 * Finds an existing Customer by exact (case-insensitive) name, updating its
 * address/contact if the submitted values differ and aren't blank, or
 * creates a new Customer. Runs inside the caller's transaction so the
 * resolved customer and the invoice/counter write commit atomically.
 */
async function resolveCustomer(
  tx: Prisma.TransactionClient,
  data: Pick<InvoiceFormInput, "customerName" | "customerAddress" | "customerContact">,
) {
  const existing = await tx.customer.findFirst({
    where: { name: { equals: data.customerName, mode: "insensitive" } },
  });

  if (existing) {
    const updates: { address?: string; contact?: string } = {};
    if (data.customerAddress && data.customerAddress !== existing.address) {
      updates.address = data.customerAddress;
    }
    if (data.customerContact && data.customerContact !== existing.contact) {
      updates.contact = data.customerContact;
    }
    if (Object.keys(updates).length === 0) {
      return existing;
    }
    return tx.customer.update({ where: { id: existing.id }, data: updates });
  }

  return tx.customer.create({
    data: {
      name: data.customerName,
      address: data.customerAddress ?? null,
      contact: data.customerContact ?? null,
    },
  });
}

function itemsCreateInput(items: InvoiceFormInput["items"]) {
  return items.map((item, index) => ({
    description: item.description,
    quantity: item.quantity,
    unit: item.unit ?? null,
    unitPrice: item.unitPrice,
    retentionAmount: item.retentionAmount ?? null,
    sortOrder: index,
  }));
}

/** True if a Prisma error is the unique-constraint violation on Invoice.invoiceNumber. */
function isDuplicateInvoiceNumber(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    Array.isArray((err.meta as { target?: unknown })?.target) &&
    ((err.meta as { target: unknown[] }).target as unknown[]).includes("invoiceNumber")
  );
}

export async function createInvoiceAction(
  _prevState: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  await requirePermissionForAction("canManageInvoices");

  const parsed = parseInvoiceFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid invoice details." };
  }
  const data = parsed.data;

  let newInvoiceId: string;
  try {
    newInvoiceId = await db.$transaction(async (tx) => {
      const customer = await resolveCustomer(tx, data);

      // The counter always advances, regardless of what invoiceNumber
      // string was actually submitted — it's just a convenience default
      // shown on the "new invoice" page, not an enforced sequence.
      await tx.businessProfile.update({
        where: { id: "singleton" },
        data: { nextInvoiceNumber: { increment: 1 } },
      });

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: data.invoiceNumber,
          invoiceDate: data.invoiceDate,
          dueDate: data.dueDate ?? null,
          poNumber: data.poNumber ?? null,
          paymentMethod: data.paymentMethod ?? null,
          salesperson: data.salesperson ?? null,
          customerId: customer.id,
          billingName: customer.name,
          billingAddress: customer.address ?? null,
          billingContact: customer.contact ?? null,
          notes: data.notes ?? "This is a VAT invoice.",
          taxRatePercent: data.taxRatePercent,
          discountAmount: data.discountAmount ?? null,
          shipmentAmount: data.shipmentAmount ?? null,
          stampDutyAmount: data.stampDutyAmount ?? null,
          items: { create: itemsCreateInput(data.items) },
        },
      });

      return invoice.id;
    });
  } catch (err) {
    if (isDuplicateInvoiceNumber(err)) {
      return { error: "That invoice number is already in use." };
    }
    throw err;
  }

  revalidatePath("/invoices");
  redirect(`/invoices/${newInvoiceId}`);
}

export async function updateInvoiceAction(
  invoiceId: string,
  _prevState: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  await requirePermissionForAction("canManageInvoices");

  const parsed = parseInvoiceFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid invoice details." };
  }
  const data = parsed.data;

  const existingInvoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true },
  });
  if (!existingInvoice) {
    return { error: "Invoice not found." };
  }

  // Only re-resolve/re-snapshot the customer if the name field was
  // actually edited — editing an invoice's other fields should never
  // silently rewrite its billing snapshot.
  const nameChanged =
    data.customerName.trim().toLowerCase() !== existingInvoice.customer.name.trim().toLowerCase();

  try {
    await db.$transaction(async (tx) => {
      let billingName = existingInvoice.billingName;
      let billingAddress = existingInvoice.billingAddress;
      let billingContact = existingInvoice.billingContact;
      let customerId = existingInvoice.customerId;

      if (nameChanged) {
        const customer = await resolveCustomer(tx, data);
        customerId = customer.id;
        billingName = customer.name;
        billingAddress = customer.address ?? null;
        billingContact = customer.contact ?? null;
      }

      await tx.invoiceItem.deleteMany({ where: { invoiceId } });

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          invoiceNumber: data.invoiceNumber,
          invoiceDate: data.invoiceDate,
          dueDate: data.dueDate ?? null,
          poNumber: data.poNumber ?? null,
          paymentMethod: data.paymentMethod ?? null,
          salesperson: data.salesperson ?? null,
          customerId,
          billingName,
          billingAddress,
          billingContact,
          notes: data.notes ?? "This is a VAT invoice.",
          taxRatePercent: data.taxRatePercent,
          discountAmount: data.discountAmount ?? null,
          shipmentAmount: data.shipmentAmount ?? null,
          stampDutyAmount: data.stampDutyAmount ?? null,
          items: { create: itemsCreateInput(data.items) },
        },
      });
    });
  } catch (err) {
    if (isDuplicateInvoiceNumber(err)) {
      return { error: "That invoice number is already in use." };
    }
    throw err;
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}`);
}

/**
 * Sets Invoice.amountPaid directly — used for both "record partial
 * payment" and "mark paid in full" (the caller passes the full grandTotal
 * for the latter). Bound to a specific invoiceId and used as a native
 * `<form action={...}>` target, so it takes FormData like the other
 * actions rather than a bare number — there's no client-side JS needed to
 * call it this way, consistent with the rest of this single-user app's
 * plain-form style.
 */
export async function recordPaymentAction(
  invoiceId: string,
  formData: FormData,
): Promise<InvoiceActionState> {
  await requirePermissionForAction("canManageInvoices");

  const raw = formData.get("amountPaid");
  const amountPaid = Number(raw);
  if (raw === null || raw === "" || !Number.isFinite(amountPaid) || amountPaid < 0) {
    return { error: "Enter a valid payment amount (0 or more)." };
  }

  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) {
    return { error: "Invoice not found." };
  }

  await db.invoice.update({ where: { id: invoiceId }, data: { amountPaid } });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return {};
}

/**
 * Permanent delete — no archive step, deliberate for this single-user
 * tool (used to correct mistakes). InvoiceItem rows cascade per schema.
 */
export async function deleteInvoiceAction(invoiceId: string): Promise<void> {
  await requirePermissionForAction("canManageInvoices");

  await db.invoice.delete({ where: { id: invoiceId } });

  revalidatePath("/invoices");
  redirect("/invoices");
}
