import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/appAuth";
import { computeInvoiceTotals, toNum, formatMoney } from "@/lib/invoiceMath";
import {
  pageWrap,
  pageTitle,
  pageSubtitle,
  btnPrimary,
  statGrid,
  statTile,
  statLabel,
  statValueClass,
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

function statusTone(status: "UNPAID" | "PARTIAL" | "PAID"): "green" | "blue" | "neutral" {
  if (status === "PAID") return "green";
  if (status === "PARTIAL") return "blue";
  return "neutral";
}

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requirePermission("canViewInquiries");
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={pageTitle}>Inquiries</h1>
          <p className={pageSubtitle}>{inquiries.length} on file.</p>
        </div>
        {(user.isMainAccount || user.canManageInquiries) && (
          <Link href="/inquiries/new" className={btnPrimary}>
            + New Inquiry
          </Link>
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

      <form className="flex max-w-sm gap-2" action="/inquiries" method="get">
        <input
          type="text"
          name="q"
          placeholder="Search by inquiry # or customer…"
          defaultValue={query}
          className={inputClass}
        />
        <button type="submit" className={btnPrimary}>
          Search
        </button>
      </form>

      {rows.length === 0 ? (
        <p className={mutedText}>
          {query ? `No inquiries match "${query}".` : "No inquiries yet."}
        </p>
      ) : (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={thClass}>Number</th>
                <th className={thClass}>Customer</th>
                <th className={thClass}>Date</th>
                <th className={thClass}>Total</th>
                <th className={thClass}>Balance</th>
                <th className={thClass}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={trHover}>
                  <td className={tdClass}>
                    <Link href={`/inquiries/${row.id}`} className={link}>
                      {row.inquiryNumber}
                    </Link>
                  </td>
                  <td className={tdClass}>{row.customerName}</td>
                  <td className={tdClass}>
                    {row.inquiryDate.toLocaleDateString("en-AE", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className={tdClass}>AED {formatMoney(row.grandTotal)}</td>
                  <td className={tdClass}>AED {formatMoney(row.balanceDue)}</td>
                  <td className={tdClass}>
                    <span className={badgeClass(statusTone(row.status))}>{row.status}</span>
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
