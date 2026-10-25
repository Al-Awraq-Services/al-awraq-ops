import Link from "next/link";
import { requirePermission } from "@/lib/auth/appAuth";
import { createVendorAction } from "@/actions/vendors";
import { VendorForm } from "@/components/forms/VendorForm";
import {
  pageWrap,
  pageHeader,
  pageTitle,
  pageSubtitle,
  backLink,
  cardClass,
} from "@/lib/ui/classNames";

export default async function NewVendorPage() {
  await requirePermission("canManagePurchaseOrders");

  return (
    <main className={pageWrap}>
      <div className="flex flex-col gap-4">
        <Link href="/vendors" className={`${backLink} self-start`}>
          ← Vendors
        </Link>
        <div className={pageHeader}>
          <div>
            <h1 className={pageTitle}>New vendor</h1>
            <p className={pageSubtitle}>Add a supplier to the vendor address book.</p>
          </div>
        </div>
      </div>
      <div className={`${cardClass} max-w-2xl`}>
        <VendorForm mode="create" action={createVendorAction} />
      </div>
    </main>
  );
}
