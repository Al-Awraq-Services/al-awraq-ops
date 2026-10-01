import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/appAuth";
import { toNum, nextInvoiceDisplayNumber } from "@/lib/invoiceMath";
import { createInquiryAction } from "@/actions/inquiries";
import { InquiryForm } from "@/components/forms/InquiryForm";
import { pageWrap, pageTitle, pageSubtitle, link } from "@/lib/ui/classNames";

export default async function NewInquiryPage() {
  await requirePermission("canManageInquiries");

  const [customers, profile] = await Promise.all([
    db.customer.findMany({ orderBy: { name: "asc" } }),
    db.businessProfile.findUnique({ where: { id: "singleton" } }),
  ]);

  // Both INDIVIDUAL and BUSINESS customers are included — the
  // BusinessCustomerCombobox needs the full address book for autocomplete;
  // individual customers simply won't have company/TRN/contactPerson set.
  const plainCustomers = customers.map((c) => ({
    id: c.id,
    name: c.name,
    address: c.address,
    contact: c.contact,
    companyName: c.companyName,
    businessTrn: c.businessTrn,
    contactPerson: c.contactPerson,
  }));

  const defaultTaxRatePercent = toNum(profile?.defaultTaxRatePercent ?? 5);
  const nextInquiryNumberDisplay = nextInvoiceDisplayNumber(
    profile?.nextInquiryNumber ?? 1,
    profile?.inquiryNumberPrefix ?? "INQ-",
    profile?.inquiryNumberPadding ?? 5,
  );

  return (
    <main className={pageWrap}>
      <div>
        <Link href="/inquiries" className={link}>
          ← Back to inquiries
        </Link>
        <h1 className={`${pageTitle} mt-2`}>New inquiry</h1>
        <p className={pageSubtitle}>Fill in the details below to create a new inquiry.</p>
      </div>

      <InquiryForm
        mode="create"
        customers={plainCustomers}
        defaultTaxRatePercent={defaultTaxRatePercent}
        nextInquiryNumberDisplay={nextInquiryNumberDisplay}
        action={createInquiryAction}
      />
    </main>
  );
}
