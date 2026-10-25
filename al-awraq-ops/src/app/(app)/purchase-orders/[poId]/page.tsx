import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/appAuth";
import {
  toNum,
  formatMoney,
  computeInvoiceTotals,
  computePreviousBalance,
  lineSubtotal,
  lineTotal,
} from "@/lib/invoiceMath";
import {
  updatePurchaseOrderAction,
  recordPurchaseOrderPaymentAction,
  deletePurchaseOrderAction,
} from "@/actions/purchaseOrders";
import {
  PurchaseOrderForm,
  type PurchaseOrderFormValues,
} from "@/components/forms/PurchaseOrderForm";
import {
  pageWrap,
  pageHeader,
  pageActions,
  pageTitle,
  pageSubtitle,
  eyebrow,
  backLink,
  sectionTitle,
  cardClass,
  tableWrap,
  table,
  thClass,
  thNum,
  tdClass,
  tdNum,
  link,
  btnSecondary,
  btnDanger,
  inputClass,
  labelClass,
  fieldWrap,
  mutedText,
  hintText,
  badgeClass,
  statusLabel,
  statGrid,
  statTile,
  statLabel,
  statValueClass,
  dlList,
  dlRow,
  dlTerm,
  dlValue,
  dlTotalRow,
} from "@/lib/ui/classNames";

/**
 * Thin wrapper so the native `<form action={...}>` type (which expects
 * `(formData) => void | Promise<void>`) is satisfied — mirrors
 * submitPayment in src/app/(app)/invoices/[invoiceId]/page.tsx.
 */
async function submitPayment(poId: string, formData: FormData): Promise<void> {
  "use server";
  await recordPurchaseOrderPaymentAction(poId, formData);
}

function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-AE", { year: "numeric", month: "short", day: "numeric" });
}

function statusTone(status: "UNPAID" | "PARTIAL" | "PAID"): "green" | "amber" | "neutral" {
  if (status === "PAID") return "green";
  if (status === "PARTIAL") return "amber";
  return "neutral";
}

