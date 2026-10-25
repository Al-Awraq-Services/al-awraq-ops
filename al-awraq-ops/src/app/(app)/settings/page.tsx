import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/appAuth";
import { toNum } from "@/lib/invoiceMath";
import { BusinessProfileForm } from "./BusinessProfileForm";
import { ChangePasswordForm } from "./ChangePasswordForm";
import {
  pageWrap,
  pageHeader,
  pageTitle,
  pageSubtitle,
  sectionTitle,
  hintText,
  cardClass,
} from "@/lib/ui/classNames";

export default async function SettingsPage() {
  const user = await requireUser();
  const profile = user.isMainAccount
    ? await db.businessProfile.findUnique({ where: { id: "singleton" } })
    : null;

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
      <div className={pageHeader}>
        <div>
          <h1 className={pageTitle}>Settings</h1>
          <p className={pageSubtitle}>
            {user.isMainAccount
              ? "Business details, invoicing defaults and account security."
              : "Account security."}
          </p>
        </div>
      </div>

      {user.isMainAccount && (
        <section className={`${cardClass} max-w-3xl`}>
          <h2 className={`${sectionTitle} mb-6`}>Business profile</h2>
          <BusinessProfileForm defaultValues={defaultValues} />
        </section>
      )}

      <section className={`${cardClass} max-w-3xl`}>
        <h2 className={sectionTitle}>Change password</h2>
        <p className={`${hintText} mt-1 mb-5`}>For the account you&apos;re signed in with.</p>
        <ChangePasswordForm />
      </section>
    </main>
  );
}
