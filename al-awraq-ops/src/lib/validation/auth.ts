import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation/constants";

/**
 * Server-side validation for every auth write path, per
 * docs/SECURITY_BASELINE.md ("input validation is mandatory on every write
 * path"). Client-side validation (the `required`/`type` attributes on the
 * form inputs) is a UX convenience only — these schemas are what's actually
 * enforced, and are re-checked here regardless of what the browser sent.
 */

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const passwordSchema = z
  .string()
  .min(
    MIN_PASSWORD_LENGTH,
    `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
  );

export const setPasswordSchema = z
  .object({
    token: z.string().min(1, "Missing token"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
