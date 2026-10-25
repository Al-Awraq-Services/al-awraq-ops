"use client";

import { useActionState } from "react";
import { changePasswordFormAction, type PasswordActionState } from "@/actions/settings";
import {
  btnPrimary,
  inputClass,
  labelClass,
  fieldWrap,
  hintText,
  errorText,
} from "@/lib/ui/classNames";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<PasswordActionState, FormData>(
    changePasswordFormAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className={`${fieldWrap} sm:max-w-[calc(50%-0.5rem)]`}>
        <label className={labelClass} htmlFor="currentPassword">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className={fieldWrap}>
          <label className={labelClass} htmlFor="newPassword">
            New password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
          <p className={hintText}>At least 8 characters.</p>
        </div>
        <div className={fieldWrap}>
          <label className={labelClass} htmlFor="confirmNewPassword">
            Confirm new password
          </label>
          <input
            id="confirmNewPassword"
            name="confirmNewPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
      </div>
      {state?.error && <p className={errorText}>{state.error}</p>}
      {state?.success && <p className="text-[13px] font-medium text-positive">Password updated.</p>}
      <button type="submit" disabled={pending} className={`${btnPrimary} self-start`}>
        {pending ? "Updating…" : "Change password"}
      </button>
    </form>
  );
}
