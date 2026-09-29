"use client";

import { useActionState } from "react";
import type { LeadActionState } from "@/actions/leads";
import {
  fieldWrap,
  labelClass,
  inputClass,
  errorText,
  btnPrimary,
} from "@/lib/ui/classNames";

type LeadFormProps = {
  action: (
    prevState: LeadActionState,
    formData: FormData,
  ) => Promise<LeadActionState>;
  customers: { id: string; name: string; phone: string; isArchived: boolean }[];
  defaultValues?: {
    source: string;
    description: string;
    customerId: string | null;
    status?: string;
  };
  includeStatus?: boolean;
  submitLabel: string;
};

/**
 * Shared by the create form (Leads list page, status omitted — a new Lead
 * always starts at NEW) and the edit form (Lead detail page, status
 * included and freely editable — no lock at any status, per the approved
 * decision). Customer link is optional; the select includes archived
 * customers too, labeled as such, so a lead already linked to one never
 * loses that option from view.
 */
export function LeadForm({
  action,
  customers,
  defaultValues,
  includeStatus = false,
  submitLabel,
}: LeadFormProps) {
  const [state, formAction, pending] = useActionState<
    LeadActionState,
    FormData
  >(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-sm">
      <div className={fieldWrap}>
        <label htmlFor="source" className={labelClass}>
          Source
        </label>
        <select
          id="source"
          name="source"
          defaultValue={defaultValues?.source ?? "PHONE"}
          className={inputClass}
        >
          <option value="PHONE">Phone</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="REFERRAL">Referral</option>
          <option value="WEBSITE">Website</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <div className={fieldWrap}>
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          defaultValue={defaultValues?.description}
          className={inputClass}
          rows={3}
        />
      </div>

      <div className={fieldWrap}>
        <label htmlFor="customerId" className={labelClass}>
          Linked customer (optional)
        </label>
        <select
          id="customerId"
          name="customerId"
          defaultValue={defaultValues?.customerId ?? ""}
          className={inputClass}
        >
          <option value="">No customer linked</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.phone}){c.isArchived ? " — archived" : ""}
            </option>
          ))}
        </select>
      </div>

      {includeStatus && (
        <div className={fieldWrap}>
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? "NEW"}
            className={inputClass}
          >
            <option value="NEW">New</option>
            <option value="CONVERTED">Converted</option>
            <option value="LOST">Lost</option>
          </select>
        </div>
      )}

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
