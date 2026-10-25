"use client";

import { useActionState } from "react";
import { deleteVendorAction } from "@/actions/vendors";
import { btnDanger, errorText } from "@/lib/ui/classNames";

export function DeleteVendorButton({ vendorId }: { vendorId: string }) {
  const [state, formAction, pending] = useActionState(
    async (_prevState: { error?: string } | undefined) => {
      return deleteVendorAction(vendorId);
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
          if (!confirm("Delete this vendor? This cannot be undone.")) {
            event.preventDefault();
          }
        }}
      >
        {pending ? "Deleting…" : "Delete vendor"}
      </button>
      {state?.error && <p className={errorText}>{state.error}</p>}
    </form>
  );
}
