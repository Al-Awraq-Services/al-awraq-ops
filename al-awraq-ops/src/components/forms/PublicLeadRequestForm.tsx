"use client";

import { useActionState } from "react";
import {
  createPublicLeadRequestAction,
  type PublicLeadRequestState,
} from "@/actions/public";
import {
  fieldWrap,
  labelClass,
  inputClass,
  errorText,
  btnPrimary,
} from "@/lib/ui/classNames";

/**
 * The public "Request a Quote" form. No login, no account — a successful
 * submission just shows an inline confirmation on the same page (there is
 * nowhere authenticated to send this visitor). See src/actions/public.ts
 * for what actually happens server-side.
 */
export function PublicLeadRequestForm({
  services,
}: {
  services: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<
    PublicLeadRequestState,
    FormData
  >(createPublicLeadRequestAction, undefined);

  if (state && "success" in state && state.success) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <p className="text-lg font-semibold text-neutral-950">
          Thanks — we&apos;ve got your request.
        </p>
        <p className="text-sm text-neutral-500 max-w-sm">
          Someone from Al Awraq Services will be in touch soon to follow up
          and put together a quote.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className={fieldWrap}>
        <label htmlFor="name" className={labelClass}>
          Name
        </label>
        <input id="name" name="name" required className={inputClass} />
      </div>
      <div className={fieldWrap}>
        <label htmlFor="phone" className={labelClass}>
          Phone
        </label>
        <input id="phone" name="phone" required className={inputClass} />
      </div>
      <div className={fieldWrap}>
        <label htmlFor="email" className={labelClass}>
          Email (optional)
        </label>
        <input id="email" name="email" type="email" className={inputClass} />
      </div>
      <div className={fieldWrap}>
        <label htmlFor="serviceOfInterest" className={labelClass}>
          What do you need? (optional)
        </label>
        <select
          id="serviceOfInterest"
          name="serviceOfInterest"
          defaultValue=""
          className={inputClass}
        >
          <option value="">Not sure / other</option>
          {services.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className={fieldWrap}>
        <label htmlFor="message" className={labelClass}>
          Tell us a bit more
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={4}
          placeholder="e.g. AC duct cleaning for a 3-bedroom apartment, available weekday mornings"
          className={inputClass}
        />
      </div>
      {state?.error && (
        <p role="alert" className={errorText}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Sending…" : "Request a quote"}
      </button>
    </form>
  );
}
