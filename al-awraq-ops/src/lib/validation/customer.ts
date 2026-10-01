import { z } from "zod";

/**
 * Empty strings from optional form fields are coerced to `undefined` before
 * validation so `.optional()` applies cleanly and format checks (email)
 * only run when a value was actually typed.
 */
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().optional());
const optionalEmail = z.preprocess(
  emptyToUndefined,
  z.string().trim().email("Enter a valid email address.").optional(),
);

// B2B pass (2026-10-01): "type" determines whether the business fields
// below are relevant — Invoice/the customer form still work unchanged for
// INDIVIDUAL customers, which simply leave them blank.
export const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  address: optionalText,
  contact: optionalText,
  email: optionalEmail,
  notes: optionalText,
  type: z.enum(["INDIVIDUAL", "BUSINESS"]).default("INDIVIDUAL"),
  companyName: optionalText,
  businessTrn: optionalText,
  contactPerson: optionalText,
});

export type CustomerInput = z.infer<typeof customerSchema>;

export function parseCustomerFormData(formData: FormData) {
  return customerSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    contact: formData.get("contact"),
    email: formData.get("email"),
    notes: formData.get("notes"),
    type: formData.get("type") || "INDIVIDUAL",
    companyName: formData.get("companyName"),
    businessTrn: formData.get("businessTrn"),
    contactPerson: formData.get("contactPerson"),
  });
}
