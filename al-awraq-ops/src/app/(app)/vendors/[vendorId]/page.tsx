import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/appAuth";
import { updateVendorAction } from "@/actions/vendors";
import { VendorForm } from "@/components/forms/VendorForm";
import { DeleteVendorButton } from "@/components/forms/DeleteVendorButton";
import { computeInvoiceTotals, formatMoney, toNum } from "@/lib/invoiceMath";
import {
  pageWrap,
  pageHeader,
  pageTitle,
  pageSubtitle,
  eyebrow,
  backLink,
  sectionTitle,
  sectionHeader,
  hintText,
  cardClass,
  tableWrap,
  table,
  thClass,
  thNum,
  tdClass,
  tdNum,
  trHover,
  rowLink,
  badgeClass,
  statusLabel,
  emptyState,
  dlList,
  dlRow,
  dlTerm,
  dlValue,
  statGrid,
  statTile,
  statLabel,
  statValueClass,
} from "@/lib/ui/classNames";

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}) {
  const user = await requirePermission("canViewPurchaseOrders");
  const canManage = user.isMainAccount || user.canManagePurchaseOrders;
  const { vendorId } = await params;

  const vendor = await db.vendor.findUnique({
    where: { id: vendorId },
    include: {
      purchaseOrders: {
        include: { items: true },
        orderBy: { orderDate: "desc" },
      },
    },
  });

  if (!vendor) {
    notFound();
  }

  const poRows = vendor.purchaseOrders.map((po) => {
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
      grandTotal: totals.grandTotal,
      balanceDue: totals.balanceDue,
      status: totals.status,
    };
  });

  const totalBalance = poRows.reduce((sum, row) => sum + row.balanceDue, 0);

  const statusTone = (status: string): "green" | "amber" | "neutral" =>
    status === "PAID" ? "green" : status === "PARTIAL" ? "amber" : "neutral";

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-AE", { year: "numeric", month: "short", day: "numeric" });

  return (
    <main className={pageWrap}>
      <div className="flex flex-col gap-4">
        <Link href="/vendors" className={`${backLink} self-start`}>
          ← Vendors
        </Link>
        <div className={pageHeader}>
          <div>
            <p className={eyebrow}>Vendor</p>
            <h1 className={`${pageTitle} mt-1`}>{vendor.name}</h1>
            <p className={pageSubtitle}>Vendor since {formatDate(vendor.createdAt)}</p>
          </div>
        </div>
      </div>

      <div className={statGrid}>
        <div className={statTile}>
          <div className={statLabel}>Purchase orders</div>
          <div className={statValueClass()}>{poRows.length}</div>
        </div>
        {user.isMainAccount && (
          <div className={statTile}>
            <div className={statLabel}>Amount owed</div>
            <div className={statValueClass(totalBalance > 0 ? "red" : "green")}>
              AED {formatMoney(totalBalance)}
            </div>
          </div>
        )}
      </div>

      <section className={`${cardClass} max-w-2xl`}>
        <h2 className={`${sectionTitle} mb-5`}>Details</h2>
        {canManage ? (
          <VendorForm
            mode="edit"
            action={updateVendorAction.bind(null, vendor.id)}
            defaultValues={{
              name: vendor.name,
              address: vendor.address ?? "",
              contact: vendor.contact ?? "",
              email: vendor.email ?? "",
              notes: vendor.notes ?? "",
            }}
          />
        ) : (
          <dl className={dlList}>
            <div className={dlRow}>
              <dt className={dlTerm}>Address</dt>
              <dd className={dlValue}>{vendor.address || "—"}</dd>
            </div>
            <div className={dlRow}>
              <dt className={dlTerm}>Contact</dt>
              <dd className={dlValue}>{vendor.contact || "—"}</dd>
            </div>
            {vendor.email && (
              <div className={dlRow}>
                <dt className={dlTerm}>Email</dt>
                <dd className={dlValue}>{vendor.email}</dd>
              </div>
            )}
            {vendor.notes && (
              <div className={dlRow}>
                <dt className={dlTerm}>Notes</dt>
                <dd className={`${dlValue} whitespace-pre-line`}>{vendor.notes}</dd>
              </div>
            )}
          </dl>
        )}
      </section>

      <section>
        <div className={sectionHeader}>
          <h2 className={sectionTitle}>Purchase orders</h2>
        </div>
        {poRows.length === 0 ? (
          <div className={emptyState}>No purchase orders for this vendor yet.</div>
        ) : (
          <div className={tableWrap}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={thClass}>Number</th>
                  <th className={thClass}>Date</th>
                  <th className={thNum}>Total</th>
                  <th className={thNum}>Balance</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {poRows.map((row) => (
                  <tr key={row.id} className={trHover}>
                    <td className={tdClass}>
                      <Link href={`/purchase-orders/${row.id}`} className={rowLink}>
                        {row.poNumber}
                      </Link>
                    </td>
                    <td className={tdClass}>{formatDate(row.orderDate)}</td>
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
      </section>

      {canManage && (
        <section
          className={`${cardClass} flex max-w-2xl flex-wrap items-center justify-between gap-4`}
        >
          <div>
            <h2 className={sectionTitle}>Delete vendor</h2>
            <p className={`${hintText} mt-1`}>
              Only possible while the vendor has no purchase orders.
            </p>
          </div>
          <DeleteVendorButton vendorId={vendor.id} />
        </section>
      )}
    </main>
  );
}
