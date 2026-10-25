import Link from "next/link";
import { requirePermission } from "@/lib/auth/appAuth";
import { createCustomerAction } from "@/actions/customers";
import { CustomerForm } from "@/components/forms/CustomerForm";
import {
  pageWrap,
  pageHeader,
  pageTitle,
  pageSubtitle,
  backLink,
  cardClass,
} from "@/lib/ui/classNames";

export default async function NewCustomerPage() {
  await requirePermission("canManageCustomers");

  return (
    <main className={pageWrap}>
      <div className="flex flex-col gap-4">
        <Link href="/customers" className={`${backLink} self-start`}>
          ← Customers
        </Link>
        <div className={pageHeader}>
          <div>
            <h1 className={pageTitle}>New customer</h1>
            <p className={pageSubtitle}>Add a customer to the address book.</p>
          </div>
        </div>
      </div>
      <div className={`${cardClass} max-w-2xl`}>
        <CustomerForm mode="create" action={createCustomerAction} />
      </div>
    </main>
  );
}
