import { z } from "zod";

/**
 * Server-side validation for User CRUD (Admin-only), per
 * docs/SECURITY_BASELINE.md. `role` is restricted to the three approved
 * values — see prisma/schema.prisma `Role` enum and the Phase 3 "Role"
 * simplification note.
 */

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().min(1, "Email is required").email("Invalid email"),
  role: z.enum(["ADMIN", "STAFF", "TECHNICIAN"]),
});
