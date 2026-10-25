"use client";

import { useState } from "react";
import { useActionState } from "react";
import type { CustomerActionState } from "@/actions/customers";
import {
  btnPrimary,
  inputClass,
  labelClass,
  fieldWrap,
  fieldset,
  sectionTitle,
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
    <form action={formAction} className="flex flex-col gap-6">
      <div className={fieldset}>
        <h3 className={sectionTitle}>Customer</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
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
        </div>

        {/* Business-only fields, shown when Type is Business. */}
        {type === "BUSINESS" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className={`${fieldWrap} sm:col-span-2`}>
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
      </div>

      <div className={fieldset}>
        <h3 className={sectionTitle}>Contact</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={fieldWrap}>
            <label className={labelClass} htmlFor="contact">
              Phone or other contact
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
        </div>
      </div>

      <div className={fieldset}>
        <h3 className={sectionTitle}>Address and notes</h3>
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
