"use client";

import { useActionState } from "react";
import {
  setInitialPasswordAction,
  loginAction,
  type AuthActionState,
} from "@/actions/authGate";
import { btnPrimary, inputClass, labelClass, fieldWrap, errorText } from "@/lib/ui/classNames";

export function LoginForm({ hasPassword }: { hasPassword: boolean }) {
  const action = hasPassword ? loginAction : setInitialPasswordAction;
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    action,
    undefined,
  );

  if (!hasPassword) {
    return (
      <form action={formAction} className="flex flex-col gap-4">
        <p className="text-sm text-neutral-600">
          First time here — set the password that will unlock this app on every
          device. There are no accounts; this one password is all it takes.
        </p>
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
            className={inputClass}
          />
        </div>
        <div className={fieldWrap}>
          <label className={labelClass} htmlFor="confirmPassword">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
        {state?.error && <p className={errorText}>{state.error}</p>}
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Setting password…" : "Set password and continue"}
        </button>
      </form>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          autoFocus
          className={inputClass}
        />
      </div>
      {state?.error && <p className={errorText}>{state.error}</p>}
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
