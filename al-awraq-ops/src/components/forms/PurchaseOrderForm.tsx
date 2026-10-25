"use client";

import { useActionState, useState } from "react";
import type { PurchaseOrderActionState } from "@/actions/purchaseOrders";
import { VendorCombobox, type VendorOption } from "@/components/forms/VendorCombobox";
import {
  btnPrimary,
  btnSecondarySm,
  inputClass,
  labelClass,
  fieldWrap,
  fieldset,
  errorText,
  sectionTitle,
  sectionHeader,
  cardClass,
  tableWrap,
  table,
  thClass,
  thNum,
  linkDanger,
  dlList,
  dlRow,
  dlTerm,
  dlValue,
  dlTotalRow,
  tdInput,
  tdInputNum,
} from "@/lib/ui/classNames";

type ItemRow = {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};

const emptyRow: ItemRow = { description: "", quantity: "1", unit: "", unitPrice: "0" };

// Line-item grid cells: tighter than tdClass so the inputs sit in a
// spreadsheet-like grid, one hairline between rows.

/**
 * Plain data shape for edit mode — all Decimal fields must already be
 * converted to `number` and all dates to "yyyy-mm-dd" strings by the
 * caller (the [poId] detail page), since Decimal/Date objects can't cross
 * the Server → Client Component boundary. Mirrors InvoiceFormValues, minus
 * retentionAmount on items, stampDutyAmount, poNumber-as-optional-field,
 * and salesperson (none of which apply to a Purchase Order).
 */
export type PurchaseOrderFormValues = {
  poNumber: string;
  orderDate: string;
  expectedDate: string;
  notes: string;
  taxRatePercent: number;
  discountAmount: number | null;
  shipmentAmount: number | null;
  amountPaid: number;
  vendorName: string;
  vendorAddress: string;
  vendorContact: string;
  items: {
    description: string;
    quantity: number;
    unit: string | null;
    unitPrice: number;
  }[];
};

type PurchaseOrderFormAction = (
  prevState: PurchaseOrderActionState,
  formData: FormData,
) => Promise<PurchaseOrderActionState>;

// Duplicated line-item arithmetic (same formulas as src/lib/invoiceMath.ts:
// lineSubtotal / lineTotal, with no retention term) so the totals shown
// here update live as the user types, before anything is submitted. The
// server independently re-validates and recomputes the authoritative
// totals via invoiceMath.ts on save — this copy is display-only.
function rowSubtotal(row: ItemRow): number {
  const qty = Number(row.quantity) || 0;
  const price = Number(row.unitPrice) || 0;
  return qty * price;
}

function rowTotal(row: ItemRow, taxRatePercent: number): number {
  return rowSubtotal(row) * (1 + taxRatePercent / 100);
}

