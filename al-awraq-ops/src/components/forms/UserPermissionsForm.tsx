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

// One row per module; the checkbox `name`s are the exact permission flags
// the users actions read from FormData.
const permissionModules: Array<{
  label: string;
  manageScope: string;
  view: keyof UserPermissionValues;
  manage: keyof UserPermissionValues;
}> = [
  {
    label: "Invoices",
    manageScope: "create, edit, delete, record payments",
    view: "canViewInvoices",
    manage: "canManageInvoices",
  },
  {
    label: "Customers",
    manageScope: "create, edit, delete",
    view: "canViewCustomers",
    manage: "canManageCustomers",
  },
  {
    label: "Inquiries (B2B)",
    manageScope: "create, edit, delete, record payments",
    view: "canViewInquiries",
    manage: "canManageInquiries",
  },
  {
    label: "Purchase orders",
    manageScope: "create, edit, delete, manage vendors",
    view: "canViewPurchaseOrders",
    manage: "canManagePurchaseOrders",
  },
];

const checkboxClass = "size-4 rounded-[4px] border-line-strong cursor-pointer";
const matrixRow = "grid grid-cols-[minmax(0,1fr)_4rem_4rem] items-center gap-2 px-4";

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
    <label className="flex h-full cursor-pointer items-center justify-center py-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className={checkboxClass} />
      <span className="sr-only">{label}</span>
    </label>
  );
}

/**
 * Module × View/Manage checkbox matrix, shared by CreateUserForm (nothing
 * checked) and UserPermissionsForm (checked from the user's current flags).
 */
export function PermissionMatrix({ defaultValues }: { defaultValues?: UserPermissionValues }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div
        className={`${matrixRow} h-9 border-b border-line bg-surface-2 text-[12.5px] font-medium text-muted`}
      >
        <span>Module</span>
        <span className="text-center">View</span>
        <span className="text-center">Manage</span>
      </div>
      {permissionModules.map((module) => (
        <div key={module.view} className={`${matrixRow} border-b border-line/70 last:border-b-0`}>
          <div className="py-3">
            <div className="text-sm font-medium text-ink">{module.label}</div>
            <div className="text-[12.5px] text-muted">Manage: {module.manageScope}</div>
          </div>
          <PermissionCheckbox
            name={module.view}
            defaultChecked={defaultValues?.[module.view] ?? false}
            label={`View ${module.label}`}
          />
          <PermissionCheckbox
            name={module.manage}
            defaultChecked={defaultValues?.[module.manage] ?? false}
            label={`Manage ${module.label}`}
          />
        </div>
      ))}
    </div>
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
    <form action={formAction} className="flex flex-col gap-4">
      <PermissionMatrix defaultValues={defaultValues} />

      {state?.error && <p className={errorText}>{state.error}</p>}
      {state?.success && <p className="text-[13px] font-medium text-positive">Access saved.</p>}
      <button type="submit" disabled={pending} className={`${btnPrimary} self-start`}>
        {pending ? "Saving…" : "Save access"}
      </button>
    </form>
  );
}
