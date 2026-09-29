"use client";

import { useActionState } from "react";
import { issueResetTokenAction, type IssueTokenState } from "@/actions/users";
import { link, errorText } from "@/lib/ui/classNames";

/**
 * Shows the raw setup/reset token exactly once, on-screen, for the Admin
 * to copy and relay out-of-band. It is never placed in a URL, never
 * stored client-side beyond this render, and never logged — see
 * src/actions/users.ts issueResetTokenAction.
 */
export function IssueResetTokenButton({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState<
    IssueTokenState,
    FormData
  >(issueResetTokenAction.bind(null, userId), undefined);

  return (
    <form action={formAction} className="flex flex-col gap-1 items-start">
      <button type="submit" disabled={pending} className={`${link} disabled:opacity-50`}>
        {pending ? "Issuing…" : "Issue setup/reset link"}
      </button>
      {state && "error" in state && (
        <p role="alert" className={`${errorText} text-xs`}>
          {state.error}
        </p>
      )}
      {state && "token" in state && (
        <div className="text-xs bg-blue-50 border border-blue-200 rounded-md p-2 max-w-xs break-all">
          <p className="font-medium text-blue-900">
            One-time link for {state.userEmail} — copy now, shown only once:
          </p>
          <p className="text-blue-800">{`/reset-password?token=${state.token}`}</p>
        </div>
      )}
    </form>
  );
}
