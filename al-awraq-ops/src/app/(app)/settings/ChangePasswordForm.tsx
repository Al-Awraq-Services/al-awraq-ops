"use client";

import { useActionState } from "react";
import { changePasswordFormAction, type PasswordActionState } from "@/actions/settings";
import { btnPrimary, inputClass, labelClass, fieldWrap, errorText } from "@/lib/ui/classNames";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<PasswordActionState, FormData>(
    changePasswordFormAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className={fieldWrap}>
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
      {state?.error && <p className={errorText}>{state.error}</p>}
      {state?.success && (
        <p className="text-sm font-medium text-emerald-700">Password updated.</p>
      )}
      <button type="submit" disabled={pending} className={`${btnPrimary} self-start`}>
        {pending ? "Updating…" : "Change password"}
      </button>
    </form>
  );
}
