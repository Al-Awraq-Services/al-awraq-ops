import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/appAuth";
import { computeInvoiceTotals, toNum, formatMoney } from "@/lib/invoiceMath";
import {
  pageWrap,
  pageHeader,
  pageActions,
  pageTitle,
  pageSubtitle,
  btnPrimary,
  btnSecondary,
  statGrid,
  statTile,
  statLabel,
  statValueClass,
  tableWrap,
  table,
  thClass,
  thNum,
  tdClass,
  tdNum,
  trHover,
  link,
  rowLink,
  badgeClass,
  statusLabel,
  inputClass,
  emptyState,
} from "@/lib/ui/classNames";

function statusTone(status: "UNPAID" | "PARTIAL" | "PAID"): "green" | "amber" | "neutral" {
  if (status === "PAID") return "green";
  if (status === "PARTIAL") return "amber";
  return "neutral";
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requirePermission("canViewInvoices");
  const canManage = user.isMainAccount || user.canManageInvoices;
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const invoices = await db.invoice.findMany({
    where: query
      ? {
          OR: [
            { invoiceNumber: { contains: query, mode: "insensitive" } },
            { customer: { name: { contains: query, mode: "insensitive" } } },
            { billingName: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { items: true, customer: { select: { name: true } } },
    orderBy: { invoiceDate: "desc" },
  });

  const rows = invoices.map((invoice) => {
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
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      customerName: invoice.customer?.name ?? invoice.billingName,
      grandTotal: totals.grandTotal,
      balanceDue: totals.balanceDue,
      status: totals.status,
    };
  });

  const totalOutstanding = rows.reduce((sum, row) => sum + row.balanceDue, 0);
  const now = new Date();
  const totalPaidThisMonth = invoices.reduce((sum, invoice) => {
    if (
      invoice.invoiceDate.getFullYear() === now.getFullYear() &&
      invoice.invoiceDate.getMonth() === now.getMonth()
    ) {
      return sum + toNum(invoice.amountPaid);
    }
    return sum;
  }, 0);

  return (
    <main className={pageWrap}>
      <div className={pageHeader}>
        <div>
          <h1 className={pageTitle}>Invoices</h1>
          <p className={pageSubtitle}>{invoices.length} on file</p>
        </div>
        {canManage && (
          <div className={pageActions}>
            <Link href="/invoices/new" className={btnPrimary}>
              New invoice
            </Link>
          </div>
        )}
      </div>

      {/* Outstanding balance / Paid this month are aggregate rollups — the
          "how much have I made" figures the private sub-account is never
          shown (see the User model comment in schema.prisma). The
          per-invoice Total/Balance columns in the table below stay
          visible for everyone who can view invoices at all — that's the
          actual operational data needed to do the job. */}
      <div className={statGrid}>
        <div className={statTile}>
          <div className={statLabel}>Invoices</div>
          <div className={statValueClass()}>{invoices.length}</div>
        </div>
        {user.isMainAccount && (
          <>
            <div className={statTile}>
              <div className={statLabel}>Outstanding balance</div>
              <div className={statValueClass(totalOutstanding > 0 ? "red" : "green")}>
                AED {formatMoney(totalOutstanding)}
              </div>
            </div>
            <div className={statTile}>
              <div className={statLabel}>Paid this month</div>
              <div className={statValueClass("green")}>AED {formatMoney(totalPaidThisMonth)}</div>
            </div>
          </>
        )}
      </div>

      <form className="flex max-w-md gap-2" action="/invoices" method="get">
        <input
          type="text"
          name="q"
          placeholder="Invoice number or customer"
          aria-label="Search invoices"
          defaultValue={query}
          className={inputClass}
        />
        <button type="submit" className={btnSecondary}>
          Search
        </button>
      </form>

      {rows.length === 0 ? (
        <div className={emptyState}>
          {query ? (
            <>No invoices match &ldquo;{query}&rdquo;.</>
          ) : (
            <>
              No invoices yet.
              {canManage && (
                <>
                  {" "}
                  <Link href="/invoices/new" className={link}>
                    Create the first one
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      ) : (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={thClass}>Number</th>
                <th className={thClass}>Customer</th>
                <th className={thClass}>Date</th>
                <th className={thNum}>Total</th>
                <th className={thNum}>Balance</th>
                <th className={thClass}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={trHover}>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    <Link href={`/invoices/${row.id}`} className={rowLink}>
                      {row.invoiceNumber}
                    </Link>
                  </td>
                  <td className={tdClass}>{row.customerName}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    {row.invoiceDate.toLocaleDateString("en-AE", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className={tdNum}>AED {formatMoney(row.grandTotal)}</td>
                  <td className={tdNum}>AED {formatMoney(row.balanceDue)}</td>
                  <td className={tdClass}>
                    <span className={badgeClass(statusTone(row.status))}>
                      {statusLabel(row.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
