import { z } from "zod";

/**
 * Empty strings from optional form fields are coerced to `undefined` before
 * validation so `.optional()` applies cleanly and format checks (email)
 * only run when a value was actually typed. Mirrors
 * src/lib/validation/customer.ts, minus the Customer B2B fields
 * (type/companyName/businessTrn/contactPerson) — Vendor has no business-type
 * split, just name/address/contact/email/notes.
 */
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().optional());
const optionalEmail = z.preprocess(
  emptyToUndefined,
  z.string().trim().email("Enter a valid email address.").optional(),
);

export const vendorSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  address: optionalText,
  contact: optionalText,
  email: optionalEmail,
  notes: optionalText,
});

export type VendorInput = z.infer<typeof vendorSchema>;

export function parseVendorFormData(formData: FormData) {
  return vendorSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    contact: formData.get("contact"),
    email: formData.get("email"),
    notes: formData.get("notes"),
  });
}
