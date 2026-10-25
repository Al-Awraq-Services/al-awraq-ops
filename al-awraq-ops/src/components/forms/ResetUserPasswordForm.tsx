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
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className={`${fieldWrap} w-full sm:w-64`}>
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
          className={inputClass}
        />
      </div>
      <button type="submit" disabled={pending} className={btnSecondary}>
        {pending ? "Resetting…" : "Reset password"}
      </button>
      {state?.error && <p className={`${errorText} w-full`}>{state.error}</p>}
      {state?.success && (
        <p className="w-full text-[13px] font-medium text-positive">Password reset.</p>
      )}
    </form>
  );
}
