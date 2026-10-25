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
import { updateInvoiceAction, recordPaymentAction, deleteInvoiceAction } from "@/actions/invoices";
import { InvoiceForm, type InvoiceFormValues } from "@/components/forms/InvoiceForm";
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
 * `(formData) => void | Promise<void>`) is satisfied — recordPaymentAction
 * itself returns `InvoiceActionState` so a would-be caller using
 * useActionState could surface its `{error}`, but these two quick-action
 * forms here are plain, no client JS needed.
 */
async function submitPayment(invoiceId: string, formData: FormData): Promise<void> {
  "use server";
  await recordPaymentAction(invoiceId, formData);
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

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requirePermission("canViewInvoices");
  const canManage = user.isMainAccount || user.canManageInvoices;

  const { invoiceId } = await params;
  const { edit } = await searchParams;
  const isEditing = edit === "1" && canManage;

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: { orderBy: { sortOrder: "asc" } }, customer: true },
  });

  if (!invoice) {
    notFound();
  }

  const plainItems = invoice.items.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: toNum(item.quantity),
    unit: item.unit,
    unitPrice: toNum(item.unitPrice),
    retentionAmount: item.retentionAmount ? toNum(item.retentionAmount) : null,
  }));

  const adjustments = {
    taxRatePercent: toNum(invoice.taxRatePercent),
    discountAmount: invoice.discountAmount ? toNum(invoice.discountAmount) : null,
    shipmentAmount: invoice.shipmentAmount ? toNum(invoice.shipmentAmount) : null,
    stampDutyAmount: invoice.stampDutyAmount ? toNum(invoice.stampDutyAmount) : null,
    amountPaid: toNum(invoice.amountPaid),
  };

  const totals = computeInvoiceTotals(plainItems, adjustments);

  // Previous balance is an aggregate rollup across this customer's other
  // invoices — never shown to a non-main account (see the User model
  // comment in schema.prisma), so skip the extra query entirely for them.
  let previousBalance = 0;
  if (user.isMainAccount) {
    const otherInvoices = await db.invoice.findMany({
      where: { customerId: invoice.customerId, id: { not: invoiceId } },
      include: { items: true },
    });
    previousBalance = computePreviousBalance(
      otherInvoices.map((inv) => ({
        items: inv.items.map((item) => ({
          quantity: toNum(item.quantity),
          unitPrice: toNum(item.unitPrice),
          retentionAmount: item.retentionAmount ? toNum(item.retentionAmount) : null,
        })),
        adjustments: {
          taxRatePercent: toNum(inv.taxRatePercent),
          discountAmount: inv.discountAmount ? toNum(inv.discountAmount) : null,
          shipmentAmount: inv.shipmentAmount ? toNum(inv.shipmentAmount) : null,
          stampDutyAmount: inv.stampDutyAmount ? toNum(inv.stampDutyAmount) : null,
          amountPaid: toNum(inv.amountPaid),
        },
      })),
    );
  }

  const customers = await db.customer.findMany({ orderBy: { name: "asc" } });
  const plainCustomers = customers.map((c) => ({
    id: c.id,
    name: c.name,
    address: c.address,
    contact: c.contact,
  }));

  const editFormValues: InvoiceFormValues = {
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: toDateInputValue(invoice.invoiceDate),
    dueDate: toDateInputValue(invoice.dueDate),
    poNumber: invoice.poNumber ?? "",
    paymentMethod: invoice.paymentMethod ?? "",
    salesperson: invoice.salesperson ?? "",
    notes: invoice.notes ?? "",
    taxRatePercent: adjustments.taxRatePercent,
    discountAmount: adjustments.discountAmount,
    shipmentAmount: adjustments.shipmentAmount,
    stampDutyAmount: adjustments.stampDutyAmount,
    amountPaid: adjustments.amountPaid,
    customerName: invoice.billingName,
    customerAddress: invoice.billingAddress ?? "",
    customerContact: invoice.billingContact ?? "",
    items: plainItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      retentionAmount: item.retentionAmount,
    })),
  };

  return (
    <main className={pageWrap}>
      <div>
        <Link href="/invoices" className={backLink}>
          ← Invoices
        </Link>
        <div className={`${pageHeader} mt-4`}>
          <div>
            <p className={eyebrow}>Invoice</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className={pageTitle}>{invoice.invoiceNumber}</h1>
              <span className={badgeClass(statusTone(totals.status))}>
                {statusLabel(totals.status)}
              </span>
            </div>
            <p className={pageSubtitle}>
              {invoice.billingName} · {formatDate(invoice.invoiceDate)}
            </p>
          </div>
          <div className={pageActions}>
            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className={btnSecondary}
            >
              Download PDF
            </a>
            {canManage && (
              <Link
                href={isEditing ? `/invoices/${invoice.id}` : `/invoices/${invoice.id}?edit=1`}
                className={btnSecondary}
              >
                {isEditing ? "Cancel edit" : "Edit"}
              </Link>
            )}
          </div>
        </div>
      </div>

      {isEditing ? (
        <InvoiceForm
          mode="edit"
          customers={plainCustomers}
          defaultTaxRatePercent={adjustments.taxRatePercent}
          nextInvoiceNumberDisplay={invoice.invoiceNumber}
          invoice={editFormValues}
          action={updateInvoiceAction.bind(null, invoice.id)}
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
              <h2 className={`${sectionTitle} mb-3`}>Billed to</h2>
              <p className="font-medium text-ink">{invoice.billingName}</p>
              {invoice.billingAddress && (
                <p className={`${mutedText} mt-1`}>{invoice.billingAddress}</p>
              )}
              {invoice.billingContact && <p className={mutedText}>{invoice.billingContact}</p>}
              <p className="mt-4">
                <Link href={`/customers/${invoice.customerId}`} className={link}>
                  View customer
                </Link>
              </p>
            </div>
            <div className={cardClass}>
              <h2 className={`${sectionTitle} mb-2`}>Details</h2>
              <dl className={dlList}>
                <div className={dlRow}>
                  <dt className={dlTerm}>Invoice date</dt>
                  <dd className={dlValue}>{formatDate(invoice.invoiceDate)}</dd>
                </div>
                {invoice.dueDate && (
                  <div className={dlRow}>
                    <dt className={dlTerm}>Due date</dt>
                    <dd className={dlValue}>{formatDate(invoice.dueDate)}</dd>
                  </div>
                )}
                {invoice.poNumber && (
                  <div className={dlRow}>
                    <dt className={dlTerm}>PO number</dt>
                    <dd className={dlValue}>{invoice.poNumber}</dd>
                  </div>
                )}
                {invoice.paymentMethod && (
                  <div className={dlRow}>
                    <dt className={dlTerm}>Payment method</dt>
                    <dd className={dlValue}>{invoice.paymentMethod}</dd>
                  </div>
                )}
                {invoice.salesperson && (
                  <div className={dlRow}>
                    <dt className={dlTerm}>Salesperson</dt>
                    <dd className={dlValue}>{invoice.salesperson}</dd>
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
                    <th className={thNum}>Retention</th>
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
                      <td className={tdNum}>
                        {item.retentionAmount ? `AED ${formatMoney(item.retentionAmount)}` : "—"}
                      </td>
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
                <div className={dlRow}>
                  <dt className={dlTerm}>Stamp duty</dt>
                  <dd className={dlValue}>AED {formatMoney(totals.stampDuty)}</dd>
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
              {invoice.notes && (
                <p className={`${mutedText} mt-4 border-t border-line pt-4`}>{invoice.notes}</p>
              )}
            </div>

            {canManage && (
              <div className={cardClass}>
                <h2 className={`${sectionTitle} mb-4`}>Payment</h2>
                <form
                  action={submitPayment.bind(null, invoice.id)}
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
                <p className={`${hintText} mt-2`}>Enter the total received to date.</p>
                <form action={submitPayment.bind(null, invoice.id)} className="mt-4">
                  <input type="hidden" name="amountPaid" value={totals.grandTotal} />
                  <button type="submit" className={btnSecondary}>
                    Mark paid in full
                  </button>
                </form>

                <div className="mt-6 flex flex-col items-start gap-3 border-t border-line pt-5">
                  <p className={hintText}>Deleting an invoice can&apos;t be undone.</p>
                  <form action={deleteInvoiceAction.bind(null, invoice.id)}>
                    <button type="submit" className={btnDanger}>
                      Delete invoice
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
