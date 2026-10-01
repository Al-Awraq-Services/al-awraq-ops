"use client";

import { useState } from "react";
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
  type: "INDIVIDUAL" | "BUSINESS";
  companyName: string;
  businessTrn: string;
  contactPerson: string;
};

const emptyValues: CustomerFormValues = {
  name: "",
  address: "",
  contact: "",
  email: "",
  notes: "",
  type: "INDIVIDUAL",
  companyName: "",
  businessTrn: "",
  contactPerson: "",
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
  const [type, setType] = useState<"INDIVIDUAL" | "BUSINESS">(values.type);
  const [state, formAction, pending] = useActionState<CustomerActionState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="type">
          Type
        </label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value as "INDIVIDUAL" | "BUSINESS")}
          className={inputClass}
        >
          <option value="INDIVIDUAL">Individual</option>
          <option value="BUSINESS">Business</option>
        </select>
      </div>
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

      {type === "BUSINESS" && (
        <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 p-4">
          <div className={fieldWrap}>
            <label className={labelClass} htmlFor="companyName">
              Company name
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              defaultValue={values.companyName}
              className={inputClass}
            />
          </div>
          <div className={fieldWrap}>
            <label className={labelClass} htmlFor="businessTrn">
              Business TRN
            </label>
            <input
              id="businessTrn"
              name="businessTrn"
              type="text"
              defaultValue={values.businessTrn}
              className={inputClass}
            />
          </div>
          <div className={fieldWrap}>
            <label className={labelClass} htmlFor="contactPerson">
              Contact person
            </label>
            <input
              id="contactPerson"
              name="contactPerson"
              type="text"
              defaultValue={values.contactPerson}
              className={inputClass}
            />
          </div>
        </div>
      )}

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
