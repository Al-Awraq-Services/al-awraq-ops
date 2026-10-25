"use client";

import { useActionState } from "react";
import { deleteUserAction, type UserActionState } from "@/actions/users";
import { btnDanger, errorText } from "@/lib/ui/classNames";

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
        className={btnDanger}
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
