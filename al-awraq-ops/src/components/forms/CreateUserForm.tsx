"use client";

import { useActionState } from "react";
import { createUserAction, type UserActionState } from "@/actions/users";
import { PermissionMatrix } from "@/components/forms/UserPermissionsForm";
import {
  btnPrimary,
  inputClass,
  labelClass,
  fieldWrap,
  fieldset,
  sectionTitle,
  hintText,
  errorText,
} from "@/lib/ui/classNames";

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState<UserActionState, FormData>(
    createUserAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className={fieldset}>
        <h2 className={sectionTitle}>Sign-in details</h2>
        <div className={fieldWrap}>
          <label className={labelClass} htmlFor="name">
            Name
          </label>
          <input id="name" name="name" type="text" required className={inputClass} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <p className={hintText}>At least 8 characters.</p>
          </div>
        </div>
      </div>

      <div className={fieldset}>
        <h2 className={sectionTitle}>Access</h2>
        <PermissionMatrix />
        <p className={hintText}>
          The Dashboard, Accounting, and this Users screen are always main-account-only and
          can&apos;t be granted here. This account will also never see aggregate totals
          (revenue, outstanding balance, customer balances), only a single document&apos;s own
          amount when viewing it.
        </p>
      </div>

      {state?.error && <p className={errorText}>{state.error}</p>}
      <button type="submit" disabled={pending} className={`${btnPrimary} self-start`}>
        {pending ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
