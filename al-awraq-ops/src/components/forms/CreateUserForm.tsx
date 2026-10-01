"use client";

import { useActionState } from "react";
import { createUserAction, type UserActionState } from "@/actions/users";
import { btnPrimary, inputClass, labelClass, fieldWrap, errorText } from "@/lib/ui/classNames";

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState<UserActionState, FormData>(
    createUserAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="name">
          Name
        </label>
        <input id="name" name="name" type="text" required className={inputClass} />
      </div>
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="username">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="lowercase, no spaces"
          className={inputClass}
        />
      </div>
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>

      <fieldset className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4">
        <legend className="px-1 text-sm font-medium text-neutral-700">Access</legend>
        <label className="flex items-center gap-2 text-sm text-neutral-800">
          <input type="checkbox" name="canViewInvoices" className="h-4 w-4 rounded" />
          View Invoices
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-800">
          <input type="checkbox" name="canManageInvoices" className="h-4 w-4 rounded" />
          Manage Invoices (create, edit, delete, record payments)
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-800">
          <input type="checkbox" name="canViewCustomers" className="h-4 w-4 rounded" />
          View Customers
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-800">
          <input type="checkbox" name="canManageCustomers" className="h-4 w-4 rounded" />
          Manage Customers (create, edit, delete)
        </label>
        <p className="mt-1 text-xs text-neutral-500">
          The Dashboard and this Users screen are always main-account-only — not something
          you can grant here. This account will also never see aggregate totals
          (revenue, outstanding balance, customer balances), only a single invoice&apos;s
          own amount when actually viewing it.
        </p>
      </fieldset>

      {state?.error && <p className={errorText}>{state.error}</p>}
      <button type="submit" disabled={pending} className={`${btnPrimary} self-start`}>
        {pending ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
