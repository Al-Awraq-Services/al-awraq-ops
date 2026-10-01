"use client";

import { useRef } from "react";
import { inputClass, labelClass, fieldWrap } from "@/lib/ui/classNames";

export type BusinessCustomerOption = {
  id: string;
  name: string;
  address: string | null;
  contact: string | null;
  companyName: string | null;
  businessTrn: string | null;
  contactPerson: string | null;
};

/**
 * Close cousin of CustomerCombobox.tsx (do not edit that file — it backs
 * the already-working B2C Invoice flow), extended for the B2B Inquiry
 * flow: three extra fields (company name, business TRN, contact person)
 * alongside name/address/contact. Renders plain inputs as part of the
 * parent InquiryForm's <form> (matching `name` attributes) — not a
 * separate mini-form.
 *
 * Typing (or picking from the datalist) a name that exactly matches an
 * existing customer auto-fills ALL FIVE fields (not just address/contact)
 * from that customer. The `customers` list passed in includes both
 * INDIVIDUAL and BUSINESS customers (so the full address book is
 * searchable here too) — individual customers simply won't have
 * companyName/businessTrn/contactPerson set, and autofill for those
 * fields is a no-op in that case. Fields stay editable afterward; this is
 * just a convenience prefill, not a lock.
 */
export function BusinessCustomerCombobox({
  customers,
  defaultValues,
}: {
  customers: BusinessCustomerOption[];
  defaultValues?: {
    name?: string;
    address?: string;
    contact?: string;
    companyName?: string;
    businessTrn?: string;
    contactPerson?: string;
  };
}) {
  const addressRef = useRef<HTMLInputElement>(null);
  const contactRef = useRef<HTMLInputElement>(null);
  const companyNameRef = useRef<HTMLInputElement>(null);
  const businessTrnRef = useRef<HTMLInputElement>(null);
  const contactPersonRef = useRef<HTMLInputElement>(null);

  function applyMatchIfExact(typedName: string) {
    const typed = typedName.trim().toLowerCase();
    if (!typed) return;
    const match = customers.find((c) => c.name.trim().toLowerCase() === typed);
    if (!match) return;
    if (addressRef.current) addressRef.current.value = match.address ?? "";
    if (contactRef.current) contactRef.current.value = match.contact ?? "";
    if (companyNameRef.current) companyNameRef.current.value = match.companyName ?? "";
    if (businessTrnRef.current) businessTrnRef.current.value = match.businessTrn ?? "";
    if (contactPersonRef.current) contactPersonRef.current.value = match.contactPerson ?? "";
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="customerName">
          Customer name
        </label>
        <input
          id="customerName"
          name="customerName"
          type="text"
          required
          list="existing-business-customers"
          autoComplete="off"
          defaultValue={defaultValues?.name ?? ""}
          onChange={(e) => applyMatchIfExact(e.target.value)}
          onBlur={(e) => applyMatchIfExact(e.target.value)}
          className={inputClass}
        />
        <datalist id="existing-business-customers">
          {customers.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>
      </div>
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="customerCompanyName">
          Company name
        </label>
        <input
          id="customerCompanyName"
          name="customerCompanyName"
          type="text"
          ref={companyNameRef}
          defaultValue={defaultValues?.companyName ?? ""}
          className={inputClass}
        />
      </div>
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="customerBusinessTrn">
          Business TRN
        </label>
        <input
          id="customerBusinessTrn"
          name="customerBusinessTrn"
          type="text"
          ref={businessTrnRef}
          defaultValue={defaultValues?.businessTrn ?? ""}
          className={inputClass}
        />
      </div>
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="customerContactPerson">
          Contact person
        </label>
        <input
          id="customerContactPerson"
          name="customerContactPerson"
          type="text"
          ref={contactPersonRef}
          defaultValue={defaultValues?.contactPerson ?? ""}
          className={inputClass}
        />
      </div>
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="customerAddress">
          Address
        </label>
        <input
          id="customerAddress"
          name="customerAddress"
          type="text"
          ref={addressRef}
          defaultValue={defaultValues?.address ?? ""}
          className={inputClass}
        />
      </div>
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="customerContact">
          Contact
        </label>
        <input
          id="customerContact"
          name="customerContact"
          type="text"
          ref={contactRef}
          defaultValue={defaultValues?.contact ?? ""}
          className={inputClass}
        />
      </div>
    </div>
  );
}
