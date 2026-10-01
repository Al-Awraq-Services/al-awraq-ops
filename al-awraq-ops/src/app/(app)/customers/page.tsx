import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/appAuth";
import { computeInvoiceTotals, toNum } from "@/lib/invoiceMath";
import {
  pageWrap,
  pageTitle,
  pageSubtitle,
  btnPrimary,
  tableWrap,
  table,
  thClass,
  tdClass,
  trHover,
  link,
  badgeClass,
  inputClass,
  mutedText,
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
    include: { invoices: { include: { items: true } } },
    orderBy: { name: "asc" },
  });

  const rows = customers.map((customer) => {
    const balance = customer.invoices.reduce((sum, invoice) => {
      const totals = computeInvoiceTotals(
        invoice.items.map((item) => ({
          quantity: toNum(item.quantity),
          unitPrice: toNum(item.unitPrice),
          retentionAmount: item.retentionAmount ? toNum(item.retentionAmount) : null,
        })),
        {
          taxRatePercent: toNum(invoice.taxRatePercent),
          discountAmount: invoice.discountAmount ? toNum(invoice.discountAmount) : null,
          shipmentAmount: invoice.shipmentAmount ? toNum(invoice.shipmentAmount) : null,
          stampDutyAmount: invoice.stampDutyAmount ? toNum(invoice.stampDutyAmount) : null,
          amountPaid: toNum(invoice.amountPaid),
        },
      );
      return sum + totals.balanceDue;
    }, 0);

    return {
      id: customer.id,
      name: customer.name,
      address: customer.address,
      contact: customer.contact,
      balance,
    };
  });

  return (
    <main className={pageWrap}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={pageTitle}>Customers</h1>
          <p className={pageSubtitle}>Your address book — {customers.length} on file.</p>
        </div>
        {(user.isMainAccount || user.canManageCustomers) && (
          <Link href="/customers/new" className={btnPrimary}>
            + New Customer
          </Link>
        )}
      </div>

      <form className="flex max-w-sm gap-2" action="/customers" method="get">
        <input
          type="text"
          name="q"
          placeholder="Search by name…"
          defaultValue={query}
          className={inputClass}
        />
        <button type="submit" className={btnPrimary}>
          Search
        </button>
      </form>

      {rows.length === 0 ? (
        <p className={mutedText}>
          {query ? `No customers match "${query}".` : "No customers yet."}
        </p>
      ) : (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Address</th>
                <th className={thClass}>Contact</th>
                {user.isMainAccount && <th className={thClass}>Balance</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={trHover}>
                  <td className={tdClass}>
                    <Link href={`/customers/${row.id}`} className={link}>
                      {row.name}
                    </Link>
                  </td>
                  <td className={tdClass}>{row.address || "—"}</td>
                  <td className={tdClass}>{row.contact || "—"}</td>
                  {user.isMainAccount && (
                    <td className={tdClass}>
                      {row.balance > 0 ? (
                        <span className={badgeClass("red")}>
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
