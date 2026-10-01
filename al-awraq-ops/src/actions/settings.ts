"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMainAccountForAction } from "@/lib/auth/appAuth";
import { changeMyPasswordAction } from "@/actions/authGate";
import { parseBusinessProfileFormData } from "@/lib/validation/settings";

export type SettingsActionState = { error?: string; success?: boolean } | undefined;

/** Business details — main-account-only (see appAuth.ts, requireMainAccountForAction). */
export async function updateBusinessProfileAction(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireMainAccountForAction();

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

/**
 * Thin wrapper around authGate.ts's `changeMyPasswordAction` — every
 * account (main or not) can change their own password this way. Only
 * translates its `{error?}` result into this form's `{error?, success?}`
 * shape so ChangePasswordForm's existing "Password updated" confirmation
 * keeps working.
 */
export async function changePasswordFormAction(
  prevState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const result = await changeMyPasswordAction(prevState, formData);
  if (result?.error) {
    return { error: result.error };
  }
  return { success: true };
}
