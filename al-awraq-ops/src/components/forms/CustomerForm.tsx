"use client";

import { useActionState } from "react";
import type { CustomerActionState } from "@/actions/customers";
import {
  fieldWrap,
  labelClass,
  inputClass,
  errorText,
  btnPrimary,
} from "@/lib/ui/classNames";

type CustomerFormProps = {
  action: (
    prevState: CustomerActionState,
    formData: FormData,
  ) => Promise<CustomerActionState>;
  defaultValues?: {
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    notes: string | null;
  };
  submitLabel: string;
};

/**
 * Shared by the create form (Customers list page) and the edit form
 * (Customer detail page) — same fields, same validation, per the approved
 * Phase C data model: name and phone required, email/address/notes
 * optional. No other fields exist here.
 */
export function CustomerForm({
  action,
  defaultValues,
  submitLabel,
}: CustomerFormProps) {
  const [state, formAction, pending] = useActionState<
    CustomerActionState,
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
        <label htmlFor="phone" className={labelClass}>
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          required
          defaultValue={defaultValues?.phone}
          className={inputClass}
        />
      </div>
      <div className={fieldWrap}>
        <label htmlFor="email" className={labelClass}>
          Email (optional)
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={defaultValues?.email ?? ""}
          className={inputClass}
        />
      </div>
      <div className={fieldWrap}>
        <label htmlFor="address" className={labelClass}>
          Address (optional)
        </label>
        <input
          id="address"
          name="address"
          defaultValue={defaultValues?.address ?? ""}
          className={inputClass}
        />
      </div>
      <div className={fieldWrap}>
        <label htmlFor="notes" className={labelClass}>
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          defaultValue={defaultValues?.notes ?? ""}
          className={inputClass}
          rows={3}
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
