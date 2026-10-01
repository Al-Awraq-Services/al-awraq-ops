"use client";

import { useRef } from "react";
import { inputClass, labelClass, fieldWrap } from "@/lib/ui/classNames";

export type VendorOption = {
  id: string;
  name: string;
  address: string | null;
  contact: string | null;
};

/**
 * Renders the Vendor name / Address / Contact inputs as part of the
 * parent PurchaseOrderForm's <form> (plain inputs with matching `name`
 * attributes) — this is not a separate mini-form. Typing (or picking from
 * the datalist) a name that exactly matches an existing vendor auto-fills
 * the address/contact fields from that vendor; they stay editable
 * afterward, it's just a convenience prefill, not a lock. Mirrors
 * CustomerCombobox.tsx exactly, for Vendor.
 */
export function VendorCombobox({
  vendors,
  defaultValues,
}: {
  vendors: VendorOption[];
  defaultValues?: { name?: string; address?: string; contact?: string };
}) {
  const addressRef = useRef<HTMLInputElement>(null);
  const contactRef = useRef<HTMLInputElement>(null);

  function applyMatchIfExact(typedName: string) {
    const typed = typedName.trim().toLowerCase();
    if (!typed) return;
    const match = vendors.find((v) => v.name.trim().toLowerCase() === typed);
    if (!match) return;
    if (addressRef.current) addressRef.current.value = match.address ?? "";
    if (contactRef.current) contactRef.current.value = match.contact ?? "";
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="vendorName">
          Vendor name
        </label>
        <input
          id="vendorName"
          name="vendorName"
          type="text"
          required
          list="existing-vendors"
          autoComplete="off"
          defaultValue={defaultValues?.name ?? ""}
          onChange={(e) => applyMatchIfExact(e.target.value)}
          onBlur={(e) => applyMatchIfExact(e.target.value)}
          className={inputClass}
        />
        <datalist id="existing-vendors">
          {vendors.map((v) => (
            <option key={v.id} value={v.name} />
          ))}
        </datalist>
      </div>
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="vendorAddress">
          Address
        </label>
        <input
          id="vendorAddress"
          name="vendorAddress"
          type="text"
          ref={addressRef}
          defaultValue={defaultValues?.address ?? ""}
          className={inputClass}
        />
      </div>
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="vendorContact">
          Contact
        </label>
        <input
          id="vendorContact"
          name="vendorContact"
          type="text"
          ref={contactRef}
          defaultValue={defaultValues?.contact ?? ""}
          className={inputClass}
        />
      </div>
    </div>
  );
}
