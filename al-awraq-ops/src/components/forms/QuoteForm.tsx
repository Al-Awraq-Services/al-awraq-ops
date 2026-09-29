"use client";

import { useActionState } from "react";
import type { QuoteActionState } from "@/actions/quotes";
import {
  fieldWrap,
  labelClass,
  inputClass,
  errorText,
  btnPrimary,
} from "@/lib/ui/classNames";

type QuoteFormProps = {
  action: (
    prevState: QuoteActionState,
    formData: FormData,
  ) => Promise<QuoteActionState>;
  customers: { id: string; name: string; phone: string; isArchived: boolean }[];
  leads: { id: string; description: string; customerId: string | null }[];
  defaultValues?: {
    customerId: string;
    leadId: string | null;
    notes: string | null;
    status?: string;
  };
  includeStatus?: boolean;
  submitLabel: string;
};

/**
 * Shared by the create form (Quotes list page, status omitted — a new
 * Quote always starts DRAFT) and the edit form (Quote detail page, status
 * included). Customer is required, per docs/OPEN_DECISIONS.md "Phase D,
 * D1". The customer select includes archived customers too, labeled as
 * such, same as LeadForm.
 *
 * Invoicing pass (2026-09-13): added the "Approved" status option. This
 * form itself has no lock logic — the Quote detail page simply doesn't
 * render it at all once a Quote is Approved (a read-only summary instead,
 * same pattern as an archived Customer or a deactivated Service), so
 * there's no "disabled but visible" state to manage here.
 */
export function QuoteForm({
  action,
  customers,
  leads,
  defaultValues,
  includeStatus = false,
  submitLabel,
}: QuoteFormProps) {
  const [state, formAction, pending] = useActionState<
    QuoteActionState,
    FormData
  >(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-sm">
      <div className={fieldWrap}>
        <label htmlFor="customerId" className={labelClass}>
          Customer
        </label>
        <select
          id="customerId"
          name="customerId"
          required
          defaultValue={defaultValues?.customerId ?? ""}
          className={inputClass}
        >
          <option value="" disabled>
            Select a customer
          </option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.phone}){c.isArchived ? " — archived" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className={fieldWrap}>
        <label htmlFor="leadId" className={labelClass}>
          Originating lead (optional)
        </label>
        <select
          id="leadId"
          name="leadId"
          defaultValue={defaultValues?.leadId ?? ""}
          className={inputClass}
        >
          <option value="">No lead linked</option>
          {leads.map((l) => (
            <option key={l.id} value={l.id}>
              {l.description}
            </option>
          ))}
        </select>
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

      {includeStatus && (
        <div className={fieldWrap}>
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? "DRAFT"}
            className={inputClass}
          >
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="APPROVED">Approved</option>
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
