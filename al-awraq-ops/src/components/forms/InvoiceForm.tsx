"use client";

import { useActionState, useState } from "react";
import type { InvoiceActionState } from "@/actions/invoices";
import { CustomerCombobox, type CustomerOption } from "@/components/forms/CustomerCombobox";
import {
  btnPrimary,
  btnSecondary,
  inputClass,
  labelClass,
  fieldWrap,
  errorText,
  sectionTitle,
  cardClass,
  tableWrap,
  table,
  thClass,
  tdClass,
  linkDanger,
  mutedText,
} from "@/lib/ui/classNames";

type ItemRow = {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  retentionAmount: string;
};

const emptyRow: ItemRow = { description: "", quantity: "1", unit: "", unitPrice: "0", retentionAmount: "" };

/**
 * Plain data shape for edit mode — all Decimal fields must already be
 * converted to `number` and all dates to "yyyy-mm-dd" strings by the
 * caller (the [invoiceId] detail page), since Decimal/Date objects can't
 * cross the Server → Client Component boundary.
 */
export type InvoiceFormValues = {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  poNumber: string;
  paymentMethod: string;
  salesperson: string;
  notes: string;
  taxRatePercent: number;
  discountAmount: number | null;
  shipmentAmount: number | null;
  stampDutyAmount: number | null;
  amountPaid: number;
  customerName: string;
  customerAddress: string;
  customerContact: string;
  items: {
    description: string;
    quantity: number;
    unit: string | null;
    unitPrice: number;
    retentionAmount: number | null;
  }[];
};

type InvoiceFormAction = (
  prevState: InvoiceActionState,
  formData: FormData,
) => Promise<InvoiceActionState>;

// Duplicated line-item arithmetic (same formulas as src/lib/invoiceMath.ts:
// lineSubtotal / lineTotal) so the totals shown here update live as the
// user types, before anything is submitted. The server independently
// re-validates and recomputes the authoritative totals via invoiceMath.ts
// on save — this copy is display-only.
function rowSubtotal(row: ItemRow): number {
  const qty = Number(row.quantity) || 0;
  const price = Number(row.unitPrice) || 0;
  const retention = Number(row.retentionAmount) || 0;
  return qty * price - retention;
}

function rowTotal(row: ItemRow, taxRatePercent: number): number {
  return rowSubtotal(row) * (1 + taxRatePercent / 100);
}

