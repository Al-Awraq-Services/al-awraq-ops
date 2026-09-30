import { z } from "zod";

/**
 * Empty strings from optional form fields are coerced to `undefined` before
 * validation so `.optional()` applies cleanly (mirrors
 * src/lib/validation/customer.ts). `null` is included here too since a
 * toggled-off field (discount/shipment/stamp duty) isn't rendered at all,
 * so `formData.get(...)` returns `null` rather than `""`.
 */
const emptyToUndefined = (value: unknown) =>
  (typeof value === "string" && value.trim() === "") || value === null ? undefined : value;

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().optional());
const optionalNumber = z.preprocess(emptyToUndefined, z.coerce.number().optional());

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, "Every line item needs a description."),
  quantity: z.coerce.number().positive("Quantity must be greater than 0.").default(1),
  unit: optionalText,
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative."),
  retentionAmount: optionalNumber,
});

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;

export const invoiceFormSchema = z.object({
  // Customer (resolved to an existing or new Customer row by the action)
  customerName: z.string().trim().min(1, "Customer name is required."),
  customerAddress: optionalText,
  customerContact: optionalText,

  // Invoice meta
  invoiceNumber: z.string().trim().min(1, "Invoice number is required."),
  invoiceDate: z.coerce.date(),
  dueDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  poNumber: optionalText,
  paymentMethod: optionalText,
  salesperson: optionalText,
  notes: optionalText,

  // Money
  taxRatePercent: z.coerce.number().min(0, "Tax rate cannot be negative."),
  discountAmount: optionalNumber,
  shipmentAmount: optionalNumber,
  stampDutyAmount: optionalNumber,

  items: z.array(invoiceItemSchema).min(1, "Add at least one line item."),
});

export type InvoiceFormInput = z.infer<typeof invoiceFormSchema>;

/**
 * Parses a submitted invoice FormData object. `items` arrives as a JSON
 * string (see InvoiceForm's hidden input) since a plain HTML form can't
 * submit a dynamic array natively.
 */
export function parseInvoiceFormData(formData: FormData) {
  let items: unknown = [];
  const rawItems = formData.get("items");
  if (typeof rawItems === "string" && rawItems.length > 0) {
    try {
      items = JSON.parse(rawItems);
    } catch {
      items = [];
    }
  }

  return invoiceFormSchema.safeParse({
    customerName: formData.get("customerName"),
    customerAddress: formData.get("customerAddress"),
    customerContact: formData.get("customerContact"),
    invoiceNumber: formData.get("invoiceNumber"),
    invoiceDate: formData.get("invoiceDate"),
    dueDate: formData.get("dueDate"),
    poNumber: formData.get("poNumber"),
    paymentMethod: formData.get("paymentMethod"),
    salesperson: formData.get("salesperson"),
    notes: formData.get("notes"),
    taxRatePercent: formData.get("taxRatePercent"),
    discountAmount: formData.get("discountAmount"),
    shipmentAmount: formData.get("shipmentAmount"),
    stampDutyAmount: formData.get("stampDutyAmount"),
    items,
  });
}
