import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { updateCustomerAction, archiveCustomerAction } from "@/actions/customers";
import { CustomerForm } from "@/components/forms/CustomerForm";
import {
  pageWrap,
  pageTitle,
  cardClass,
  badgeClass,
  mutedText,
  linkDanger,
} from "@/lib/ui/classNames";

/**
 * Admin + Staff only. No delete action exists on this screen — archive
 * only, per the approved Phase C scope.
 */
export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  await requireRole(["ADMIN", "STAFF"]);

  const { customerId } = await params;
  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer) notFound();

  return (
    <main className={pageWrap}>
      <div className="flex items-center gap-3">
        <h1 className={pageTitle}>{customer.name}</h1>
        <span className={badgeClass(customer.isArchived ? "red" : "green")}>
          {customer.isArchived ? "Archived" : "Active"}
        </span>
      </div>

      {customer.isArchived ? (
        <div className={cardClass}>
          <p className={`${mutedText} mb-4`}>
            This customer is archived — read-only. Fields below reflect its
            last known values.
          </p>
          <dl className="text-sm flex flex-col gap-3">
            <div>
              <dt className={mutedText}>Phone</dt>
              <dd className="text-neutral-900">{customer.phone}</dd>
            </div>
            <div>
              <dt className={mutedText}>Email</dt>
              <dd className="text-neutral-900">{customer.email ?? "—"}</dd>
            </div>
            <div>
              <dt className={mutedText}>Address</dt>
              <dd className="text-neutral-900">{customer.address ?? "—"}</dd>
            </div>
            <div>
              <dt className={mutedText}>Notes</dt>
              <dd className="text-neutral-900">{customer.notes ?? "—"}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className={cardClass}>
          <CustomerForm
            action={updateCustomerAction.bind(null, customer.id)}
            defaultValues={{
              name: customer.name,
              phone: customer.phone,
              email: customer.email,
              address: customer.address,
              notes: customer.notes,
            }}
            submitLabel="Save changes"
          />

          <form action={archiveCustomerAction.bind(null, customer.id)} className="mt-4">
            <button type="submit" className={linkDanger}>
              Archive customer
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
