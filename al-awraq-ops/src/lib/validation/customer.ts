import { z } from "zod";

/**
 * Server-side validation for Customer CRUD, per docs/SECURITY_BASELINE.md
 * ("input validation is mandatory on every write path"). Client-side
 * `required` attributes are UX convenience only — this schema is what's
 * actually enforced.
 *
 * Field rules per the approved Phase C data model: name and phone
 * required, email/address/notes optional. No other fields are accepted —
 * consumers must build their create/update actions to pass only these
 * keys through this schema (never a raw spread of client-submitted
 * FormData), which is what prevents mass assignment.
 */
export const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  phone: z.string().trim().min(1, "Phone is required").max(50),
  email: z
    .string()
    .trim()
    .email("Invalid email")
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  address: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().max(2000).optional().or(z.literal("").transform(() => undefined)),
});

export type CustomerInput = z.infer<typeof customerSchema>;
