"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAppSessionForAction } from "@/lib/auth/appAuth";
import { changePasswordAction } from "@/actions/authGate";
import { parseBusinessProfileFormData } from "@/lib/validation/settings";

export type SettingsActionState = { error?: string; success?: boolean } | undefined;

export async function updateBusinessProfileAction(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAppSessionForAction();

  const parsed = parseBusinessProfileFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid business details." };
  }

  const { data } = parsed;
  await db.businessProfile.update({
    where: { id: "singleton" },
    data: {
      legalName: data.legalName,
      trn: data.trn ?? null,
      address: data.address ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      website: data.website ?? null,
      defaultTaxRatePercent: data.defaultTaxRatePercent,
      nextInvoiceNumber: data.nextInvoiceNumber,
      invoiceNumberPrefix: data.invoiceNumberPrefix,
      invoiceNumberPadding: data.invoiceNumberPadding,
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

export type PasswordActionState = { error?: string; success?: boolean } | undefined;

export async function changePasswordFormAction(
  _prevState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  await requireAppSessionForAction();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmNewPassword = String(formData.get("confirmNewPassword") ?? "");

  if (newPassword !== confirmNewPassword) {
    return { error: "Passwords do not match." };
  }

  const result = await changePasswordAction(currentPassword, newPassword);
  if (result.error) {
    return { error: result.error };
  }

  return { success: true };
}
