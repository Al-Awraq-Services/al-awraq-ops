"use client";

import { useActionState } from "react";
import { updateUserPermissionsAction, type UserActionState } from "@/actions/users";
import { btnPrimary, errorText } from "@/lib/ui/classNames";

export type UserPermissionValues = {
  canViewInvoices: boolean;
  canManageInvoices: boolean;
  canViewCustomers: boolean;
  canManageCustomers: boolean;
  canViewInquiries: boolean;
  canManageInquiries: boolean;
  canViewPurchaseOrders: boolean;
  canManagePurchaseOrders: boolean;
};

function PermissionCheckbox({
  name,
  defaultChecked,
  label,
}: {
  name: string;
  defaultChecked: boolean;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-neutral-800">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded"
      />
      {label}
    </label>
  );
}

export function UserPermissionsForm({
  userId,
  defaultValues,
}: {
  userId: string;
  defaultValues: UserPermissionValues;
}) {
  const [state, formAction, pending] = useActionState<UserActionState, FormData>(
    updateUserPermissionsAction.bind(null, userId),
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <PermissionCheckbox
        name="canViewInvoices"
        defaultChecked={defaultValues.canViewInvoices}
        label="View Invoices"
      />
      <PermissionCheckbox
        name="canManageInvoices"
        defaultChecked={defaultValues.canManageInvoices}
        label="Manage Invoices (create, edit, delete, record payments)"
      />
      <PermissionCheckbox
        name="canViewCustomers"
        defaultChecked={defaultValues.canViewCustomers}
        label="View Customers"
      />
      <PermissionCheckbox
        name="canManageCustomers"
        defaultChecked={defaultValues.canManageCustomers}
        label="Manage Customers (create, edit, delete)"
      />
      <PermissionCheckbox
        name="canViewInquiries"
        defaultChecked={defaultValues.canViewInquiries}
        label="View Inquiries (B2B)"
      />
      <PermissionCheckbox
        name="canManageInquiries"
        defaultChecked={defaultValues.canManageInquiries}
        label="Manage Inquiries (create, edit, delete, record payments)"
      />
      <PermissionCheckbox
        name="canViewPurchaseOrders"
        defaultChecked={defaultValues.canViewPurchaseOrders}
        label="View Purchase Orders"
      />
      <PermissionCheckbox
        name="canManagePurchaseOrders"
        defaultChecked={defaultValues.canManagePurchaseOrders}
        label="Manage Purchase Orders (create, edit, delete, vendors)"
      />

      {state?.error && <p className={errorText}>{state.error}</p>}
      {state?.success && <p className="text-sm font-medium text-emerald-700">Saved.</p>}
      <button type="submit" disabled={pending} className={`${btnPrimary} self-start`}>
        {pending ? "Saving…" : "Save access"}
      </button>
    </form>
  );
}
