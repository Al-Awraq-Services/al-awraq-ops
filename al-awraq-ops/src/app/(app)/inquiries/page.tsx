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

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requirePermission("canViewInquiries");
  const canManage = user.isMainAccount || user.canManageInquiries;
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const inquiries = await db.inquiry.findMany({
    where: query
      ? {
          OR: [
            { inquiryNumber: { contains: query, mode: "insensitive" } },
            { customer: { name: { contains: query, mode: "insensitive" } } },
            { billingName: { contains: query, mode: "insensitive" } },
            { billingCompanyName: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { items: true, customer: { select: { name: true } } },
    orderBy: { inquiryDate: "desc" },
  });

  const rows = inquiries.map((inquiry) => {
    const totals = computeInvoiceTotals(
      inquiry.items.map((item) => ({
        quantity: toNum(item.quantity),
        unitPrice: toNum(item.unitPrice),
        retentionAmount: item.retentionAmount ? toNum(item.retentionAmount) : null,
      })),
      {
        taxRatePercent: toNum(inquiry.taxRatePercent),
        discountAmount: inquiry.discountAmount ? toNum(inquiry.discountAmount) : null,
        shipmentAmount: inquiry.shipmentAmount ? toNum(inquiry.shipmentAmount) : null,
        stampDutyAmount: inquiry.stampDutyAmount ? toNum(inquiry.stampDutyAmount) : null,
        amountPaid: toNum(inquiry.amountPaid),
      },
    );
    return {
      id: inquiry.id,
      inquiryNumber: inquiry.inquiryNumber,
      inquiryDate: inquiry.inquiryDate,
      customerName: inquiry.customer?.name ?? inquiry.billingName,
      grandTotal: totals.grandTotal,
      balanceDue: totals.balanceDue,
      status: totals.status,
    };
  });

  const totalOutstanding = rows.reduce((sum, row) => sum + row.balanceDue, 0);
  const now = new Date();
  const totalPaidThisMonth = inquiries.reduce((sum, inquiry) => {
    if (
      inquiry.inquiryDate.getFullYear() === now.getFullYear() &&
      inquiry.inquiryDate.getMonth() === now.getMonth()
    ) {
      return sum + toNum(inquiry.amountPaid);
    }
    return sum;
  }, 0);

  return (
    <main className={pageWrap}>
      <div className={pageHeader}>
        <div>
          <h1 className={pageTitle}>Inquiries</h1>
          <p className={pageSubtitle}>{inquiries.length} on file</p>
        </div>
        {canManage && (
          <div className={pageActions}>
            <Link href="/inquiries/new" className={btnPrimary}>
              New inquiry
            </Link>
          </div>
        )}
      </div>

      {/* Outstanding balance / Paid this month are aggregate rollups — the
          "how much have I made" figures the private sub-account is never
          shown (see the User model comment in schema.prisma, and the same
          pattern on the Invoices list page). The per-inquiry Total/Balance
          columns in the table below stay visible for everyone who can view
          inquiries at all — that's the actual operational data needed to
          do the job. */}
      <div className={statGrid}>
        <div className={statTile}>
          <div className={statLabel}>Inquiries</div>
          <div className={statValueClass()}>{inquiries.length}</div>
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

      <form className="flex max-w-md gap-2" action="/inquiries" method="get">
        <input
          type="text"
          name="q"
          placeholder="Inquiry number, customer or company"
          aria-label="Search inquiries"
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
            <>No inquiries match &ldquo;{query}&rdquo;.</>
          ) : (
            <>
              No inquiries yet.
              {canManage && (
                <>
                  {" "}
                  <Link href="/inquiries/new" className={link}>
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
                    <Link href={`/inquiries/${row.id}`} className={rowLink}>
                      {row.inquiryNumber}
                    </Link>
                  </td>
                  <td className={tdClass}>{row.customerName}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    {row.inquiryDate.toLocaleDateString("en-AE", {
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
