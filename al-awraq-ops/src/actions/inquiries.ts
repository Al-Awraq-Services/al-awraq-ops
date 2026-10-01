"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requirePermissionForAction } from "@/lib/auth/appAuth";
import { parseInquiryFormData, type InquiryFormInput } from "@/lib/validation/inquiry";

export type InquiryActionState = { error?: string } | undefined;

/**
 * Finds an existing Customer by exact (case-insensitive) name, updating its
 * address/contact/company/TRN/contact-person if the submitted values differ
 * and aren't blank, or creates a new Customer. Runs inside the caller's
 * transaction so the resolved customer and the inquiry/counter write commit
 * atomically.
 *
 * Unlike the Invoice (B2C) counterpart, a customer resolved here is always
 * stamped `type: "BUSINESS"` — the Inquiry workflow is exclusively for
 * business buyers, and the three extra fields (companyName/businessTrn/
 * contactPerson) are meaningful only for that type.
 */
async function resolveCustomer(
  tx: Prisma.TransactionClient,
  data: Pick<
    InquiryFormInput,
    | "customerName"
    | "customerAddress"
    | "customerContact"
    | "customerCompanyName"
    | "customerBusinessTrn"
    | "customerContactPerson"
  >,
) {
  const existing = await tx.customer.findFirst({
    where: { name: { equals: data.customerName, mode: "insensitive" } },
  });

  if (existing) {
    const updates: {
      address?: string;
      contact?: string;
      type?: "BUSINESS";
      companyName?: string;
      businessTrn?: string;
      contactPerson?: string;
    } = {};
    if (data.customerAddress && data.customerAddress !== existing.address) {
      updates.address = data.customerAddress;
    }
    if (data.customerContact && data.customerContact !== existing.contact) {
      updates.contact = data.customerContact;
    }
    if (data.customerCompanyName && data.customerCompanyName !== existing.companyName) {
      updates.companyName = data.customerCompanyName;
    }
    if (data.customerBusinessTrn && data.customerBusinessTrn !== existing.businessTrn) {
      updates.businessTrn = data.customerBusinessTrn;
    }
    if (data.customerContactPerson && data.customerContactPerson !== existing.contactPerson) {
      updates.contactPerson = data.customerContactPerson;
    }
    if (existing.type !== "BUSINESS") {
      updates.type = "BUSINESS";
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
      type: "BUSINESS",
      companyName: data.customerCompanyName ?? null,
      businessTrn: data.customerBusinessTrn ?? null,
      contactPerson: data.customerContactPerson ?? null,
    },
  });
}

function itemsCreateInput(items: InquiryFormInput["items"]) {
  return items.map((item, index) => ({
    description: item.description,
    quantity: item.quantity,
    unit: item.unit ?? null,
    unitPrice: item.unitPrice,
    retentionAmount: item.retentionAmount ?? null,
    sortOrder: index,
  }));
}

/** True if a Prisma error is the unique-constraint violation on Inquiry.inquiryNumber. */
function isDuplicateInquiryNumber(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    Array.isArray((err.meta as { target?: unknown })?.target) &&
    ((err.meta as { target: unknown[] }).target as unknown[]).includes("inquiryNumber")
  );
}

export async function createInquiryAction(
  _prevState: InquiryActionState,
  formData: FormData,
): Promise<InquiryActionState> {
  await requirePermissionForAction("canManageInquiries");

  const parsed = parseInquiryFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid inquiry details." };
  }
  const data = parsed.data;

  let newInquiryId: string;
  try {
    newInquiryId = await db.$transaction(async (tx) => {
      const customer = await resolveCustomer(tx, data);

      // The counter always advances, regardless of what inquiryNumber
      // string was actually submitted — it's just a convenience default
      // shown on the "new inquiry" page, not an enforced sequence.
      await tx.businessProfile.update({
        where: { id: "singleton" },
        data: { nextInquiryNumber: { increment: 1 } },
      });

      const inquiry = await tx.inquiry.create({
        data: {
          inquiryNumber: data.inquiryNumber,
          inquiryDate: data.inquiryDate,
          dueDate: data.dueDate ?? null,
          poNumber: data.poNumber ?? null,
          paymentMethod: data.paymentMethod ?? null,
          salesperson: data.salesperson ?? null,
          customerId: customer.id,
          billingName: customer.name,
          billingAddress: customer.address ?? null,
          billingContact: customer.contact ?? null,
          billingCompanyName: customer.companyName ?? null,
          billingBusinessTrn: customer.businessTrn ?? null,
          notes: data.notes ?? "This is a VAT invoice.",
          taxRatePercent: data.taxRatePercent,
          discountAmount: data.discountAmount ?? null,
          shipmentAmount: data.shipmentAmount ?? null,
          stampDutyAmount: data.stampDutyAmount ?? null,
          items: { create: itemsCreateInput(data.items) },
        },
      });

      return inquiry.id;
    });
  } catch (err) {
    if (isDuplicateInquiryNumber(err)) {
      return { error: "That inquiry number is already in use." };
    }
    throw err;
  }

  revalidatePath("/inquiries");
  redirect(`/inquiries/${newInquiryId}`);
}

