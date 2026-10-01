"use client";

import { useActionState } from "react";
import { updateUserPermissionsAction, type UserActionState } from "@/actions/users";
import { btnPrimary, errorText } from "@/lib/ui/classNames";

export function UserPermissionsForm({
  userId,
  defaultValues,
}: {
  userId: string;
  defaultValues: {
    canViewInvoices: boolean;
    canManageInvoices: boolean;
    canViewCustomers: boolean;
    canManageCustomers: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState<UserActionState, FormData>(
    updateUserPermissionsAction.bind(null, userId),
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm text-neutral-800">
        <input
          type="checkbox"
          name="canViewInvoices"
          defaultChecked={defaultValues.canViewInvoices}
          className="h-4 w-4 rounded"
        />
        View Invoices
      </label>
      <label className="flex items-center gap-2 text-sm text-neutral-800">
        <input
          type="checkbox"
          name="canManageInvoices"
          defaultChecked={defaultValues.canManageInvoices}
          className="h-4 w-4 rounded"
        />
        Manage Invoices (create, edit, delete, record payments)
      </label>
      <label className="flex items-center gap-2 text-sm text-neutral-800">
        <input
          type="checkbox"
          name="canViewCustomers"
          defaultChecked={defaultValues.canViewCustomers}
          className="h-4 w-4 rounded"
        />
        View Customers
      </label>
      <label className="flex items-center gap-2 text-sm text-neutral-800">
        <input
          type="checkbox"
          name="canManageCustomers"
          defaultChecked={defaultValues.canManageCustomers}
          className="h-4 w-4 rounded"
        />
        Manage Customers (create, edit, delete)
      </label>

      {state?.error && <p className={errorText}>{state.error}</p>}
      {state?.success && <p className="text-sm font-medium text-emerald-700">Saved.</p>}
      <button type="submit" disabled={pending} className={`${btnPrimary} self-start`}>
        {pending ? "Saving…" : "Save access"}
      </button>
    </form>
  );
}
