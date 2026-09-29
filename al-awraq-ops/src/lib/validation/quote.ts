import { z } from "zod";

/**
 * Server-side validation for Quote + QuoteItem (Phase D1).
 *
 * `customerId` is required — an assumption made because the sponsor had
 * not yet answered "must a Quote reference a Customer, a Lead, either, or
 * both?" when this was built (see docs/OPEN_DECISIONS.md "Phase D, D1").
 * `leadId` is optional and, if supplied, is additionally verified against
 * a real Lead row in src/actions/quotes.ts (zod alone can't check that).
 *
 * Status has no transition restrictions at the shape-validation level
 * (any of the three values passes this schema) — quoteEditSchema exists as
 * its own export for the same reason leadEditSchema does: a create action
 * can never accidentally accept a status field. The *business* rule that
 * an Approved Quote can't be edited further, and that approving requires
 * at least one line item, is enforced in src/actions/quotes.ts
 * (`requireQuoteEditable`), not here — zod validates shape, not database
 * state.
 */

const QUOTE_STATUSES = ["DRAFT", "SENT", "APPROVED"] as const;

export const quoteSchema = z.object({
  customerId: z.string().trim().min(1, "Customer is required."),
  leadId: z
    .string()
    .trim()
    .min(1)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const quoteEditSchema = quoteSchema.extend({
  status: z.enum(QUOTE_STATUSES),
});

/**
 * A single QuoteItem line. `serviceId` is optional and, like `leadId`
 * above, is verified against a real Service row in the action, not here.
 * Per the approved decision, custom (non-catalog) lines carry no
 * placeholder label — this shape is the same whether or not a serviceId is
 * present.
 */
export const quoteItemSchema = z.object({
  description: z.string().trim().min(1, "Description is required.").max(300),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number.")
    .positive("Quantity must be at least 1.")
    .max(1000),
  unitPrice: z.coerce
    .number()
    .nonnegative("Unit price cannot be negative.")
    .max(1_000_000),
  serviceId: z
    .string()
    .trim()
    .min(1)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type QuoteInput = z.infer<typeof quoteSchema>;
export type QuoteEditInput = z.infer<typeof quoteEditSchema>;
export type QuoteItemInput = z.infer<typeof quoteItemSchema>;
