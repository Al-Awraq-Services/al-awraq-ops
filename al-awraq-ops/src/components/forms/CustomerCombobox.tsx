"use client";

import { useRef } from "react";
import { inputClass, labelClass, fieldWrap } from "@/lib/ui/classNames";

export type CustomerOption = {
  id: string;
  name: string;
  address: string | null;
  contact: string | null;
};

/**
 * Renders the Customer name / Address / Contact inputs as part of the
 * parent InvoiceForm's <form> (plain inputs with matching `name`
 * attributes) — this is not a separate mini-form. Typing (or picking from
 * the datalist) a name that exactly matches an existing customer
 * auto-fills the address/contact fields from that customer; they stay
 * editable afterward, it's just a convenience prefill, not a lock.
 */
export function CustomerCombobox({
  customers,
  defaultValues,
}: {
  customers: CustomerOption[];
  defaultValues?: { name?: string; address?: string; contact?: string };
}) {
  const addressRef = useRef<HTMLInputElement>(null);
  const contactRef = useRef<HTMLInputElement>(null);

  function applyMatchIfExact(typedName: string) {
    const typed = typedName.trim().toLowerCase();
    if (!typed) return;
    const match = customers.find((c) => c.name.trim().toLowerCase() === typed);
    if (!match) return;
    if (addressRef.current) addressRef.current.value = match.address ?? "";
    if (contactRef.current) contactRef.current.value = match.contact ?? "";
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
          list="existing-customers"
          autoComplete="off"
          defaultValue={defaultValues?.name ?? ""}
          onChange={(e) => applyMatchIfExact(e.target.value)}
          onBlur={(e) => applyMatchIfExact(e.target.value)}
          className={inputClass}
        />
        <datalist id="existing-customers">
          {customers.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>
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
