"use client";

import { useActionState } from "react";
import { loginAction, type ActionState } from "@/actions/auth";
import { fieldWrap, labelClass, inputClass, errorText, btnPrimary } from "@/lib/ui/classNames";

/**
 * Client Component only for pending/error UX (useActionState requires
 * "use client"). The actual authentication check happens entirely inside
 * loginAction on the server — this component never decides whether a
 * login is valid, it only displays what the server already decided.
 */
export function LoginForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    loginAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4 w-full">
      <div className={fieldWrap}>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className={inputClass}
        />
      </div>
      <div className={fieldWrap}>
        <label htmlFor="password" className={labelClass}>
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
      {state?.error && (
        <p role="alert" className={errorText}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