export async function updateInquiryAction(
  inquiryId: string,
  _prevState: InquiryActionState,
  formData: FormData,
): Promise<InquiryActionState> {
  await requirePermissionForAction("canManageInquiries");

  const parsed = parseInquiryFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid inquiry details." };
  }
  const data = parsed.data;

  const existingInquiry = await db.inquiry.findUnique({
    where: { id: inquiryId },
    include: { customer: true },
  });
  if (!existingInquiry) {
    return { error: "Inquiry not found." };
  }

  // Only re-resolve/re-snapshot the customer if the name field was
  // actually edited — editing an inquiry's other fields should never
  // silently rewrite its billing snapshot.
  const nameChanged =
    data.customerName.trim().toLowerCase() !== existingInquiry.customer.name.trim().toLowerCase();

  try {
    await db.$transaction(async (tx) => {
      let billingName = existingInquiry.billingName;
      let billingAddress = existingInquiry.billingAddress;
      let billingContact = existingInquiry.billingContact;
      let billingCompanyName = existingInquiry.billingCompanyName;
      let billingBusinessTrn = existingInquiry.billingBusinessTrn;
      let customerId = existingInquiry.customerId;

      if (nameChanged) {
        const customer = await resolveCustomer(tx, data);
        customerId = customer.id;
        billingName = customer.name;
        billingAddress = customer.address ?? null;
        billingContact = customer.contact ?? null;
        billingCompanyName = customer.companyName ?? null;
        billingBusinessTrn = customer.businessTrn ?? null;
      }

      await tx.inquiryItem.deleteMany({ where: { inquiryId } });

      await tx.inquiry.update({
        where: { id: inquiryId },
        data: {
          inquiryNumber: data.inquiryNumber,
          inquiryDate: data.inquiryDate,
          dueDate: data.dueDate ?? null,
          poNumber: data.poNumber ?? null,
          paymentMethod: data.paymentMethod ?? null,
          salesperson: data.salesperson ?? null,
          customerId,
          billingName,
          billingAddress,
          billingContact,
          billingCompanyName,
          billingBusinessTrn,
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
    if (isDuplicateInquiryNumber(err)) {
      return { error: "That inquiry number is already in use." };
    }
    throw err;
  }

  revalidatePath("/inquiries");
  revalidatePath(`/inquiries/${inquiryId}`);
  redirect(`/inquiries/${inquiryId}`);
}

/**
 * Sets Inquiry.amountPaid directly — used for both "record partial
 * payment" and "mark paid in full" (the caller passes the full grandTotal
 * for the latter). Bound to a specific inquiryId and used as a native
 * `<form action={...}>` target, so it takes FormData like the other
 * actions rather than a bare number — there's no client-side JS needed to
 * call it this way, consistent with the rest of this single-user app's
 * plain-form style.
 */
export async function recordInquiryPaymentAction(
  inquiryId: string,
  formData: FormData,
): Promise<InquiryActionState> {
  await requirePermissionForAction("canManageInquiries");

  const raw = formData.get("amountPaid");
  const amountPaid = Number(raw);
  if (raw === null || raw === "" || !Number.isFinite(amountPaid) || amountPaid < 0) {
    return { error: "Enter a valid payment amount (0 or more)." };
  }

  const inquiry = await db.inquiry.findUnique({ where: { id: inquiryId } });
  if (!inquiry) {
    return { error: "Inquiry not found." };
  }

  await db.inquiry.update({ where: { id: inquiryId }, data: { amountPaid } });

  revalidatePath("/inquiries");
  revalidatePath(`/inquiries/${inquiryId}`);
  return {};
}

/**
 * Permanent delete — no archive step, deliberate for this single-user
 * tool (used to correct mistakes). InquiryItem rows cascade per schema.
 */
export async function deleteInquiryAction(inquiryId: string): Promise<void> {
  await requirePermissionForAction("canManageInquiries");

  await db.inquiry.delete({ where: { id: inquiryId } });

  revalidatePath("/inquiries");
  redirect("/inquiries");
}
