"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermissionForAction } from "@/lib/auth/appAuth";
import { parseVendorFormData } from "@/lib/validation/vendor";

export type VendorActionState = { error?: string } | undefined;

// Vendor has no permission pair of its own — gated by the same
// canView/canManagePurchaseOrders keys as PurchaseOrder, by design (see
// the task brief: vendor management is reachable only via a "Manage
// vendors" link from the Purchase Orders list, not its own nav tab).

export async function createVendorAction(
  _prevState: VendorActionState,
  formData: FormData,
): Promise<VendorActionState> {
  await requirePermissionForAction("canManagePurchaseOrders");

  const parsed = parseVendorFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid vendor details." };
  }

  const vendor = await db.vendor.create({ data: parsed.data });

  revalidatePath("/vendors");
  redirect(`/vendors/${vendor.id}`);
}

export async function updateVendorAction(
  vendorId: string,
  _prevState: VendorActionState,
  formData: FormData,
): Promise<VendorActionState> {
  await requirePermissionForAction("canManagePurchaseOrders");

  const parsed = parseVendorFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid vendor details." };
  }

  const existing = await db.vendor.findUnique({ where: { id: vendorId } });
  if (!existing) {
    return { error: "Vendor not found." };
  }

  await db.vendor.update({ where: { id: vendorId }, data: parsed.data });

  revalidatePath("/vendors");
  revalidatePath(`/vendors/${vendorId}`);
  return {};
}

export async function deleteVendorAction(vendorId: string): Promise<{ error?: string }> {
  await requirePermissionForAction("canManagePurchaseOrders");

  const poCount = await db.purchaseOrder.count({ where: { vendorId } });
  if (poCount > 0) {
    return { error: "Cannot delete a vendor with existing purchase orders." };
  }

  await db.vendor.delete({ where: { id: vendorId } });

  revalidatePath("/vendors");
  redirect("/vendors");
}
