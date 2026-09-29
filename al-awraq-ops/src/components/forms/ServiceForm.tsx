"use client";

import { useActionState } from "react";
import type { ServiceActionState } from "@/actions/services";
import {
  fieldWrap,
  labelClass,
  inputClass,
  errorText,
  btnPrimary,
  mutedText,
} from "@/lib/ui/classNames";

type ServiceFormProps = {
  action: (
    prevState: ServiceActionState,
    formData: FormData,
  ) => Promise<ServiceActionState>;
  defaultValues?: {
    name: string;
    category: string | null;
    description: string | null;
    placeholderPrice: string | null; // pre-formatted, e.g. "150.00"
    priceSource: string | null;
    priceSourceDate: string | null; // yyyy-mm-dd, for the date input
  };
  submitLabel: string;
};

/**
 * Shared by the create form (Services list page) and the edit form (Service
 * detail page). `isActive` is deliberately not a field here — it is only
 * ever changed by the separate deactivate action, never through this form.
 *
 * Price/source/date are all optional at the HTML level (no `required`) —
 * the "price implies source and date" rule is enforced server-side by
 * `serviceSchema`, not by disabling the other two fields client-side, since
 * a client-side-only rule would not satisfy docs/SECURITY_BASELINE.md.
 */
export function ServiceForm({
  action,
  defaultValues,
  submitLabel,
}: ServiceFormProps) {
  const [state, formAction, pending] = useActionState<
    ServiceActionState,
    FormData
  >(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-sm">
      <div className={fieldWrap}>
        <label htmlFor="name" className={labelClass}>
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name}
          className={inputClass}
        />
      </div>
      <div className={fieldWrap}>
        <label htmlFor="category" className={labelClass}>
          Category (optional)
        </label>
        <input
          id="category"
          name="category"
          defaultValue={defaultValues?.category ?? ""}
          className={inputClass}
        />
      </div>
      <div className={fieldWrap}>
        <label htmlFor="description" className={labelClass}>
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          className={inputClass}
          rows={3}
        />
      </div>
      <div className={fieldWrap}>
        <label htmlFor="placeholderPrice" className={labelClass}>
          Placeholder price (optional)
        </label>
        <input
          id="placeholderPrice"
          name="placeholderPrice"
          type="number"
          step="0.01"
          min="0"
          defaultValue={defaultValues?.placeholderPrice ?? ""}
          className={inputClass}
        />
        <p className={`${mutedText} text-xs`}>
          Never Al Awraq&apos;s official rate — a labeled market benchmark
          only. If set, source and date below are required.
        </p>
      </div>
      <div className={fieldWrap}>
        <label htmlFor="priceSource" className={labelClass}>
          Price source (required if a price is set)
        </label>
        <input
          id="priceSource"
          name="priceSource"
          defaultValue={defaultValues?.priceSource ?? ""}
          className={inputClass}
        />
      </div>
      <div className={fieldWrap}>
        <label htmlFor="priceSourceDate" className={labelClass}>
          Price source date (required if a price is set)
        </label>
        <input
          id="priceSourceDate"
          name="priceSourceDate"
          type="date"
          defaultValue={defaultValues?.priceSourceDate ?? ""}
          className={inputClass}
        />
      </div>
      {state?.error && (
        <p role="alert" className={errorText}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${btnPrimary} self-start`}>
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
