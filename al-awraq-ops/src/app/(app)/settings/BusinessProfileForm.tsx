"use client";

import { useActionState } from "react";
import {
  updateBusinessProfileAction,
  type SettingsActionState,
} from "@/actions/settings";
import {
  btnPrimary,
  inputClass,
  labelClass,
  fieldWrap,
  fieldset,
  sectionTitle,
  hintText,
  errorText,
} from "@/lib/ui/classNames";

type BusinessProfileFormValues = {
  legalName: string;
  trn: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  defaultTaxRatePercent: number;
  nextInvoiceNumber: number;
  invoiceNumberPrefix: string;
  invoiceNumberPadding: number;
};

export function BusinessProfileForm({
  defaultValues,
}: {
  defaultValues: BusinessProfileFormValues;
}) {
  const [state, formAction, pending] = useActionState<SettingsActionState, FormData>(
    updateBusinessProfileAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className={fieldset}>
        <div>
          <h3 className={sectionTitle}>Company</h3>
          <p className={`${hintText} mt-0.5`}>Shown on invoice, inquiry and purchase order PDFs.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <div className={fieldWrap}>
            <label className={labelClass} htmlFor="legalName">
              Legal name
            </label>
            <input
              id="legalName"
              name="legalName"
              type="text"
              required
              defaultValue={defaultValues.legalName}
              className={inputClass}
            />
          </div>
          <div className={fieldWrap}>
            <label className={labelClass} htmlFor="trn">
              TRN
            </label>
            <input
              id="trn"
              name="trn"
              type="text"
              defaultValue={defaultValues.trn}
              className={inputClass}
            />
          </div>
        </div>
        <div className={fieldWrap}>
          <label className={labelClass} htmlFor="address">
            Address
          </label>
          <input
            id="address"
            name="address"
            type="text"
            defaultValue={defaultValues.address}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className={fieldWrap}>
            <label className={labelClass} htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="text"
              defaultValue={defaultValues.phone}
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
              defaultValue={defaultValues.email}
              className={inputClass}
            />
          </div>
          <div className={fieldWrap}>
            <label className={labelClass} htmlFor="website">
              Website
            </label>
            <input
              id="website"
              name="website"
              type="text"
              defaultValue={defaultValues.website}
              className={inputClass}
            />
          </div>
        </div>
        <p className={hintText}>
          The logo image isn&apos;t editable from this screen yet. That&apos;s a known
          follow-up, not an oversight.
        </p>
      </div>

      <div className={fieldset}>
        <h3 className={sectionTitle}>Invoicing defaults</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={fieldWrap}>
            <label className={labelClass} htmlFor="defaultTaxRatePercent">
              Default tax rate (%)
            </label>
            <input
              id="defaultTaxRatePercent"
              name="defaultTaxRatePercent"
              type="number"
              step="0.01"
              min={0}
              max={100}
              required
              defaultValue={defaultValues.defaultTaxRatePercent}
              className={inputClass}
            />
          </div>
          <div className={fieldWrap}>
            <label className={labelClass} htmlFor="nextInvoiceNumber">
              Next invoice number
            </label>
            <input
              id="nextInvoiceNumber"
              name="nextInvoiceNumber"
              type="number"
              step="1"
              min={1}
              required
              defaultValue={defaultValues.nextInvoiceNumber}
              className={inputClass}
            />
          </div>
          <div className={fieldWrap}>
            <label className={labelClass} htmlFor="invoiceNumberPrefix">
              Invoice number prefix
            </label>
            <input
              id="invoiceNumberPrefix"
              name="invoiceNumberPrefix"
              type="text"
              defaultValue={defaultValues.invoiceNumberPrefix}
              className={inputClass}
            />
          </div>
          <div className={fieldWrap}>
            <label className={labelClass} htmlFor="invoiceNumberPadding">
              Invoice number padding
            </label>
            <input
              id="invoiceNumberPadding"
              name="invoiceNumberPadding"
              type="number"
              step="1"
              min={1}
              max={10}
              required
              defaultValue={defaultValues.invoiceNumberPadding}
              className={inputClass}
            />
            <p className={hintText}>Zero-fills the number to this many digits (5 gives 01064).</p>
          </div>
        </div>
      </div>

      {state?.error && <p className={errorText}>{state.error}</p>}
      {state?.success && (
        <p className="text-[13px] font-medium text-positive">Business details saved.</p>
      )}
      <button type="submit" disabled={pending} className={`${btnPrimary} self-start`}>
        {pending ? "Saving…" : "Save business details"}
      </button>
    </form>
  );
}
