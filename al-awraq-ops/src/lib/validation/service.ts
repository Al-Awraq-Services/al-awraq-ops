import { z } from "zod";

/**
 * Server-side validation for the Admin-only Service catalog.
 *
 * The one rule that matters here, per the sponsor's Market-price rule:
 * a placeholder price can never be saved without recording where it came
 * from and when. Enforced with `superRefine` rather than three independent
 * optional fields, so "price set but source missing" is rejected as one
 * coherent business rule, not three separately-passing field checks.
 */
export const serviceSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    category: z
      .string()
      .trim()
      .max(100)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    description: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    placeholderPrice: z
      .union([z.coerce.number().positive(), z.literal("").transform(() => undefined)])
      .optional(),
    priceSource: z
      .string()
      .trim()
      .max(300)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    priceSourceDate: z
      .union([z.coerce.date(), z.literal("").transform(() => undefined)])
      .optional(),
  })
  .superRefine((data, ctx) => {
    const priceSet = data.placeholderPrice !== undefined;
    const sourceSet = !!data.priceSource;
    const dateSet = data.priceSourceDate !== undefined;

    if (priceSet && (!sourceSet || !dateSet)) {
      if (!sourceSet) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["priceSource"],
          message: "A price source is required whenever a placeholder price is set.",
        });
      }
      if (!dateSet) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["priceSourceDate"],
          message: "A price source date is required whenever a placeholder price is set.",
        });
      }
    }
  });

export type ServiceInput = z.infer<typeof serviceSchema>;
