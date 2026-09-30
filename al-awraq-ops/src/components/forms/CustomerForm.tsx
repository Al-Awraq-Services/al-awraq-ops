"use client";

import { useActionState } from "react";
import type { CustomerActionState } from "@/actions/customers";
import {
  btnPrimary,
  inputClass,
  labelClass,
  fieldWrap,
  errorText,
} from "@/lib/ui/classNames";

type CustomerFormAction = (
  prevState: CustomerActionState,
  formData: FormData,
) => Promise<CustomerActionState>;

type CustomerFormValues = {
  name: string;
  address: string;
  contact: string;
  email: string;
  notes: string;
};

const emptyValues: CustomerFormValues = {
  name: "",
  address: "",
  contact: "",
  email: "",
  notes: "",
};

export function CustomerForm({
  mode,
  action,
  defaultValues,
}: {
  mode: "create" | "edit";
  action: CustomerFormAction;
  defaultValues?: Partial<CustomerFormValues>;
}) {
  const values = { ...emptyValues, ...defaultValues };
  const [state, formAction, pending] = useActionState<CustomerActionState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={values.name}
          className={inputClass}
        />
      </div>
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="address">
          Address
        </label>
        <input
          id="address"
          name="address"
          type="text"
          defaultValue={values.address}
          className={inputClass}
        />
      </div>
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="contact">
          Contact (phone, etc.)
        </label>
        <input
          id="contact"
          name="contact"
          type="text"
          defaultValue={values.contact}
          className={inputClass}
        />
      </div>
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={values.email}
          className={inputClass}
        />
      </div>
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={values.notes}
          className={inputClass}
        />
      </div>
      {state?.error && <p className={errorText}>{state.error}</p>}
      <button type="submit" disabled={pending} className={`${btnPrimary} self-start`}>
        {pending
          ? mode === "create"
            ? "Creating…"
            : "Saving…"
          : mode === "create"
            ? "Create customer"
            : "Save changes"}
      </button>
    </form>
  );
}
