import Link from "next/link";
import { requirePermission } from "@/lib/auth/appAuth";
import { createVendorAction } from "@/actions/vendors";
import { VendorForm } from "@/components/forms/VendorForm";
import { pageWrap, pageTitle, pageSubtitle, cardClass, link } from "@/lib/ui/classNames";

export default async function NewVendorPage() {
  await requirePermission("canManagePurchaseOrders");

  return (
    <main className={pageWrap}>
      <div>
        <Link href="/vendors" className={link}>
          ← Back to vendors
        </Link>
        <h1 className={`${pageTitle} mt-2`}>New Vendor</h1>
        <p className={pageSubtitle}>Add a vendor to the supplier address book.</p>
      </div>
      <div className={`${cardClass} max-w-xl`}>
        <VendorForm mode="create" action={createVendorAction} />
      </div>
    </main>
  );
}
