import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { createCustomerAction } from "@/actions/customers";
import { CustomerForm } from "@/components/forms/CustomerForm";
import { pageWrap, pageTitle, cardClass, linkMuted } from "@/lib/ui/classNames";

/**
 * Admin + Staff only. A dedicated create page rather than an inline form
 * on the list page or a `<details>` reveal (both tried and replaced —
 * see docs/HANDOVER_LOG.md, layout pass 2026-09-13): the developer found
 * the inline reveal left a large empty gap next to the narrow form. On
 * success, `createCustomerAction` redirects straight back to `/customers`.
 */
export default async function NewCustomerPage() {
  await requireRole(["ADMIN", "STAFF"]);

  return (
    <main className={pageWrap}>
      <Link href="/customers" className={`inline-flex items-center gap-1.5 ${linkMuted}`}>
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        Customers
      </Link>

      <h1 className={pageTitle}>Add a customer</h1>

      <div className={`${cardClass} max-w-lg`}>
        <CustomerForm action={createCustomerAction} submitLabel="Create customer" />
      </div>
    </main>
  );
}
