"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermissionForAction } from "@/lib/auth/appAuth";
import { parseCustomerFormData } from "@/lib/validation/customer";

export type CustomerActionState = { error?: string } | undefined;

export async function createCustomerAction(
  _prevState: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  await requirePermissionForAction("canManageCustomers");

  const parsed = parseCustomerFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid customer details." };
  }

  const customer = await db.customer.create({ data: parsed.data });

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomerAction(
  customerId: string,
  _prevState: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  await requirePermissionForAction("canManageCustomers");

  const parsed = parseCustomerFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid customer details." };
  }

  const existing = await db.customer.findUnique({ where: { id: customerId } });
  if (!existing) {
    return { error: "Customer not found." };
  }

  await db.customer.update({ where: { id: customerId }, data: parsed.data });

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  return {};
}

export async function deleteCustomerAction(
  customerId: string,
): Promise<{ error?: string }> {
  await requirePermissionForAction("canManageCustomers");

  const [invoiceCount, inquiryCount] = await Promise.all([
    db.invoice.count({ where: { customerId } }),
    db.inquiry.count({ where: { customerId } }),
  ]);
  if (invoiceCount > 0 || inquiryCount > 0) {
    return { error: "Cannot delete a customer with existing invoices or inquiries." };
  }

  await db.customer.delete({ where: { id: customerId } });

  revalidatePath("/customers");
  redirect("/customers");
}
