import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/appAuth";
import { toNum, nextInvoiceDisplayNumber } from "@/lib/invoiceMath";
import { createPurchaseOrderAction } from "@/actions/purchaseOrders";
import { PurchaseOrderForm } from "@/components/forms/PurchaseOrderForm";
import { pageWrap, pageHeader, pageTitle, pageSubtitle, backLink } from "@/lib/ui/classNames";

export default async function NewPurchaseOrderPage() {
  await requirePermission("canManagePurchaseOrders");

  const [vendors, profile] = await Promise.all([
    db.vendor.findMany({ orderBy: { name: "asc" } }),
    db.businessProfile.findUnique({ where: { id: "singleton" } }),
  ]);

  const plainVendors = vendors.map((v) => ({
    id: v.id,
    name: v.name,
    address: v.address,
    contact: v.contact,
  }));

  const defaultTaxRatePercent = toNum(profile?.defaultTaxRatePercent ?? 5);
  const nextPoNumberDisplay = nextInvoiceDisplayNumber(
    profile?.nextPoNumber ?? 1,
    profile?.poNumberPrefix ?? "PO-",
    profile?.poNumberPadding ?? 5,
  );

  return (
    <main className={pageWrap}>
      <div>
        <Link href="/purchase-orders" className={backLink}>
          ← Purchase orders
        </Link>
        <div className={`${pageHeader} mt-4`}>
          <div>
            <h1 className={pageTitle}>New purchase order</h1>
            <p className={pageSubtitle}>
              Will be numbered {nextPoNumberDisplay} unless you change it.
            </p>
          </div>
        </div>
      </div>

      <PurchaseOrderForm
        mode="create"
        vendors={plainVendors}
        defaultTaxRatePercent={defaultTaxRatePercent}
        nextPoNumberDisplay={nextPoNumberDisplay}
        action={createPurchaseOrderAction}
      />
    </main>
  );
}
