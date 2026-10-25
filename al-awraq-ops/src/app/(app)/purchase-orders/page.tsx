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

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requirePermission("canViewPurchaseOrders");
  const canManage = user.isMainAccount || user.canManagePurchaseOrders;
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const purchaseOrders = await db.purchaseOrder.findMany({
    where: query
      ? {
          OR: [
            { poNumber: { contains: query, mode: "insensitive" } },
            { vendor: { name: { contains: query, mode: "insensitive" } } },
            { billingVendorName: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { items: true, vendor: { select: { name: true } } },
    orderBy: { orderDate: "desc" },
  });

  const rows = purchaseOrders.map((po) => {
    const totals = computeInvoiceTotals(
      po.items.map((item) => ({
        quantity: toNum(item.quantity),
        unitPrice: toNum(item.unitPrice),
      })),
      {
        taxRatePercent: toNum(po.taxRatePercent),
        discountAmount: po.discountAmount ? toNum(po.discountAmount) : null,
        shipmentAmount: po.shipmentAmount ? toNum(po.shipmentAmount) : null,
        amountPaid: toNum(po.amountPaid),
      },
    );
    return {
      id: po.id,
      poNumber: po.poNumber,
      orderDate: po.orderDate,
      vendorName: po.vendor?.name ?? po.billingVendorName,
      grandTotal: totals.grandTotal,
      balanceDue: totals.balanceDue,
      status: totals.status,
    };
  });

  const totalOwed = rows.reduce((sum, row) => sum + row.balanceDue, 0);
  const now = new Date();
  const totalPaidThisMonth = purchaseOrders.reduce((sum, po) => {
    if (
      po.orderDate.getFullYear() === now.getFullYear() &&
      po.orderDate.getMonth() === now.getMonth()
    ) {
      return sum + toNum(po.amountPaid);
    }
    return sum;
  }, 0);

  return (
    <main className={pageWrap}>
      <div className={pageHeader}>
        <div>
          <h1 className={pageTitle}>Purchase orders</h1>
          <p className={pageSubtitle}>{purchaseOrders.length} on file</p>
        </div>
        <div className={pageActions}>
          <Link href="/vendors" className={btnSecondary}>
            Vendors
          </Link>
          {canManage && (
            <Link href="/purchase-orders/new" className={btnPrimary}>
              New purchase order
            </Link>
          )}
        </div>
      </div>

      {/* Amount owed / Paid this month are aggregate rollups — the "how
          much am I spending" figures a private sub-account is never shown
          (see the User model comment in schema.prisma). The per-PO
          Total/Balance columns in the table below stay visible for
          everyone who can view purchase orders at all — that's the actual
          operational data needed to do the job. */}
      <div className={statGrid}>
        <div className={statTile}>
          <div className={statLabel}>Purchase orders</div>
          <div className={statValueClass()}>{purchaseOrders.length}</div>
        </div>
        {user.isMainAccount && (
          <>
            <div className={statTile}>
              <div className={statLabel}>Amount owed</div>
              <div className={statValueClass(totalOwed > 0 ? "red" : "green")}>
                AED {formatMoney(totalOwed)}
              </div>
            </div>
            <div className={statTile}>
              <div className={statLabel}>Paid this month</div>
              <div className={statValueClass("green")}>AED {formatMoney(totalPaidThisMonth)}</div>
            </div>
          </>
        )}
      </div>

      <form className="flex max-w-md gap-2" action="/purchase-orders" method="get">
        <input
          type="text"
          name="q"
          placeholder="PO number or vendor"
          aria-label="Search purchase orders"
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
            <>No purchase orders match &ldquo;{query}&rdquo;.</>
          ) : (
            <>
              No purchase orders yet.
              {canManage && (
                <>
                  {" "}
                  <Link href="/purchase-orders/new" className={link}>
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
                <th className={thClass}>Vendor</th>
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
                    <Link href={`/purchase-orders/${row.id}`} className={rowLink}>
                      {row.poNumber}
                    </Link>
                  </td>
                  <td className={tdClass}>{row.vendorName}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    {row.orderDate.toLocaleDateString("en-AE", {
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
