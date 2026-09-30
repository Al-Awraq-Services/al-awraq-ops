import { db } from "@/lib/db";
import { toNum } from "@/lib/invoiceMath";
import { BusinessProfileForm } from "./BusinessProfileForm";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { pageWrap, pageTitle, pageSubtitle, sectionTitle, cardClass } from "@/lib/ui/classNames";

export default async function SettingsPage() {
  const profile = await db.businessProfile.findUnique({ where: { id: "singleton" } });

  const defaultValues = {
    legalName: profile?.legalName ?? "",
    trn: profile?.trn ?? "",
    address: profile?.address ?? "",
    phone: profile?.phone ?? "",
    email: profile?.email ?? "",
    website: profile?.website ?? "",
    defaultTaxRatePercent: toNum(profile?.defaultTaxRatePercent ?? 5),
    nextInvoiceNumber: profile?.nextInvoiceNumber ?? 1064,
    invoiceNumberPrefix: profile?.invoiceNumberPrefix ?? "",
    invoiceNumberPadding: profile?.invoiceNumberPadding ?? 5,
  };

  return (
    <main className={pageWrap}>
      <div>
        <h1 className={pageTitle}>Settings</h1>
        <p className={pageSubtitle}>Business details, invoicing defaults, and account security.</p>
      </div>

      <div className={`${cardClass} max-w-2xl`}>
        <h2 className={`${sectionTitle} mb-4`}>Business details</h2>
        <BusinessProfileForm defaultValues={defaultValues} />
      </div>

      <div className={`${cardClass} max-w-2xl`}>
        <h2 className={`${sectionTitle} mb-4`}>Change password</h2>
        <ChangePasswordForm />
      </div>
    </main>
  );
}
