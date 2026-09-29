import Link from "next/link";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { formatInvoiceNumber } from "@/lib/ui/invoiceNumber";
import {
  pageWrap,
  pageTitle,
  link,
  statGrid,
  statTile,
  statLabel,
  statValueClass,
  mutedText,
  tableWrap,
  table,
  thClass,
  tdClass,
  trHover,
  badgeClass,
} from "@/lib/ui/classNames";

/**
 * Admin + Staff only, matching Quote's access level — an Invoice only
 * exists because a Quote one of them approved generated it. No create
 * action/button anywhere on this page: an Invoice is only ever generated
 * by `updateQuoteAction` the moment a Quote reaches Approved (see
 * src/actions/quotes.ts) — "automatically generated," per the request, not
 * a form. No search box, deliberately — Invoice was never on the
 * sponsor-approved fixed search-field list (docs/OPEN_DECISIONS.md), the
 * same reasoning Service's list page already applies.
 */
export default async function InvoicesPage() {
  await requireRole(["ADMIN", "STAFF"]);

  const [invoices, unpaidCount, paidCount, allItems] = await Promise.all([
    db.invoice.findMany({
      include: { customer: true, items: true },
      orderBy: { sequenceNumber: "desc" },
    }),
    db.invoice.count({ where: { status: "UNPAID" } }),
    db.invoice.count({ where: { status: "PAID" } }),
    db.invoiceItem.findMany({
      select: { quantity: true, unitPrice: true, invoice: { select: { status: true } } },
    }),
  ]);

  const unpaidValue = allItems
    .filter((i) => i.invoice.status === "UNPAID")
    .reduce((sum, i) => sum + i.quantity * i.unitPrice.toNumber(), 0);

  return (
    <main className={pageWrap}>
      <h1 className={pageTitle}>Invoices</h1>

      <div className={statGrid}>
        <div className={statTile}>
          <p className={statValueClass("neutral")}>{unpaidCount}</p>
          <p className={statLabel}>Unpaid</p>
        </div>
        <div className={statTile}>
          <p className={statValueClass("green")}>{paidCount}</p>
          <p className={statLabel}>Paid</p>
        </div>
        <div className={statTile}>
          <p className={statValueClass("neutral")}>AED {unpaidValue.toFixed(0)}</p>
          <p className={statLabel}>Outstanding</p>
        </div>
      </div>

      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={thClass}>Invoice</th>
              <th className={thClass}>Customer</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => {
              const total = invoice.items.reduce(
                (sum, item) => sum + item.quantity * item.unitPrice.toNumber(),
                0,
              );
              return (
                <tr key={invoice.id} className={trHover}>
                  <td className={tdClass}>
                    <Link href={`/invoices/${invoice.id}`} className={link}>
                      {formatInvoiceNumber(invoice.sequenceNumber)}
                    </Link>
                  </td>
                  <td className={tdClass}>{invoice.customer.name}</td>
                  <td className={tdClass}>
                    <span className={badgeClass(invoice.status === "PAID" ? "green" : "neutral")}>
                      {invoice.status === "PAID" ? "Paid" : "Unpaid"}
                    </span>
                  </td>
                  <td className={tdClass}>AED {total.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {invoices.length === 0 && (
        <p className={mutedText}>
          No invoices yet — approving a quote automatically creates one.
        </p>
      )}
    </main>
  );
}
