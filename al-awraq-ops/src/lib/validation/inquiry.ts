import { z } from "zod";

/**
 * Empty strings from optional form fields are coerced to `undefined` before
 * validation so `.optional()` applies cleanly (mirrors
 * src/lib/validation/invoice.ts and src/lib/validation/customer.ts). `null`
 * is included here too since a toggled-off field (discount/shipment/stamp
 * duty) isn't rendered at all, so `formData.get(...)` returns `null` rather
 * than `""`.
 */
const emptyToUndefined = (value: unknown) =>
  (typeof value === "string" && value.trim() === "") || value === null ? undefined : value;

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().optional());
const optionalNumber = z.preprocess(emptyToUndefined, z.coerce.number().optional());

export const inquiryItemSchema = z.object({
  description: z.string().trim().min(1, "Every line item needs a description."),
  quantity: z.coerce.number().positive("Quantity must be greater than 0.").default(1),
  unit: optionalText,
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative."),
  retentionAmount: optionalNumber,
});

export type InquiryItemInput = z.infer<typeof inquiryItemSchema>;

export const inquiryFormSchema = z.object({
  // Customer (resolved to an existing or new Customer row by the action)
  customerName: z.string().trim().min(1, "Customer name is required."),
  customerAddress: optionalText,
  customerContact: optionalText,
  // B2B pass: extra business fields, shown/edited via BusinessCustomerCombobox.
  customerCompanyName: optionalText,
  customerBusinessTrn: optionalText,
  customerContactPerson: optionalText,

  // Inquiry meta
  inquiryNumber: z.string().trim().min(1, "Inquiry number is required."),
  inquiryDate: z.coerce.date(),
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

  items: z.array(inquiryItemSchema).min(1, "Add at least one line item."),
});

export type InquiryFormInput = z.infer<typeof inquiryFormSchema>;

/**
 * Parses a submitted inquiry FormData object. `items` arrives as a JSON
 * string (see InquiryForm's hidden input) since a plain HTML form can't
 * submit a dynamic array natively.
 */
export function parseInquiryFormData(formData: FormData) {
  let items: unknown = [];
  const rawItems = formData.get("items");
  if (typeof rawItems === "string" && rawItems.length > 0) {
    try {
      items = JSON.parse(rawItems);
    } catch {
      items = [];
    }
  }

  return inquiryFormSchema.safeParse({
    customerName: formData.get("customerName"),
    customerAddress: formData.get("customerAddress"),
    customerContact: formData.get("customerContact"),
    customerCompanyName: formData.get("customerCompanyName"),
    customerBusinessTrn: formData.get("customerBusinessTrn"),
    customerContactPerson: formData.get("customerContactPerson"),
    inquiryNumber: formData.get("inquiryNumber"),
    inquiryDate: formData.get("inquiryDate"),
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
