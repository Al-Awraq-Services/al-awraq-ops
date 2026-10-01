import { z } from "zod";

const usernamePattern = /^[a-z0-9._-]+$/;

// "Manage" without "view" would leave an account able to create/edit
// invoices (or customers) through the /new or /[id] pages but blocked
// from the list page that gates on canView… — refine so that can't happen.
function requireViewForManage<
  T extends {
    canViewInvoices: boolean;
    canManageInvoices: boolean;
    canViewCustomers: boolean;
    canManageCustomers: boolean;
  },
>(schema: z.ZodType<T>) {
  return schema
    .refine((v) => !v.canManageInvoices || v.canViewInvoices, {
      message: "Manage Invoices requires View Invoices too.",
      path: ["canManageInvoices"],
    })
    .refine((v) => !v.canManageCustomers || v.canViewCustomers, {
      message: "Manage Customers requires View Customers too.",
      path: ["canManageCustomers"],
    });
}

export const createUserSchema = requireViewForManage(
  z.object({
    name: z.string().trim().min(1, "Name is required."),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(2, "Username must be at least 2 characters.")
      .regex(usernamePattern, "Username can only contain lowercase letters, numbers, ., _ and -."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    canViewInvoices: z.boolean(),
    canManageInvoices: z.boolean(),
    canViewCustomers: z.boolean(),
    canManageCustomers: z.boolean(),
  }),
);

export type CreateUserInput = z.infer<typeof createUserSchema>;

function checkbox(formData: FormData, name: string): boolean {
  return formData.get(name) === "on";
}

export function parseCreateUserFormData(formData: FormData) {
  return createUserSchema.safeParse({
    name: formData.get("name"),
    username: formData.get("username"),
    password: formData.get("password"),
    canViewInvoices: checkbox(formData, "canViewInvoices"),
    canManageInvoices: checkbox(formData, "canManageInvoices"),
    canViewCustomers: checkbox(formData, "canViewCustomers"),
    canManageCustomers: checkbox(formData, "canManageCustomers"),
  });
}

export const updatePermissionsSchema = requireViewForManage(
  z.object({
    canViewInvoices: z.boolean(),
    canManageInvoices: z.boolean(),
    canViewCustomers: z.boolean(),
    canManageCustomers: z.boolean(),
  }),
);

export function parseUpdatePermissionsFormData(formData: FormData) {
  return updatePermissionsSchema.safeParse({
    canViewInvoices: checkbox(formData, "canViewInvoices"),
    canManageInvoices: checkbox(formData, "canManageInvoices"),
    canViewCustomers: checkbox(formData, "canViewCustomers"),
    canManageCustomers: checkbox(formData, "canManageCustomers"),
  });
}

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export function parseResetPasswordFormData(formData: FormData) {
  return resetPasswordSchema.safeParse({ password: formData.get("password") });
}
