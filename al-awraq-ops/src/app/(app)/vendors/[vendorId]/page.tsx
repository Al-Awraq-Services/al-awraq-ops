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
  pageTitle,
  pageSubtitle,
  sectionTitle,
  cardClass,
  tableWrap,
  table,
  thClass,
  tdClass,
  trHover,
  link,
  badgeClass,
  mutedText,
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

  const statusTone = (status: string): "green" | "blue" | "red" =>
    status === "PAID" ? "green" : status === "PARTIAL" ? "blue" : "red";

  return (
    <main className={pageWrap}>
      <div>
        <Link href="/vendors" className={link}>
          ← Back to vendors
        </Link>
        <h1 className={`${pageTitle} mt-2`}>{vendor.name}</h1>
        <p className={pageSubtitle}>
          Vendor since{" "}
          {vendor.createdAt.toLocaleDateString("en-AE", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
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

      <div className={`${cardClass} max-w-xl`}>
        <h2 className={`${sectionTitle} mb-4`}>Details</h2>
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
          <dl className="flex flex-col gap-2 text-sm">
            <div>
              <dt className={mutedText}>Address</dt>
              <dd>{vendor.address || "—"}</dd>
            </div>
            <div>
              <dt className={mutedText}>Contact</dt>
              <dd>{vendor.contact || "—"}</dd>
            </div>
            {vendor.email && (
              <div>
                <dt className={mutedText}>Email</dt>
                <dd>{vendor.email}</dd>
              </div>
            )}
            {vendor.notes && (
              <div>
                <dt className={mutedText}>Notes</dt>
                <dd>{vendor.notes}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      <div>
        <h2 className={`${sectionTitle} mb-3`}>Purchase orders</h2>
        {poRows.length === 0 ? (
          <p className={mutedText}>No purchase orders for this vendor yet.</p>
        ) : (
          <div className={tableWrap}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={thClass}>Number</th>
                  <th className={thClass}>Date</th>
                  <th className={thClass}>Total</th>
                  <th className={thClass}>Balance</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {poRows.map((row) => (
                  <tr key={row.id} className={trHover}>
                    <td className={tdClass}>
                      <Link href={`/purchase-orders/${row.id}`} className={link}>
                        {row.poNumber}
                      </Link>
                    </td>
                    <td className={tdClass}>
                      {row.orderDate.toLocaleDateString("en-AE", {
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
      </div>

      {canManage && (
        <div className={cardClass}>
          <h2 className={`${sectionTitle} mb-3`}>Danger zone</h2>
          <p className={`${mutedText} mb-3`}>
            A vendor with existing purchase orders cannot be deleted.
          </p>
          <DeleteVendorButton vendorId={vendor.id} />
        </div>
      )}
    </main>
  );
}
