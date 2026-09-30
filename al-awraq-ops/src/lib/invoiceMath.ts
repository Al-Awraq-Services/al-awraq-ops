/**
 * All invoice money math lives here, and only here. No total/balance is
 * ever stored in the database (see the Invoice/InvoiceItem model comments
 * in prisma/schema.prisma) — the create form, the detail page, the PDF
 * renderer, and the dashboard all call into this module so they can never
 * disagree with each other.
 *
 * Money is handled as plain `number`, rounded to 2dp at every output
 * boundary (`round2`). Good enough for single-currency AED invoicing at
 * this scale — not attempting arbitrary-precision decimal arithmetic.
 */

export type LineItemInput = {
  quantity: number | string;
  unitPrice: number | string;
  retentionAmount?: number | string | null;
};

export type InvoiceAdjustments = {
  taxRatePercent: number | string;
  discountAmount?: number | string | null;
  shipmentAmount?: number | string | null;
  stampDutyAmount?: number | string | null;
  amountPaid?: number | string | null;
};

export type InvoiceTotals = {
  itemsSubtotal: number;
  discount: number;
  taxableBase: number;
  taxAmount: number;
  shipment: number;
  stampDuty: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  status: "UNPAID" | "PARTIAL" | "PAID";
};

export function toNum(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Subtotal for one line: quantity × unitPrice − retention. */
export function lineSubtotal(item: LineItemInput): number {
  const qty = toNum(item.quantity);
  const price = toNum(item.unitPrice);
  const retention = toNum(item.retentionAmount);
  return round2(qty * price - retention);
}

/**
 * The per-line "Total" column shown on the printed invoice — the line's
 * subtotal plus its proportional share of VAT (VAT is a single rate set
 * once per invoice, not per line, so each line's share is just its own
 * subtotal taxed at that rate).
 */
export function lineTotal(item: LineItemInput, taxRatePercent: number | string): number {
  const rate = toNum(taxRatePercent);
  return round2(lineSubtotal(item) * (1 + rate / 100));
}

export function itemsSubtotal(items: LineItemInput[]): number {
  return round2(items.reduce((sum, item) => sum + lineSubtotal(item), 0));
}

/**
 * Full invoice totals: items subtotal → less invoice-level discount →
 * VAT on that taxable base → plus shipment and stamp duty (both applied
 * after tax, matching how they behave on the reference invoicing
 * software) → grand total → balance remaining after amountPaid.
 */
export function computeInvoiceTotals(
  items: LineItemInput[],
  adjustments: InvoiceAdjustments,
): InvoiceTotals {
  const subtotal = itemsSubtotal(items);
  const discount = round2(toNum(adjustments.discountAmount));
  const taxableBase = round2(subtotal - discount);
  const taxAmount = round2(taxableBase * (toNum(adjustments.taxRatePercent) / 100));
  const shipment = round2(toNum(adjustments.shipmentAmount));
  const stampDuty = round2(toNum(adjustments.stampDutyAmount));
  const grandTotal = round2(taxableBase + taxAmount + shipment + stampDuty);
  const amountPaid = round2(toNum(adjustments.amountPaid));
  const balanceDue = round2(grandTotal - amountPaid);

  const status: InvoiceTotals["status"] =
    amountPaid <= 0 ? "UNPAID" : balanceDue <= 0 ? "PAID" : "PARTIAL";

  return {
    itemsSubtotal: subtotal,
    discount,
    taxableBase,
    taxAmount,
    shipment,
    stampDuty,
    grandTotal,
    amountPaid,
    balanceDue,
    status,
  };
}

/**
 * A customer's running balance *before* a given invoice — the sum of
 * (grandTotal − amountPaid) across their other invoices. Never stored;
 * callers pass in the customer's other invoices (items + adjustments)
 * already fetched from the database.
 */
export function computePreviousBalance(
  otherInvoices: Array<{ items: LineItemInput[]; adjustments: InvoiceAdjustments }>,
): number {
  return round2(
    otherInvoices.reduce((sum, inv) => {
      const totals = computeInvoiceTotals(inv.items, inv.adjustments);
      return sum + totals.balanceDue;
    }, 0),
  );
}

export function formatMoney(value: number): string {
  return value.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function nextInvoiceDisplayNumber(
  counter: number,
  prefix: string,
  padding: number,
): string {
  return `${prefix}${String(counter).padStart(padding, "0")}`;
}
