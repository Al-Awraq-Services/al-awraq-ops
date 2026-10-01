"use client";

import { useActionState } from "react";
import { resetUserPasswordAction, type UserActionState } from "@/actions/users";
import { btnSecondary, inputClass, labelClass, fieldWrap, errorText } from "@/lib/ui/classNames";

export function ResetUserPasswordForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState<UserActionState, FormData>(
    resetUserPasswordAction.bind(null, userId),
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="password">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={`${inputClass} w-48`}
        />
      </div>
      <button type="submit" disabled={pending} className={btnSecondary}>
        {pending ? "Resetting…" : "Reset password"}
      </button>
      {state?.error && <p className={`${errorText} w-full`}>{state.error}</p>}
      {state?.success && (
        <p className="w-full text-sm font-medium text-emerald-700">Password reset.</p>
      )}
    </form>
  );
}
