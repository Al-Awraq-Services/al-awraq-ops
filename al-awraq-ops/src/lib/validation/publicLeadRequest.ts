import { z } from "zod";

/**
 * The public "Request a Quote" form (src/app/request-a-quote/page.tsx).
 * Deliberately narrow: name, phone, an optional email, an optional
 * service-of-interest label, and a required message. Nothing here can set
 * a Lead's status, customerId, or source — those are fixed by
 * `createPublicLeadRequestAction` itself (src/actions/public.ts), never
 * taken from form input, so a forged extra field can't change them.
 */
export const publicLeadRequestSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  phone: z.string().trim().min(1, "Phone is required.").max(50),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  serviceOfInterest: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  message: z.string().trim().min(1, "Please describe what you need.").max(2000),
});

export type PublicLeadRequestInput = z.infer<typeof publicLeadRequestSchema>;