export default async function PurchaseOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ poId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requirePermission("canViewPurchaseOrders");
  const canManage = user.isMainAccount || user.canManagePurchaseOrders;

  const { poId } = await params;
  const { edit } = await searchParams;
  const isEditing = edit === "1" && canManage;

  const purchaseOrder = await db.purchaseOrder.findUnique({
    where: { id: poId },
    include: { items: { orderBy: { sortOrder: "asc" } }, vendor: true },
  });

  if (!purchaseOrder) {
    notFound();
  }

  const plainItems = purchaseOrder.items.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: toNum(item.quantity),
    unit: item.unit,
    unitPrice: toNum(item.unitPrice),
  }));

  const adjustments = {
    taxRatePercent: toNum(purchaseOrder.taxRatePercent),
    discountAmount: purchaseOrder.discountAmount ? toNum(purchaseOrder.discountAmount) : null,
    shipmentAmount: purchaseOrder.shipmentAmount ? toNum(purchaseOrder.shipmentAmount) : null,
    amountPaid: toNum(purchaseOrder.amountPaid),
  };

  const totals = computeInvoiceTotals(plainItems, adjustments);

  // Previous balance is an aggregate rollup across this vendor's other
  // purchase orders — never shown to a non-main account (see the User
  // model comment in schema.prisma), so skip the extra query entirely for
  // them.
  let previousBalance = 0;
  if (user.isMainAccount) {
    const otherPos = await db.purchaseOrder.findMany({
      where: { vendorId: purchaseOrder.vendorId, id: { not: poId } },
      include: { items: true },
    });
    previousBalance = computePreviousBalance(
      otherPos.map((po) => ({
        items: po.items.map((item) => ({
          quantity: toNum(item.quantity),
          unitPrice: toNum(item.unitPrice),
        })),
        adjustments: {
          taxRatePercent: toNum(po.taxRatePercent),
          discountAmount: po.discountAmount ? toNum(po.discountAmount) : null,
          shipmentAmount: po.shipmentAmount ? toNum(po.shipmentAmount) : null,
          amountPaid: toNum(po.amountPaid),
        },
      })),
    );
  }

  const vendors = await db.vendor.findMany({ orderBy: { name: "asc" } });
  const plainVendors = vendors.map((v) => ({
    id: v.id,
    name: v.name,
    address: v.address,
    contact: v.contact,
  }));

  const editFormValues: PurchaseOrderFormValues = {
    poNumber: purchaseOrder.poNumber,
    orderDate: toDateInputValue(purchaseOrder.orderDate),
    expectedDate: toDateInputValue(purchaseOrder.expectedDate),
    notes: purchaseOrder.notes ?? "",
    taxRatePercent: adjustments.taxRatePercent,
    discountAmount: adjustments.discountAmount,
    shipmentAmount: adjustments.shipmentAmount,
    amountPaid: adjustments.amountPaid,
    vendorName: purchaseOrder.billingVendorName,
    vendorAddress: purchaseOrder.billingVendorAddress ?? "",
    vendorContact: purchaseOrder.billingVendorContact ?? "",
    items: plainItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
    })),
  };

  return (
    <main className={pageWrap}>
      <div>
        <Link href="/purchase-orders" className={backLink}>
          ← Purchase orders
        </Link>
        <div className={`${pageHeader} mt-4`}>
          <div>
            <p className={eyebrow}>Purchase order</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className={pageTitle}>{purchaseOrder.poNumber}</h1>
              <span className={badgeClass(statusTone(totals.status))}>
                {statusLabel(totals.status)}
              </span>
            </div>
            <p className={pageSubtitle}>
              {purchaseOrder.billingVendorName} · {formatDate(purchaseOrder.orderDate)}
            </p>
          </div>
          <div className={pageActions}>
            <a
              href={`/api/purchase-orders/${purchaseOrder.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className={btnSecondary}
            >
              Download PDF
            </a>
            {canManage && (
              <Link
                href={
                  isEditing
                    ? `/purchase-orders/${purchaseOrder.id}`
                    : `/purchase-orders/${purchaseOrder.id}?edit=1`
                }
                className={btnSecondary}
              >
                {isEditing ? "Cancel edit" : "Edit"}
              </Link>
            )}
          </div>
        </div>
      </div>

      {isEditing ? (
        <PurchaseOrderForm
          mode="edit"
          vendors={plainVendors}
          defaultTaxRatePercent={adjustments.taxRatePercent}
          nextPoNumberDisplay={purchaseOrder.poNumber}
          purchaseOrder={editFormValues}
          action={updatePurchaseOrderAction.bind(null, purchaseOrder.id)}
        />
      ) : (
        <>
          <div className={statGrid}>
            {user.isMainAccount && (
              <div className={statTile}>
                <div className={statLabel}>Previous balance</div>
                <div className={statValueClass(previousBalance > 0 ? "red" : "neutral")}>
                  AED {formatMoney(previousBalance)}
                </div>
              </div>
            )}
            <div className={statTile}>
              <div className={statLabel}>Total</div>
              <div className={statValueClass()}>AED {formatMoney(totals.grandTotal)}</div>
            </div>
            <div className={statTile}>
              <div className={statLabel}>Balance due</div>
              <div className={statValueClass(totals.balanceDue > 0 ? "red" : "green")}>
                AED {formatMoney(totals.balanceDue)}
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className={cardClass}>
              <h2 className={`${sectionTitle} mb-3`}>Vendor</h2>
              <p className="font-medium text-ink">{purchaseOrder.billingVendorName}</p>
              {purchaseOrder.billingVendorAddress && (
                <p className={`${mutedText} mt-1`}>{purchaseOrder.billingVendorAddress}</p>
              )}
              {purchaseOrder.billingVendorContact && (
                <p className={mutedText}>{purchaseOrder.billingVendorContact}</p>
              )}
              <p className="mt-4">
                <Link href={`/vendors/${purchaseOrder.vendorId}`} className={link}>
                  View vendor
                </Link>
              </p>
            </div>
            <div className={cardClass}>
              <h2 className={`${sectionTitle} mb-2`}>Details</h2>
              <dl className={dlList}>
                <div className={dlRow}>
                  <dt className={dlTerm}>Order date</dt>
                  <dd className={dlValue}>{formatDate(purchaseOrder.orderDate)}</dd>
                </div>
                {purchaseOrder.expectedDate && (
                  <div className={dlRow}>
                    <dt className={dlTerm}>Expected date</dt>
                    <dd className={dlValue}>{formatDate(purchaseOrder.expectedDate)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <section>
            <h2 className={`${sectionTitle} mb-3`}>Line items</h2>
            <div className={tableWrap}>
              <table className={table}>
                <thead>
                  <tr>
                    <th className={thNum}>#</th>
                    <th className={thClass}>Description</th>
                    <th className={thNum}>Qty</th>
                    <th className={thClass}>Unit</th>
                    <th className={thNum}>Unit price</th>
                    <th className={thNum}>Subtotal</th>
                    <th className={thNum}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {plainItems.map((item, index) => (
                    <tr key={item.id}>
                      <td className={tdNum}>
                        <span className="text-muted">{index + 1}</span>
                      </td>
                      <td className={tdClass}>{item.description}</td>
                      <td className={tdNum}>{item.quantity}</td>
                      <td className={tdClass}>{item.unit || "—"}</td>
                      <td className={tdNum}>AED {formatMoney(item.unitPrice)}</td>
                      <td className={tdNum}>AED {formatMoney(lineSubtotal(item))}</td>
                      <td className={tdNum}>
                        AED {formatMoney(lineTotal(item, adjustments.taxRatePercent))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid items-start gap-6 sm:grid-cols-2">
            <div className={cardClass}>
              <h2 className={`${sectionTitle} mb-2`}>Totals</h2>
              <dl className={dlList}>
                <div className={dlRow}>
                  <dt className={dlTerm}>Subtotal</dt>
                  <dd className={dlValue}>AED {formatMoney(totals.itemsSubtotal)}</dd>
                </div>
                <div className={dlRow}>
                  <dt className={dlTerm}>Discount</dt>
                  <dd className={dlValue}>AED {formatMoney(totals.discount)}</dd>
                </div>
                <div className={dlRow}>
                  <dt className={dlTerm}>Taxable</dt>
                  <dd className={dlValue}>AED {formatMoney(totals.taxableBase)}</dd>
                </div>
                <div className={dlRow}>
                  <dt className={dlTerm}>VAT {adjustments.taxRatePercent}%</dt>
                  <dd className={dlValue}>AED {formatMoney(totals.taxAmount)}</dd>
                </div>
                <div className={dlRow}>
                  <dt className={dlTerm}>Shipment</dt>
                  <dd className={dlValue}>AED {formatMoney(totals.shipment)}</dd>
                </div>
              </dl>
              <dl className={dlList}>
                <div className={dlTotalRow}>
                  <dt>Total</dt>
                  <dd className="tabular-nums">AED {formatMoney(totals.grandTotal)}</dd>
                </div>
                {user.isMainAccount && (
                  <div className={dlRow}>
                    <dt className={dlTerm}>Previous balance</dt>
                    <dd className={dlValue}>AED {formatMoney(previousBalance)}</dd>
                  </div>
                )}
                <div className={dlRow}>
                  <dt className={dlTerm}>Paid</dt>
                  <dd className={dlValue}>AED {formatMoney(totals.amountPaid)}</dd>
                </div>
                <div className={dlRow}>
                  <dt className="font-semibold text-ink">Balance due</dt>
                  <dd className="text-right font-semibold text-ink tabular-nums">
                    AED {formatMoney(totals.balanceDue)}
                  </dd>
                </div>
              </dl>
              {purchaseOrder.notes && (
                <p className={`${mutedText} mt-4 border-t border-line pt-4`}>
                  {purchaseOrder.notes}
                </p>
              )}
            </div>

            {canManage && (
              <div className={cardClass}>
                <h2 className={`${sectionTitle} mb-4`}>Payment</h2>
                <form
                  action={submitPayment.bind(null, purchaseOrder.id)}
                  className="flex flex-wrap items-end gap-2"
                >
                  <div className={fieldWrap}>
                    <label className={labelClass} htmlFor="amountPaid">
                      Amount paid (AED)
                    </label>
                    <input
                      id="amountPaid"
                      name="amountPaid"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={totals.amountPaid}
                      className={`${inputClass} w-40 text-right`}
                    />
                  </div>
                  <button type="submit" className={btnSecondary}>
                    Record payment
                  </button>
                </form>
                <p className={`${hintText} mt-2`}>Enter the total paid to date.</p>
                <form action={submitPayment.bind(null, purchaseOrder.id)} className="mt-4">
                  <input type="hidden" name="amountPaid" value={totals.grandTotal} />
                  <button type="submit" className={btnSecondary}>
                    Mark paid in full
                  </button>
                </form>

                <div className="mt-6 flex flex-col items-start gap-3 border-t border-line pt-5">
                  <p className={hintText}>Deleting a purchase order can&apos;t be undone.</p>
                  <form action={deletePurchaseOrderAction.bind(null, purchaseOrder.id)}>
                    <button type="submit" className={btnDanger}>
                      Delete purchase order
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
