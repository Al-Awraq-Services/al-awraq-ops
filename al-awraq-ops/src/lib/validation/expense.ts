import { z } from "zod";

/**
 * Mirrors src/lib/validation/customer.ts / invoice.ts — empty strings from
 * optional form fields are coerced to `undefined` before validation.
 */
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().optional());

export const expenseSchema = z.object({
  date: z.coerce.date({ error: "Enter a valid date." }),
  // Free text, not an enum — a <datalist> in the UI suggests common values
  // (Rent, Utilities, Salaries, Fuel, Supplies, Maintenance, Other) without
  // forcing a fixed list, same philosophy as Invoice.paymentMethod.
  category: z.string().trim().min(1, "Category is required."),
  description: optionalText,
  amount: z.coerce
    .number({ error: "Enter an amount." })
    .positive("Amount must be greater than 0."),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

export function parseExpenseFormData(formData: FormData) {
  return expenseSchema.safeParse({
    date: formData.get("date"),
    category: formData.get("category"),
    description: formData.get("description"),
    amount: formData.get("amount"),
  });
}
