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
  updateInquiryAction,
  recordInquiryPaymentAction,
  deleteInquiryAction,
} from "@/actions/inquiries";
import { InquiryForm, type InquiryFormValues } from "@/components/forms/InquiryForm";
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
  link,
  linkDanger,
  btnSecondary,
  inputClass,
  mutedText,
  badgeClass,
  statGrid,
  statTile,
  statLabel,
  statValueClass,
} from "@/lib/ui/classNames";

/**
 * Thin wrapper so the native `<form action={...}>` type (which expects
 * `(formData) => void | Promise<void>`) is satisfied — recordInquiryPaymentAction
 * itself returns `InquiryActionState` so a would-be caller using
 * useActionState could surface its `{error}`, but these two quick-action
 * forms here are plain, no client JS needed.
 */
async function submitPayment(inquiryId: string, formData: FormData): Promise<void> {
  "use server";
  await recordInquiryPaymentAction(inquiryId, formData);
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

function statusTone(status: "UNPAID" | "PARTIAL" | "PAID"): "green" | "blue" | "neutral" {
  if (status === "PAID") return "green";
  if (status === "PARTIAL") return "blue";
  return "neutral";
}

export default async function InquiryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ inquiryId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requirePermission("canViewInquiries");
  const canManage = user.isMainAccount || user.canManageInquiries;

  const { inquiryId } = await params;
  const { edit } = await searchParams;
  const isEditing = edit === "1" && canManage;

  const inquiry = await db.inquiry.findUnique({
    where: { id: inquiryId },
    include: { items: { orderBy: { sortOrder: "asc" } }, customer: true },
  });

  if (!inquiry) {
    notFound();
  }

  const plainItems = inquiry.items.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: toNum(item.quantity),
    unit: item.unit,
    unitPrice: toNum(item.unitPrice),
    retentionAmount: item.retentionAmount ? toNum(item.retentionAmount) : null,
  }));

  const adjustments = {
    taxRatePercent: toNum(inquiry.taxRatePercent),
    discountAmount: inquiry.discountAmount ? toNum(inquiry.discountAmount) : null,
    shipmentAmount: inquiry.shipmentAmount ? toNum(inquiry.shipmentAmount) : null,
    stampDutyAmount: inquiry.stampDutyAmount ? toNum(inquiry.stampDutyAmount) : null,
    amountPaid: toNum(inquiry.amountPaid),
  };

  const totals = computeInvoiceTotals(plainItems, adjustments);

  // Previous balance is an aggregate rollup across this customer's other
  // documents — never shown to a non-main account (see the User model
  // comment in schema.prisma), so skip the extra queries entirely for
  // them. Per the spec, this is a single combined running balance across
  // BOTH the customer's other Inquiries AND their Invoices (same
  // Customer, one shared address book across the B2B/B2C workflows).
  let previousBalance = 0;
  if (user.isMainAccount) {
    const [otherInquiries, otherInvoices] = await Promise.all([
      db.inquiry.findMany({
        where: { customerId: inquiry.customerId, id: { not: inquiryId } },
        include: { items: true },
      }),
      db.invoice.findMany({
        where: { customerId: inquiry.customerId },
        include: { items: true },
      }),
    ]);

    const combined = [
      ...otherInquiries.map((inq) => ({
        items: inq.items.map((item) => ({
          quantity: toNum(item.quantity),
          unitPrice: toNum(item.unitPrice),
          retentionAmount: item.retentionAmount ? toNum(item.retentionAmount) : null,
        })),
        adjustments: {
          taxRatePercent: toNum(inq.taxRatePercent),
          discountAmount: inq.discountAmount ? toNum(inq.discountAmount) : null,
          shipmentAmount: inq.shipmentAmount ? toNum(inq.shipmentAmount) : null,
          stampDutyAmount: inq.stampDutyAmount ? toNum(inq.stampDutyAmount) : null,
          amountPaid: toNum(inq.amountPaid),
        },
      })),
      ...otherInvoices.map((inv) => ({
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
    ];

    previousBalance = computePreviousBalance(combined);
  }

  const customers = await db.customer.findMany({ orderBy: { name: "asc" } });
  const plainCustomers = customers.map((c) => ({
    id: c.id,
    name: c.name,
    address: c.address,
    contact: c.contact,
    companyName: c.companyName,
    businessTrn: c.businessTrn,
    contactPerson: c.contactPerson,
  }));

  const editFormValues: InquiryFormValues = {
    inquiryNumber: inquiry.inquiryNumber,
    inquiryDate: toDateInputValue(inquiry.inquiryDate),
    dueDate: toDateInputValue(inquiry.dueDate),
    poNumber: inquiry.poNumber ?? "",
    paymentMethod: inquiry.paymentMethod ?? "",
    salesperson: inquiry.salesperson ?? "",
    notes: inquiry.notes ?? "",
    taxRatePercent: adjustments.taxRatePercent,
    discountAmount: adjustments.discountAmount,
    shipmentAmount: adjustments.shipmentAmount,
    stampDutyAmount: adjustments.stampDutyAmount,
    amountPaid: adjustments.amountPaid,
    customerName: inquiry.billingName,
    customerAddress: inquiry.billingAddress ?? "",
    customerContact: inquiry.billingContact ?? "",
    customerCompanyName: inquiry.billingCompanyName ?? "",
    customerBusinessTrn: inquiry.billingBusinessTrn ?? "",
    customerContactPerson: inquiry.customer?.contactPerson ?? "",
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/inquiries" className={link}>
            ← Back to inquiries
          </Link>
          <h1 className={`${pageTitle} mt-2`}>Inquiry {inquiry.inquiryNumber}</h1>
          <p className={pageSubtitle}>{inquiry.billingName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={badgeClass(statusTone(totals.status))}>{totals.status}</span>
          <a
            href={`/api/inquiries/${inquiry.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className={btnSecondary}
          >
            Download PDF
          </a>
          {canManage && (
            <Link
              href={isEditing ? `/inquiries/${inquiry.id}` : `/inquiries/${inquiry.id}?edit=1`}
              className={btnSecondary}
            >
              {isEditing ? "Cancel edit" : "Edit"}
            </Link>
          )}
        </div>
      </div>

      {isEditing ? (
        <InquiryForm
          mode="edit"
          customers={plainCustomers}
          defaultTaxRatePercent={adjustments.taxRatePercent}
          nextInquiryNumberDisplay={inquiry.inquiryNumber}
          inquiry={editFormValues}
          action={updateInquiryAction.bind(null, inquiry.id)}
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
              {inquiry.billingCompanyName && (
                <p className="font-medium text-neutral-900">{inquiry.billingCompanyName}</p>
              )}
              <p className={inquiry.billingCompanyName ? mutedText : "font-medium text-neutral-900"}>
                {inquiry.billingName}
              </p>
              {inquiry.billingBusinessTrn && (
                <p className={mutedText}>TRN: {inquiry.billingBusinessTrn}</p>
              )}
              {inquiry.billingAddress && (
                <p className={mutedText}>{inquiry.billingAddress}</p>
              )}
              {inquiry.billingContact && <p className={mutedText}>{inquiry.billingContact}</p>}
              <p className="mt-2">
                <Link href={`/customers/${inquiry.customerId}`} className={link}>
                  View customer
                </Link>
              </p>
            </div>
            <div className={cardClass}>
              <h2 className={`${sectionTitle} mb-3`}>Inquiry info</h2>
              <dl className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between">
                  <dt className={mutedText}>Inquiry date</dt>
                  <dd>{formatDate(inquiry.inquiryDate)}</dd>
                </div>
                {inquiry.dueDate && (
                  <div className="flex justify-between">
                    <dt className={mutedText}>Due date</dt>
                    <dd>{formatDate(inquiry.dueDate)}</dd>
                  </div>
                )}
                {inquiry.poNumber && (
                  <div className="flex justify-between">
                    <dt className={mutedText}>PO number</dt>
                    <dd>{inquiry.poNumber}</dd>
                  </div>
                )}
                {inquiry.paymentMethod && (
                  <div className="flex justify-between">
                    <dt className={mutedText}>Payment method</dt>
                    <dd>{inquiry.paymentMethod}</dd>
                  </div>
                )}
                {inquiry.salesperson && (
                  <div className="flex justify-between">
                    <dt className={mutedText}>Salesperson</dt>
                    <dd>{inquiry.salesperson}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <div>
            <h2 className={`${sectionTitle} mb-3`}>Items</h2>
            <div className={tableWrap}>
              <table className={table}>
                <thead>
                  <tr>
                    <th className={thClass}>Sr</th>
                    <th className={thClass}>Description</th>
                    <th className={thClass}>Qty</th>
                    <th className={thClass}>Unit</th>
                    <th className={thClass}>Unit price</th>
                    <th className={thClass}>Retention</th>
                    <th className={thClass}>Subtotal</th>
                    <th className={thClass}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {plainItems.map((item, index) => (
                    <tr key={item.id}>
                      <td className={tdClass}>{index + 1}</td>
                      <td className={tdClass}>{item.description}</td>
                      <td className={tdClass}>{item.quantity}</td>
                      <td className={tdClass}>{item.unit || "—"}</td>
                      <td className={tdClass}>AED {formatMoney(item.unitPrice)}</td>
                      <td className={tdClass}>
                        {item.retentionAmount ? `AED ${formatMoney(item.retentionAmount)}` : "—"}
                      </td>
                      <td className={tdClass}>AED {formatMoney(lineSubtotal(item))}</td>
                      <td className={tdClass}>
                        AED {formatMoney(lineTotal(item, adjustments.taxRatePercent))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className={`${cardClass} max-w-md`}>
              <h2 className={`${sectionTitle} mb-3`}>Totals</h2>
              <dl className="flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className={mutedText}>Subtotal</dt>
                  <dd>AED {formatMoney(totals.itemsSubtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className={mutedText}>Discount</dt>
                  <dd>AED {formatMoney(totals.discount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className={mutedText}>Taxable</dt>
                  <dd>AED {formatMoney(totals.taxableBase)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className={mutedText}>VAT {adjustments.taxRatePercent}%</dt>
                  <dd>AED {formatMoney(totals.taxAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className={mutedText}>Shipment</dt>
                  <dd>AED {formatMoney(totals.shipment)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className={mutedText}>Stamp duty</dt>
                  <dd>AED {formatMoney(totals.stampDuty)}</dd>
                </div>
                <div className="mt-1 flex justify-between border-t border-neutral-200 pt-1.5 text-base font-semibold">
                  <dt>Total</dt>
                  <dd>AED {formatMoney(totals.grandTotal)}</dd>
                </div>
                {user.isMainAccount && (
                  <div className="flex justify-between">
                    <dt className={mutedText}>Previous balance</dt>
                    <dd>AED {formatMoney(previousBalance)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className={mutedText}>Paid</dt>
                  <dd>AED {formatMoney(totals.amountPaid)}</dd>
                </div>
                <div className="flex justify-between font-semibold">
                  <dt>Balance due</dt>
                  <dd>AED {formatMoney(totals.balanceDue)}</dd>
                </div>
              </dl>
              {inquiry.notes && <p className={`${mutedText} mt-3`}>{inquiry.notes}</p>}
            </div>

            {canManage && (
              <div className={cardClass}>
                <h2 className={`${sectionTitle} mb-3`}>Payment</h2>
                <form
                  action={submitPayment.bind(null, inquiry.id)}
                  className="flex flex-wrap items-end gap-2"
                >
                  <div className={`flex flex-col gap-1.5`}>
                    <label className="text-sm font-medium text-neutral-700" htmlFor="amountPaid">
                      Amount paid
                    </label>
                    <input
                      id="amountPaid"
                      name="amountPaid"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={totals.amountPaid}
                      className={`${inputClass} w-36`}
                    />
                  </div>
                  <button type="submit" className={btnSecondary}>
                    Record payment
                  </button>
                </form>
                <form action={submitPayment.bind(null, inquiry.id)} className="mt-2">
                  <input type="hidden" name="amountPaid" value={totals.grandTotal} />
                  <button type="submit" className={btnSecondary}>
                    Mark paid in full
                  </button>
                </form>

                <div className="mt-6 border-t border-neutral-200 pt-4">
                  <h3 className="mb-2 text-sm font-semibold text-neutral-900">Danger zone</h3>
                  <form action={deleteInquiryAction.bind(null, inquiry.id)}>
                    <button type="submit" className={linkDanger}>
                      Delete inquiry
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
