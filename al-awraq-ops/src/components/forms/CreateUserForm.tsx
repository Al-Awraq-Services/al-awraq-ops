"use client";

import { useActionState } from "react";
import { createUserAction, type CreateUserState } from "@/actions/users";
import {
  fieldWrap,
  labelClass,
  inputClass,
  errorText,
  btnPrimary,
  mutedText,
  cardClass,
  sectionTitle,
} from "@/lib/ui/classNames";

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState<
    CreateUserState,
    FormData
  >(createUserAction, undefined);

  return (
    <form action={formAction} className={`${cardClass} flex flex-col gap-4 max-w-sm`}>
      <h2 className={sectionTitle}>Create user</h2>
      <div className={fieldWrap}>
        <label htmlFor="name" className={labelClass}>
          Name
        </label>
        <input id="name" name="name" required className={inputClass} />
      </div>
      <div className={fieldWrap}>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className={inputClass}
        />
      </div>
      <div className={fieldWrap}>
        <label htmlFor="role" className={labelClass}>
          Role
        </label>
        <select id="role" name="role" defaultValue="STAFF" className={inputClass}>
          <option value="ADMIN">Admin</option>
          <option value="STAFF">Staff</option>
          <option value="TECHNICIAN">Technician</option>
        </select>
      </div>
      {state?.error && (
        <p role="alert" className={errorText}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${btnPrimary} self-start`}>
        {pending ? "Creating…" : "Create user"}
      </button>
      <p className={`${mutedText} text-xs`}>
        The new account cannot sign in until you issue it a setup link
        below.
      </p>
    </form>
  );
}
