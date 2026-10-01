"use client";

import { useActionState } from "react";
import { loginAction, type AuthActionState } from "@/actions/authGate";
import { btnPrimary, inputClass, labelClass, fieldWrap, errorText } from "@/lib/ui/classNames";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    loginAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="username">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          autoFocus
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
          autoComplete="current-password"
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
