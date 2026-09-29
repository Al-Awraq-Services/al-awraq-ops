"use client";

import { useActionState } from "react";
import { setPasswordAction, type ActionState } from "@/actions/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation/constants";
import { fieldWrap, labelClass, inputClass, errorText, btnPrimary } from "@/lib/ui/classNames";

export function SetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    setPasswordAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4 w-full">
      <input type="hidden" name="token" value={token} />
      <div className={fieldWrap}>
        <label htmlFor="password" className={labelClass}>
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>
      <div className={fieldWrap}>
        <label htmlFor="confirmPassword" className={labelClass}>
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>
      {state?.error && (
        <p role="alert" className={errorText}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Saving…" : "Set password"}
      </button>
    </form>
  );
}
