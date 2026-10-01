"use client";

import { useActionState } from "react";
import { deleteUserAction, type UserActionState } from "@/actions/users";
import { btnSecondary, errorText } from "@/lib/ui/classNames";

export function DeleteUserButton({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState<UserActionState, FormData>(
    async () => deleteUserAction(userId),
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <button
        type="submit"
        disabled={pending}
        className={`${btnSecondary} border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50`}
        onClick={(event) => {
          if (!confirm("Delete this account? This cannot be undone.")) {
            event.preventDefault();
          }
        }}
      >
        {pending ? "Deleting…" : "Delete account"}
      </button>
      {state?.error && <p className={errorText}>{state.error}</p>}
    </form>
  );
}