function money(n: number): string {
  return n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PurchaseOrderForm({
  mode,
  vendors,
  defaultTaxRatePercent,
  nextPoNumberDisplay,
  purchaseOrder,
  action,
}: {
  mode: "create" | "edit";
  vendors: VendorOption[];
  defaultTaxRatePercent: number;
  nextPoNumberDisplay: string;
  purchaseOrder?: PurchaseOrderFormValues;
  action: PurchaseOrderFormAction;
}) {
  const [state, formAction, pending] = useActionState<PurchaseOrderActionState, FormData>(
    action,
    undefined,
  );

  const [items, setItems] = useState<ItemRow[]>(
    purchaseOrder && purchaseOrder.items.length > 0
      ? purchaseOrder.items.map((item) => ({
          description: item.description,
          quantity: String(item.quantity),
          unit: item.unit ?? "",
          unitPrice: String(item.unitPrice),
        }))
      : [emptyRow],
  );

  const [taxRatePercent, setTaxRatePercent] = useState(
    String(purchaseOrder?.taxRatePercent ?? defaultTaxRatePercent),
  );

  const [showDiscount, setShowDiscount] = useState(Boolean(purchaseOrder?.discountAmount));
  const [discountAmount, setDiscountAmount] = useState(
    purchaseOrder?.discountAmount != null ? String(purchaseOrder.discountAmount) : "",
  );
  const [showShipment, setShowShipment] = useState(Boolean(purchaseOrder?.shipmentAmount));
  const [shipmentAmount, setShipmentAmount] = useState(
    purchaseOrder?.shipmentAmount != null ? String(purchaseOrder.shipmentAmount) : "",
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
  const grandTotal = taxableBase + taxAmount + shipment;
  const amountPaid = purchaseOrder?.amountPaid ?? 0;
  const balanceDue = grandTotal - amountPaid;

  const itemsJson = JSON.stringify(
    items.map((row) => ({
      description: row.description,
      quantity: Number(row.quantity) || 0,
      unit: row.unit || undefined,
      unitPrice: Number(row.unitPrice) || 0,
    })),
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <div className={`${cardClass} flex flex-col gap-6`}>
        <section className={fieldset}>
          <h2 className={sectionTitle}>Vendor</h2>
          <VendorCombobox
            vendors={vendors}
            defaultValues={{
              name: purchaseOrder?.vendorName ?? "",
              address: purchaseOrder?.vendorAddress ?? "",
              contact: purchaseOrder?.vendorContact ?? "",
            }}
          />
        </section>

        <section className={fieldset}>
          <h2 className={sectionTitle}>Order details</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className={fieldWrap}>
              <label className={labelClass} htmlFor="poNumber">
                PO number
              </label>
              <input
                id="poNumber"
                name="poNumber"
                type="text"
                required
                defaultValue={purchaseOrder?.poNumber ?? nextPoNumberDisplay}
                className={inputClass}
              />
            </div>
            <div className={fieldWrap}>
              <label className={labelClass} htmlFor="orderDate">
                Order date
              </label>
              <input
                id="orderDate"
                name="orderDate"
                type="date"
                required
                defaultValue={purchaseOrder?.orderDate ?? today}
                className={inputClass}
              />
            </div>
            <div className={fieldWrap}>
              <label className={labelClass} htmlFor="expectedDate">
                Expected date
              </label>
              <input
                id="expectedDate"
                name="expectedDate"
                type="date"
                defaultValue={purchaseOrder?.expectedDate ?? ""}
                className={inputClass}
              />
            </div>
            <div className={fieldWrap}>
              <label className={labelClass} htmlFor="taxRatePercent">
                VAT rate (%)
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
        </section>
      </div>

      <section>
        <div className={sectionHeader}>
          <h2 className={sectionTitle}>Line items</h2>
          <button type="button" onClick={addItem} className={btnSecondarySm}>
            Add line
          </button>
        </div>
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
                <th className={thClass}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, index) => (
                <tr key={index}>
                  <td className={tdInputNum}>
                    <span className="text-muted">{index + 1}</span>
                  </td>
                  <td className={tdInput}>
                    <input
                      type="text"
                      required
                      aria-label={`Line ${index + 1} description`}
                      value={row.description}
                      onChange={(e) => updateItem(index, { description: e.target.value })}
                      className={`${inputClass} min-w-[12rem]`}
                    />
                  </td>
                  <td className={tdInput}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      aria-label={`Line ${index + 1} quantity`}
                      value={row.quantity}
                      onChange={(e) => updateItem(index, { quantity: e.target.value })}
                      className={`${inputClass} w-20 text-right`}
                    />
                  </td>
                  <td className={tdInput}>
                    <input
                      type="text"
                      aria-label={`Line ${index + 1} unit`}
                      value={row.unit}
                      onChange={(e) => updateItem(index, { unit: e.target.value })}
                      className={`${inputClass} w-20`}
                    />
                  </td>
                  <td className={tdInput}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      aria-label={`Line ${index + 1} unit price`}
                      value={row.unitPrice}
                      onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                      className={`${inputClass} w-28 text-right`}
                    />
                  </td>
                  <td className={tdInputNum}>{money(rowSubtotal(row))}</td>
                  <td className={tdInputNum}>{money(rowTotal(row, rate))}</td>
                  <td className={tdInput}>
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
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className={`${cardClass} flex flex-col gap-4`}>
          <h2 className={sectionTitle}>Adjustments and notes</h2>
          {(!showDiscount || !showShipment) && (
            <div className="flex flex-wrap gap-2">
              {!showDiscount && (
                <button
                  type="button"
                  onClick={() => setShowDiscount(true)}
                  className={btnSecondarySm}
                >
                  Add discount
                </button>
              )}
              {!showShipment && (
                <button
                  type="button"
                  onClick={() => setShowShipment(true)}
                  className={btnSecondarySm}
                >
                  Add shipment
                </button>
              )}
            </div>
          )}
          {(showDiscount || showShipment) && (
            <div className="grid gap-4 sm:grid-cols-3">
              {showDiscount && (
                <div className={fieldWrap}>
                  <label className={labelClass} htmlFor="discountAmount">
                    Discount (AED)
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
                    Shipment (AED)
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
            </div>
          )}

          <div className={fieldWrap}>
            <label className={labelClass} htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={purchaseOrder?.notes ?? ""}
              className={inputClass}
            />
          </div>
        </div>

        <div className={cardClass}>
          <h2 className={`${sectionTitle} mb-2`}>Totals</h2>
          <dl className={dlList}>
            <div className={dlRow}>
              <dt className={dlTerm}>Subtotal</dt>
              <dd className={dlValue}>AED {money(itemsSubtotal)}</dd>
            </div>
            <div className={dlRow}>
              <dt className={dlTerm}>Discount</dt>
              <dd className={dlValue}>AED {money(discount)}</dd>
            </div>
            <div className={dlRow}>
              <dt className={dlTerm}>Taxable</dt>
              <dd className={dlValue}>AED {money(taxableBase)}</dd>
            </div>
            <div className={dlRow}>
              <dt className={dlTerm}>VAT {rate}%</dt>
              <dd className={dlValue}>AED {money(taxAmount)}</dd>
            </div>
            <div className={dlRow}>
              <dt className={dlTerm}>Shipment</dt>
              <dd className={dlValue}>AED {money(shipment)}</dd>
            </div>
          </dl>
          <dl className={dlList}>
            <div className={dlTotalRow}>
              <dt>Total</dt>
              <dd className="tabular-nums">AED {money(grandTotal)}</dd>
            </div>
            <div className={dlRow}>
              <dt className={dlTerm}>Paid</dt>
              <dd className={dlValue}>AED {money(amountPaid)}</dd>
            </div>
            <div className={dlRow}>
              <dt className="font-semibold text-ink">Balance due</dt>
              <dd className="text-right font-semibold text-ink tabular-nums">
                AED {money(balanceDue)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create purchase order"
              : "Save changes"}
        </button>
        {state?.error && <p className={errorText}>{state.error}</p>}
      </div>
    </form>
  );
}
