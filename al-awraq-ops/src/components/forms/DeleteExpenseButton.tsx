"use client";

import { useActionState } from "react";
import { deleteExpenseAction } from "@/actions/expenses";
import { linkDanger, errorText } from "@/lib/ui/classNames";

/** Mirrors src/components/forms/DeleteCustomerButton.tsx's confirm() guard pattern. */
export function DeleteExpenseButton({ expenseId }: { expenseId: string }) {
  const [state, formAction, pending] = useActionState(
    async (_prevState: { error?: string } | undefined) => {
      return deleteExpenseAction(expenseId);
    },
    undefined,
  );

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={pending}
        className={linkDanger}
        onClick={(event) => {
          if (!confirm("Delete this expense? This cannot be undone.")) {
            event.preventDefault();
          }
        }}
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {state?.error && <p className={errorText}>{state.error}</p>}
    </form>
  );
}
