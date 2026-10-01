import { z } from "zod";

/**
 * Empty strings from optional form fields are coerced to `undefined` before
 * validation so `.optional()` applies cleanly (mirrors
 * src/lib/validation/invoice.ts). `null` is included here too since a
 * toggled-off field (discount/shipment) isn't rendered at all, so
 * `formData.get(...)` returns `null` rather than `""`.
 *
 * Shaped after invoiceFormSchema minus what doesn't apply to the buying
 * side: no `retentionAmount` on items, no `stampDutyAmount`, no `poNumber`
 * (Invoice's own optional PO-reference field — not relevant here, since
 * *this* document IS the PO) and no `salesperson`. Uses
 * vendorName/vendorAddress/vendorContact (parallel to Invoice's
 * customerName/etc.) to feed vendor resolution, and `expectedDate` in place
 * of `dueDate`.
 */
const emptyToUndefined = (value: unknown) =>
  (typeof value === "string" && value.trim() === "") || value === null ? undefined : value;

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().optional());
const optionalNumber = z.preprocess(emptyToUndefined, z.coerce.number().optional());

export const purchaseOrderItemSchema = z.object({
  description: z.string().trim().min(1, "Every line item needs a description."),
  quantity: z.coerce.number().positive("Quantity must be greater than 0.").default(1),
  unit: optionalText,
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative."),
});

export type PurchaseOrderItemInput = z.infer<typeof purchaseOrderItemSchema>;

export const purchaseOrderFormSchema = z.object({
  // Vendor (resolved to an existing or new Vendor row by the action)
  vendorName: z.string().trim().min(1, "Vendor name is required."),
  vendorAddress: optionalText,
  vendorContact: optionalText,

  // Purchase order meta
  poNumber: z.string().trim().min(1, "PO number is required."),
  orderDate: z.coerce.date(),
  expectedDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  notes: optionalText,

  // Money
  taxRatePercent: z.coerce.number().min(0, "Tax rate cannot be negative."),
  discountAmount: optionalNumber,
  shipmentAmount: optionalNumber,

  items: z.array(purchaseOrderItemSchema).min(1, "Add at least one line item."),
});

export type PurchaseOrderFormInput = z.infer<typeof purchaseOrderFormSchema>;

/**
 * Parses a submitted purchase order FormData object. `items` arrives as a
 * JSON string (see PurchaseOrderForm's hidden input) since a plain HTML
 * form can't submit a dynamic array natively.
 *
 * Note: the PurchaseOrder Prisma model has no `paymentMethod` column (see
 * prisma/schema.prisma) — unlike Invoice, which does — so it's omitted
 * here rather than collected and silently dropped.
 */
export function parsePurchaseOrderFormData(formData: FormData) {
  let items: unknown = [];
  const rawItems = formData.get("items");
  if (typeof rawItems === "string" && rawItems.length > 0) {
    try {
      items = JSON.parse(rawItems);
    } catch {
      items = [];
    }
  }

  return purchaseOrderFormSchema.safeParse({
    vendorName: formData.get("vendorName"),
    vendorAddress: formData.get("vendorAddress"),
    vendorContact: formData.get("vendorContact"),
    poNumber: formData.get("poNumber"),
    orderDate: formData.get("orderDate"),
    expectedDate: formData.get("expectedDate"),
    notes: formData.get("notes"),
    taxRatePercent: formData.get("taxRatePercent"),
    discountAmount: formData.get("discountAmount"),
    shipmentAmount: formData.get("shipmentAmount"),
    items,
  });
}
