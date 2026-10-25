import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/appAuth";
import { toNum, nextInvoiceDisplayNumber } from "@/lib/invoiceMath";
import { createInvoiceAction } from "@/actions/invoices";
import { InvoiceForm } from "@/components/forms/InvoiceForm";
import { pageWrap, pageHeader, pageTitle, pageSubtitle, backLink } from "@/lib/ui/classNames";

export default async function NewInvoicePage() {
  await requirePermission("canManageInvoices");

  const [customers, profile] = await Promise.all([
    db.customer.findMany({ orderBy: { name: "asc" } }),
    db.businessProfile.findUnique({ where: { id: "singleton" } }),
  ]);

  const plainCustomers = customers.map((c) => ({
    id: c.id,
    name: c.name,
    address: c.address,
    contact: c.contact,
  }));

  const defaultTaxRatePercent = toNum(profile?.defaultTaxRatePercent ?? 5);
  const nextInvoiceNumberDisplay = nextInvoiceDisplayNumber(
    profile?.nextInvoiceNumber ?? 1064,
    profile?.invoiceNumberPrefix ?? "",
    profile?.invoiceNumberPadding ?? 5,
  );

  return (
    <main className={pageWrap}>
      <div>
        <Link href="/invoices" className={backLink}>
          ← Invoices
        </Link>
        <div className={`${pageHeader} mt-4`}>
          <div>
            <h1 className={pageTitle}>New invoice</h1>
            <p className={pageSubtitle}>
              Will be numbered {nextInvoiceNumberDisplay} unless you change it.
            </p>
          </div>
        </div>
      </div>

      <InvoiceForm
        mode="create"
        customers={plainCustomers}
        defaultTaxRatePercent={defaultTaxRatePercent}
        nextInvoiceNumberDisplay={nextInvoiceNumberDisplay}
        action={createInvoiceAction}
      />
    </main>
  );
}
