import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/appAuth";
import { computeInvoiceTotals, toNum } from "@/lib/invoiceMath";
import {
  pageWrap,
  pageHeader,
  pageActions,
  pageTitle,
  pageSubtitle,
  btnPrimary,
  btnSecondary,
  tableWrap,
  table,
  thClass,
  thNum,
  tdClass,
  tdNum,
  trHover,
  rowLink,
  badgeClass,
  inputClass,
  emptyState,
} from "@/lib/ui/classNames";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requirePermission("canViewCustomers");
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const customers = await db.customer.findMany({
    where: query
      ? { name: { contains: query, mode: "insensitive" } }
      : undefined,
    include: {
      invoices: { include: { items: true } },
      inquiries: { include: { items: true } },
    },
    orderBy: { name: "asc" },
  });

  function docBalance(
    docs: Array<{
      items: Array<{ quantity: unknown; unitPrice: unknown; retentionAmount: unknown }>;
      taxRatePercent: unknown;
      discountAmount: unknown;
      shipmentAmount: unknown;
      stampDutyAmount: unknown;
      amountPaid: unknown;
    }>,
  ) {
    return docs.reduce((sum, doc) => {
      const totals = computeInvoiceTotals(
        doc.items.map((item) => ({
          quantity: toNum(item.quantity),
          unitPrice: toNum(item.unitPrice),
          retentionAmount: item.retentionAmount ? toNum(item.retentionAmount) : null,
        })),
        {
          taxRatePercent: toNum(doc.taxRatePercent),
          discountAmount: doc.discountAmount ? toNum(doc.discountAmount) : null,
          shipmentAmount: doc.shipmentAmount ? toNum(doc.shipmentAmount) : null,
          stampDutyAmount: doc.stampDutyAmount ? toNum(doc.stampDutyAmount) : null,
          amountPaid: toNum(doc.amountPaid),
        },
      );
      return sum + totals.balanceDue;
    }, 0);
  }

  const rows = customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    type: customer.type,
    address: customer.address,
    contact: customer.contact,
    balance: docBalance(customer.invoices) + docBalance(customer.inquiries),
  }));

  return (
    <main className={pageWrap}>
      <div className={pageHeader}>
        <div>
          <h1 className={pageTitle}>Customers</h1>
          <p className={pageSubtitle}>Address book, {customers.length} on file.</p>
        </div>
        {(user.isMainAccount || user.canManageCustomers) && (
          <div className={pageActions}>
            <Link href="/customers/new" className={btnPrimary}>
              New customer
            </Link>
          </div>
        )}
      </div>

      <form className="flex w-full max-w-md gap-2" action="/customers" method="get">
        <input
          type="text"
          name="q"
          placeholder="Search by name"
          aria-label="Search customers by name"
          defaultValue={query}
          className={inputClass}
        />
        <button type="submit" className={btnSecondary}>
          Search
        </button>
      </form>

      {rows.length === 0 ? (
        <div className={emptyState}>
          {query ? `No customers match "${query}".` : "No customers yet."}
        </div>
      ) : (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Type</th>
                <th className={thClass}>Address</th>
                <th className={thClass}>Contact</th>
                {user.isMainAccount && <th className={thNum}>Balance</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={trHover}>
                  <td className={tdClass}>
                    <Link href={`/customers/${row.id}`} className={rowLink}>
                      {row.name}
                    </Link>
                  </td>
                  <td className={tdClass}>
                    {row.type === "BUSINESS" ? (
                      <span className={badgeClass("blue")}>Business</span>
                    ) : (
                      <span className="text-muted">Individual</span>
                    )}
                  </td>
                  <td className={tdClass}>{row.address || <span className="text-faint">—</span>}</td>
                  <td className={tdClass}>{row.contact || <span className="text-faint">—</span>}</td>
                  {user.isMainAccount && (
                    <td className={tdNum}>
                      {row.balance > 0 ? (
                        <span className="text-negative">
                          AED {row.balance.toLocaleString("en-AE", { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className={badgeClass("green")}>Settled</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
