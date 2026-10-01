"use client";

import { useActionState } from "react";
import { deleteVendorAction } from "@/actions/vendors";
import { btnSecondary, errorText } from "@/lib/ui/classNames";

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
        className={`${btnSecondary} border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50`}
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
