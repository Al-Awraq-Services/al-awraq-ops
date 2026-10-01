import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/appAuth";
import { toNum, nextInvoiceDisplayNumber } from "@/lib/invoiceMath";
import { createPurchaseOrderAction } from "@/actions/purchaseOrders";
import { PurchaseOrderForm } from "@/components/forms/PurchaseOrderForm";
import { pageWrap, pageTitle, pageSubtitle, link } from "@/lib/ui/classNames";

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
        <Link href="/purchase-orders" className={link}>
          ← Back to purchase orders
        </Link>
        <h1 className={`${pageTitle} mt-2`}>New purchase order</h1>
        <p className={pageSubtitle}>Fill in the details below to create a new purchase order.</p>
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
