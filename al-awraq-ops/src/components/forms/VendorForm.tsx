"use client";

import { useActionState } from "react";
import type { VendorActionState } from "@/actions/vendors";
import {
  btnPrimary,
  inputClass,
  labelClass,
  fieldWrap,
  fieldset,
  sectionTitle,
  errorText,
} from "@/lib/ui/classNames";

type VendorFormAction = (
  prevState: VendorActionState,
  formData: FormData,
) => Promise<VendorActionState>;

type VendorFormValues = {
  name: string;
  address: string;
  contact: string;
  email: string;
  notes: string;
};

const emptyValues: VendorFormValues = {
  name: "",
  address: "",
  contact: "",
  email: "",
  notes: "",
};

/**
 * Mirrors CustomerForm.tsx (same sections), minus the Customer B2B fields
 * (type/companyName/businessTrn/contactPerson) — Vendor has none of those,
 * just name/address/contact/email/notes.
 */
export function VendorForm({
  mode,
  action,
  defaultValues,
}: {
  mode: "create" | "edit";
  action: VendorFormAction;
  defaultValues?: Partial<VendorFormValues>;
}) {
  const values = { ...emptyValues, ...defaultValues };
  const [state, formAction, pending] = useActionState<VendorActionState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className={fieldset}>
        <h3 className={sectionTitle}>Vendor</h3>
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
            ? "Create vendor"
            : "Save changes"}
      </button>
    </form>
  );
}