function money(n: number): string {
  return n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function InvoiceForm({
  mode,
  customers,
  defaultTaxRatePercent,
  nextInvoiceNumberDisplay,
  invoice,
  action,
}: {
  mode: "create" | "edit";
  customers: CustomerOption[];
  defaultTaxRatePercent: number;
  nextInvoiceNumberDisplay: string;
  invoice?: InvoiceFormValues;
  action: InvoiceFormAction;
}) {
  const [state, formAction, pending] = useActionState<InvoiceActionState, FormData>(
    action,
    undefined,
  );

  const [items, setItems] = useState<ItemRow[]>(
    invoice && invoice.items.length > 0
      ? invoice.items.map((item) => ({
          description: item.description,
          quantity: String(item.quantity),
          unit: item.unit ?? "",
          unitPrice: String(item.unitPrice),
          retentionAmount: item.retentionAmount ? String(item.retentionAmount) : "",
        }))
      : [emptyRow],
  );

  const [taxRatePercent, setTaxRatePercent] = useState(
    String(invoice?.taxRatePercent ?? defaultTaxRatePercent),
  );

  const [showDiscount, setShowDiscount] = useState(Boolean(invoice?.discountAmount));
  const [discountAmount, setDiscountAmount] = useState(
    invoice?.discountAmount != null ? String(invoice.discountAmount) : "",
  );
  const [showShipment, setShowShipment] = useState(Boolean(invoice?.shipmentAmount));
  const [shipmentAmount, setShipmentAmount] = useState(
    invoice?.shipmentAmount != null ? String(invoice.shipmentAmount) : "",
  );
  const [showStampDuty, setShowStampDuty] = useState(Boolean(invoice?.stampDutyAmount));
  const [stampDutyAmount, setStampDutyAmount] = useState(
    invoice?.stampDutyAmount != null ? String(invoice.stampDutyAmount) : "",
  );

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyRow]);
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  const rate = Number(taxRatePercent) || 0;
  const itemsSubtotal = items.reduce((sum, row) => sum + rowSubtotal(row), 0);
  const discount = Number(discountAmount) || 0;
  const taxableBase = itemsSubtotal - discount;
  const taxAmount = taxableBase * (rate / 100);
  const shipment = Number(shipmentAmount) || 0;
  const stampDuty = Number(stampDutyAmount) || 0;
  const grandTotal = taxableBase + taxAmount + shipment + stampDuty;
  const amountPaid = invoice?.amountPaid ?? 0;
  const balanceDue = grandTotal - amountPaid;

  const itemsJson = JSON.stringify(
    items.map((row) => ({
      description: row.description,
      quantity: Number(row.quantity) || 0,
      unit: row.unit || undefined,
      unitPrice: Number(row.unitPrice) || 0,
      retentionAmount: row.retentionAmount ? Number(row.retentionAmount) : undefined,
    })),
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <div className={cardClass}>
        <h2 className={`${sectionTitle} mb-4`}>Customer</h2>
        <CustomerCombobox
          customers={customers}
          defaultValues={{
            name: invoice?.customerName ?? "",
            address: invoice?.customerAddress ?? "",
            contact: invoice?.customerContact ?? "",
          }}
        />
      </div>

      <div className={cardClass}>
        <h2 className={`${sectionTitle} mb-4`}>Invoice details</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className={fieldWrap}>
            <label className={labelClass} htmlFor="invoiceNumber">
              Invoice number
            </label>
            <input
              id="invoiceNumber"
              name="invoiceNumber"
              type="text"
              required
              defaultValue={invoice?.invoiceNumber ?? nextInvoiceNumberDisplay}
              className={inputClass}
            />
          </div>
          <div className={fieldWrap}>
            <label className={labelClass} htmlFor="invoiceDate">
              Invoice date
            </label>
            <input
              id="invoiceDate"
              name="invoiceDate"
              type="date"
              required
              defaultValue={invoice?.invoiceDate ?? today}
              className={inputClass}
            />
          </div>
          <div className={fieldWrap}>
            <label className={labelClass} htmlFor="dueDate">
              Due date
            </label>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              defaultValue={invoice?.dueDate ?? ""}
              className={inputClass}
            />
          </div>
          <div className={fieldWrap}>
            <label className={labelClass} htmlFor="poNumber">
              PO number
            </label>
            <input
              id="poNumber"
              name="poNumber"
              type="text"
              defaultValue={invoice?.poNumber ?? ""}
              className={inputClass}
            />
          </div>
          <div className={fieldWrap}>
            <label className={labelClass} htmlFor="paymentMethod">
              Payment method
            </label>
            <input
              id="paymentMethod"
              name="paymentMethod"
              type="text"
              list="payment-methods"
              defaultValue={invoice?.paymentMethod ?? ""}
              className={inputClass}
            />
            <datalist id="payment-methods">
              <option value="Cash" />
              <option value="Cheque" />
              <option value="Bank Transfer" />
              <option value="Card" />
            </datalist>
          </div>
          <div className={fieldWrap}>
            <label className={labelClass} htmlFor="salesperson">
              Salesperson
            </label>
            <input
              id="salesperson"
              name="salesperson"
              type="text"
              defaultValue={invoice?.salesperson ?? ""}
              className={inputClass}
            />
          </div>
          <div className={fieldWrap}>
            <label className={labelClass} htmlFor="taxRatePercent">
              Tax rate (%)
            </label>
            <input
              id="taxRatePercent"
              name="taxRatePercent"
              type="number"
              step="0.01"
              min="0"
              required
              value={taxRatePercent}
              onChange={(e) => setTaxRatePercent(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className={sectionTitle}>Line items</h2>
          <button type="button" onClick={addItem} className={btnSecondary}>
            + Add item
          </button>
        </div>
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={thClass}>Description</th>
                <th className={thClass}>Qty</th>
                <th className={thClass}>Unit</th>
                <th className={thClass}>Unit price</th>
                <th className={thClass}>Retention</th>
                <th className={thClass}>Subtotal</th>
                <th className={thClass}>Total</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, index) => (
                <tr key={index}>
                  <td className={tdClass}>
                    <input
                      type="text"
                      required
                      value={row.description}
                      onChange={(e) => updateItem(index, { description: e.target.value })}
                      className={`${inputClass} min-w-[10rem]`}
                    />
                  </td>
                  <td className={tdClass}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={row.quantity}
                      onChange={(e) => updateItem(index, { quantity: e.target.value })}
                      className={`${inputClass} w-20`}
                    />
                  </td>
                  <td className={tdClass}>
                    <input
                      type="text"
                      value={row.unit}
                      onChange={(e) => updateItem(index, { unit: e.target.value })}
                      className={`${inputClass} w-20`}
                    />
                  </td>
                  <td className={tdClass}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={row.unitPrice}
                      onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                      className={`${inputClass} w-28`}
                    />
                  </td>
                  <td className={tdClass}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.retentionAmount}
                      onChange={(e) => updateItem(index, { retentionAmount: e.target.value })}
                      className={`${inputClass} w-24`}
                    />
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>{money(rowSubtotal(row))}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{money(rowTotal(row, rate))}</td>
                  <td className={tdClass}>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className={`${linkDanger} disabled:pointer-events-none disabled:opacity-40`}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <input type="hidden" name="items" value={itemsJson} readOnly />
      </div>

      <div className={cardClass}>
        <div className="mb-4 flex flex-wrap gap-2">
          {!showDiscount && (
            <button type="button" onClick={() => setShowDiscount(true)} className={btnSecondary}>
              + Discount
            </button>
          )}
          {!showShipment && (
            <button type="button" onClick={() => setShowShipment(true)} className={btnSecondary}>
              + Shipment
            </button>
          )}
          {!showStampDuty && (
            <button type="button" onClick={() => setShowStampDuty(true)} className={btnSecondary}>
              + Stamp Duty
            </button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {showDiscount && (
            <div className={fieldWrap}>
              <label className={labelClass} htmlFor="discountAmount">
                Discount
              </label>
              <input
                id="discountAmount"
                name="discountAmount"
                type="number"
                step="0.01"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
          {showShipment && (
            <div className={fieldWrap}>
              <label className={labelClass} htmlFor="shipmentAmount">
                Shipment
              </label>
              <input
                id="shipmentAmount"
                name="shipmentAmount"
                type="number"
                step="0.01"
                min="0"
                value={shipmentAmount}
                onChange={(e) => setShipmentAmount(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
          {showStampDuty && (
            <div className={fieldWrap}>
              <label className={labelClass} htmlFor="stampDutyAmount">
                Stamp duty
              </label>
              <input
                id="stampDutyAmount"
                name="stampDutyAmount"
                type="number"
                step="0.01"
                min="0"
                value={stampDutyAmount}
                onChange={(e) => setStampDutyAmount(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
        </div>

        <div className={fieldWrap + " mt-4"}>
          <label className={labelClass} htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={invoice?.notes ?? "This is a VAT invoice."}
            className={inputClass}
          />
        </div>
      </div>

      <div className={`${cardClass} max-w-md self-end`}>
        <h2 className={`${sectionTitle} mb-3`}>Totals</h2>
        <dl className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between">
            <dt className={mutedText}>Subtotal</dt>
            <dd>AED {money(itemsSubtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className={mutedText}>Discount</dt>
            <dd>AED {money(discount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className={mutedText}>Taxable</dt>
            <dd>AED {money(taxableBase)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className={mutedText}>VAT {rate}%</dt>
            <dd>AED {money(taxAmount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className={mutedText}>Shipment</dt>
            <dd>AED {money(shipment)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className={mutedText}>Stamp duty</dt>
            <dd>AED {money(stampDuty)}</dd>
          </div>
          <div className="mt-1 flex justify-between border-t border-neutral-200 pt-1.5 text-base font-semibold">
            <dt>Total</dt>
            <dd>AED {money(grandTotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className={mutedText}>Paid</dt>
            <dd>AED {money(amountPaid)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Balance due</dt>
            <dd>AED {money(balanceDue)}</dd>
          </div>
        </dl>
      </div>

      {state?.error && <p className={errorText}>{state.error}</p>}
      <button type="submit" disabled={pending} className={`${btnPrimary} self-start`}>
        {pending
          ? mode === "create"
            ? "Creating…"
            : "Saving…"
          : mode === "create"
            ? "Create invoice"
            : "Save changes"}
      </button>
    </form>
  );
}
