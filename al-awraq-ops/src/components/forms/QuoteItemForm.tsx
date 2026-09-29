"use client";

import { useActionState } from "react";
import type { QuoteItemActionState } from "@/actions/quotes";
import { errorText, btnPrimarySm } from "@/lib/ui/classNames";

type QuoteItemFormProps = {
  action: (
    prevState: QuoteItemActionState,
    formData: FormData,
  ) => Promise<QuoteItemActionState>;
  services: { id: string; name: string }[];
  defaultValues?: {
    description: string;
    quantity: number;
    unitPrice: string; // pre-formatted, e.g. "150.00"
    serviceId: string | null;
  };
  submitLabel: string;
};

const rowInputClass =
  "rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-shadow duration-150 placeholder:text-neutral-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/10";

/**
 * One QuoteItem line — used both for the "add a line" form (no
 * defaultValues, always visible at the bottom of the item list) and for
 * each existing line's own always-editable row (defaultValues supplied,
 * one small form per row, same shape as the create form rather than a
 * separate read-only/edit-mode split). `serviceId` is an optional
 * traceability link only; per the approved decision, a line looks and
 * behaves identically whether or not one is selected — no "custom item"
 * label appears anywhere.
 */
export function QuoteItemForm({
  action,
  services,
  defaultValues,
  submitLabel,
}: QuoteItemFormProps) {
  const [state, formAction, pending] = useActionState<
    QuoteItemActionState,
    FormData
  >(action, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-start gap-2">
      <select
        name="serviceId"
        defaultValue={defaultValues?.serviceId ?? ""}
        className={`${rowInputClass} w-44`}
        aria-label="Catalog service (optional)"
      >
        <option value="">Custom line</option>
        {services.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <input
        type="text"
        name="description"
        required
        defaultValue={defaultValues?.description}
        placeholder="Description"
        className={`${rowInputClass} flex-1 min-w-[10rem]`}
        aria-label="Description"
      />
      <input
        type="number"
        name="quantity"
        min="1"
        step="1"
        required
        defaultValue={defaultValues?.quantity ?? 1}
        className={`${rowInputClass} w-20`}
        aria-label="Quantity"
      />
      <input
        type="number"
        name="unitPrice"
        min="0"
        step="0.01"
        required
        defaultValue={defaultValues?.unitPrice}
        placeholder="Unit price"
        className={`${rowInputClass} w-28`}
        aria-label="Unit price"
      />
      <button type="submit" disabled={pending} className={btnPrimarySm}>
        {pending ? "Saving…" : submitLabel}
      </button>
      {state?.error && <p role="alert" className={`${errorText} w-full`}>{state.error}</p>}
    </form>
  );
}
