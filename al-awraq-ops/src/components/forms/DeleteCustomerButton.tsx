"use client";

import { useActionState } from "react";
import { deleteCustomerAction } from "@/actions/customers";
import { btnDanger, errorText } from "@/lib/ui/classNames";

export function DeleteCustomerButton({ customerId }: { customerId: string }) {
  const [state, formAction, pending] = useActionState(
    async (_prevState: { error?: string } | undefined) => {
      return deleteCustomerAction(customerId);
    },
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <button
        type="submit"
        disabled={pending}
        className={btnDanger}
        onClick={(event) => {
          if (!confirm("Delete this customer? This cannot be undone.")) {
            event.preventDefault();
          }
        }}
      >
        {pending ? "Deleting…" : "Delete customer"}
      </button>
      {state?.error && <p className={errorText}>{state.error}</p>}
    </form>
  );
}
