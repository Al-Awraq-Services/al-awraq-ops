"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requirePermissionForAction } from "@/lib/auth/appAuth";
import {
  parsePurchaseOrderFormData,
  type PurchaseOrderFormInput,
} from "@/lib/validation/purchaseOrder";

export type PurchaseOrderActionState = { error?: string } | undefined;

/**
 * Finds an existing Vendor by exact (case-insensitive) name, updating its
 * address/contact if the submitted values differ and aren't blank, or
 * creates a new Vendor. Runs inside the caller's transaction so the
 * resolved vendor and the purchase order/counter write commit atomically.
 * Mirrors resolveCustomer in src/actions/invoices.ts.
 */
async function resolveVendor(
  tx: Prisma.TransactionClient,
  data: Pick<PurchaseOrderFormInput, "vendorName" | "vendorAddress" | "vendorContact">,
) {
  const existing = await tx.vendor.findFirst({
    where: { name: { equals: data.vendorName, mode: "insensitive" } },
  });

  if (existing) {
    const updates: { address?: string; contact?: string } = {};
    if (data.vendorAddress && data.vendorAddress !== existing.address) {
      updates.address = data.vendorAddress;
    }
    if (data.vendorContact && data.vendorContact !== existing.contact) {
      updates.contact = data.vendorContact;
    }
    if (Object.keys(updates).length === 0) {
      return existing;
    }
    return tx.vendor.update({ where: { id: existing.id }, data: updates });
  }

  return tx.vendor.create({
    data: {
      name: data.vendorName,
      address: data.vendorAddress ?? null,
      contact: data.vendorContact ?? null,
    },
  });
}

function itemsCreateInput(items: PurchaseOrderFormInput["items"]) {
  return items.map((item, index) => ({
    description: item.description,
    quantity: item.quantity,
    unit: item.unit ?? null,
    unitPrice: item.unitPrice,
    sortOrder: index,
  }));
}

/** True if a Prisma error is the unique-constraint violation on PurchaseOrder.poNumber. */
function isDuplicatePoNumber(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    Array.isArray((err.meta as { target?: unknown })?.target) &&
    ((err.meta as { target: unknown[] }).target as unknown[]).includes("poNumber")
  );
}

export async function createPurchaseOrderAction(
  _prevState: PurchaseOrderActionState,
  formData: FormData,
): Promise<PurchaseOrderActionState> {
  await requirePermissionForAction("canManagePurchaseOrders");

  const parsed = parsePurchaseOrderFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid purchase order details." };
  }
  const data = parsed.data;

  let newPoId: string;
  try {
    newPoId = await db.$transaction(async (tx) => {
      const vendor = await resolveVendor(tx, data);

      // The counter always advances, regardless of what poNumber string
      // was actually submitted — it's just a convenience default shown
      // on the "new purchase order" page, not an enforced sequence.
      await tx.businessProfile.update({
        where: { id: "singleton" },
        data: { nextPoNumber: { increment: 1 } },
      });

      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          poNumber: data.poNumber,
          orderDate: data.orderDate,
          expectedDate: data.expectedDate ?? null,
          vendorId: vendor.id,
          billingVendorName: vendor.name,
          billingVendorAddress: vendor.address ?? null,
          billingVendorContact: vendor.contact ?? null,
          notes: data.notes ?? null,
          taxRatePercent: data.taxRatePercent,
          discountAmount: data.discountAmount ?? null,
          shipmentAmount: data.shipmentAmount ?? null,
          items: { create: itemsCreateInput(data.items) },
        },
      });

      return purchaseOrder.id;
    });
  } catch (err) {
    if (isDuplicatePoNumber(err)) {
      return { error: "That PO number is already in use." };
    }
    throw err;
  }

  revalidatePath("/purchase-orders");
  redirect(`/purchase-orders/${newPoId}`);
}

export async function updatePurchaseOrderAction(
  poId: string,
  _prevState: PurchaseOrderActionState,
  formData: FormData,
): Promise<PurchaseOrderActionState> {
  await requirePermissionForAction("canManagePurchaseOrders");

  const parsed = parsePurchaseOrderFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid purchase order details." };
  }
  const data = parsed.data;

  const existingPo = await db.purchaseOrder.findUnique({
    where: { id: poId },
    include: { vendor: true },
  });
  if (!existingPo) {
    return { error: "Purchase order not found." };
  }

  // Only re-resolve/re-snapshot the vendor if the name field was actually
  // edited — editing a PO's other fields should never silently rewrite
  // its billing snapshot.
  const nameChanged =
    data.vendorName.trim().toLowerCase() !== existingPo.vendor.name.trim().toLowerCase();

  try {
    await db.$transaction(async (tx) => {
      let billingVendorName = existingPo.billingVendorName;
      let billingVendorAddress = existingPo.billingVendorAddress;
      let billingVendorContact = existingPo.billingVendorContact;
      let vendorId = existingPo.vendorId;

      if (nameChanged) {
        const vendor = await resolveVendor(tx, data);
        vendorId = vendor.id;
        billingVendorName = vendor.name;
        billingVendorAddress = vendor.address ?? null;
        billingVendorContact = vendor.contact ?? null;
      }

      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: poId } });

      await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          poNumber: data.poNumber,
          orderDate: data.orderDate,
          expectedDate: data.expectedDate ?? null,
          vendorId,
          billingVendorName,
          billingVendorAddress,
          billingVendorContact,
          notes: data.notes ?? null,
          taxRatePercent: data.taxRatePercent,
          discountAmount: data.discountAmount ?? null,
          shipmentAmount: data.shipmentAmount ?? null,
          items: { create: itemsCreateInput(data.items) },
        },
      });
    });
  } catch (err) {
    if (isDuplicatePoNumber(err)) {
      return { error: "That PO number is already in use." };
    }
    throw err;
  }

  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${poId}`);
  redirect(`/purchase-orders/${poId}`);
}

/**
 * Sets PurchaseOrder.amountPaid directly — used for both "record partial
 * payment" and "mark paid in full" (the caller passes the full grandTotal
 * for the latter). Bound to a specific poId and used as a native
 * `<form action={...}>` target, so it takes FormData like the other
 * actions rather than a bare number. Mirrors recordPaymentAction in
 * src/actions/invoices.ts.
 */
export async function recordPurchaseOrderPaymentAction(
  poId: string,
  formData: FormData,
): Promise<PurchaseOrderActionState> {
  await requirePermissionForAction("canManagePurchaseOrders");

  const raw = formData.get("amountPaid");
  const amountPaid = Number(raw);
  if (raw === null || raw === "" || !Number.isFinite(amountPaid) || amountPaid < 0) {
    return { error: "Enter a valid payment amount (0 or more)." };
  }

  const purchaseOrder = await db.purchaseOrder.findUnique({ where: { id: poId } });
  if (!purchaseOrder) {
    return { error: "Purchase order not found." };
  }

  await db.purchaseOrder.update({ where: { id: poId }, data: { amountPaid } });

  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${poId}`);
  return {};
}

/**
 * Permanent delete — no archive step, deliberate for this single-user tool
 * (used to correct mistakes). PurchaseOrderItem rows cascade per schema.
 */
export async function deletePurchaseOrderAction(poId: string): Promise<void> {
  await requirePermissionForAction("canManagePurchaseOrders");

  await db.purchaseOrder.delete({ where: { id: poId } });

  revalidatePath("/purchase-orders");
  redirect("/purchase-orders");
}
