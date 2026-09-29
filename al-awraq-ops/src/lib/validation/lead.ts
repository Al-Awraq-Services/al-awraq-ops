import { z } from "zod";

/**
 * Server-side validation for Lead CRUD. Per the approved Phase C scope:
 *  - source is one of the sponsor's own stated intake channels
 *  - description is required (Phase 5 UI/UX plan §7)
 *  - customerId is optional — a Lead may exist before a formal Customer
 *    record does
 *  - status has no transition restrictions: any of the three values is
 *    valid to set at any time (leadStatusSchema exists as its own schema
 *    specifically so a status-only update can't smuggle in changes to
 *    other fields)
 */

const LEAD_SOURCES = ["PHONE", "WHATSAPP", "REFERRAL", "WEBSITE", "OTHER"] as const;
const LEAD_STATUSES = ["NEW", "CONVERTED", "LOST"] as const;

export const leadSchema = z.object({
  source: z.enum(LEAD_SOURCES),
  description: z.string().trim().min(1, "Description is required").max(2000),
  customerId: z
    .string()
    .trim()
    .min(1)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const leadStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES),
});

/**
 * C3: the edit form manages source/description/customerId and status
 * together in one submit — this schema is deliberately a separate export
 * (not a change to `leadSchema`, which C2's create path still uses via the
 * same shape) so a create action can never accidentally accept a status
 * field, and an edit action always validates all four fields at once.
 */
export const leadEditSchema = leadSchema.extend({
  status: z.enum(LEAD_STATUSES),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type LeadStatusInput = z.infer<typeof leadStatusSchema>;
export type LeadEditInput = z.infer<typeof leadEditSchema>;
