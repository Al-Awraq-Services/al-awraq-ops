import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().optional());
const optionalEmail = z.preprocess(
  emptyToUndefined,
  z.string().trim().email("Enter a valid email address.").optional(),
);

export const businessProfileSchema = z.object({
  legalName: z.string().trim().min(1, "Legal name is required."),
  trn: optionalText,
  address: optionalText,
  phone: optionalText,
  email: optionalEmail,
  website: optionalText,
  defaultTaxRatePercent: z.coerce
    .number({ error: "Enter a tax rate." })
    .min(0, "Tax rate can't be negative.")
    .max(100, "Tax rate can't exceed 100%."),
  nextInvoiceNumber: z.coerce
    .number({ error: "Enter the next invoice number." })
    .int("Must be a whole number.")
    .positive("Must be a positive number."),
  invoiceNumberPrefix: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().default(""),
  ),
  invoiceNumberPadding: z.coerce
    .number({ error: "Enter the invoice number padding." })
    .int("Must be a whole number.")
    .min(1, "Must be at least 1.")
    .max(10, "Must be at most 10."),
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;

export function parseBusinessProfileFormData(formData: FormData) {
  return businessProfileSchema.safeParse({
    legalName: formData.get("legalName"),
    trn: formData.get("trn"),
    address: formData.get("address"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    website: formData.get("website"),
    defaultTaxRatePercent: formData.get("defaultTaxRatePercent"),
    nextInvoiceNumber: formData.get("nextInvoiceNumber"),
    invoiceNumberPrefix: formData.get("invoiceNumberPrefix"),
    invoiceNumberPadding: formData.get("invoiceNumberPadding"),
  });
}
