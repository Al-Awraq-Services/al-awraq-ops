"use client";

import { useActionState } from "react";
import { createExpenseAction, type ExpenseActionState } from "@/actions/expenses";
import { btnPrimarySm, inputClass, labelClass, fieldWrap, errorText } from "@/lib/ui/classNames";

function todayInputValue(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Inline "+ Add expense" form on the Accounting Machine page (main-account-only). */
export function ExpenseForm() {
  const [state, formAction, pending] = useActionState<ExpenseActionState, FormData>(
    createExpenseAction,
    undefined,
  );

  return (
    <form
      action={formAction}
      key={state?.success ? "reset" : "form"}
      className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_1.5fr_auto_auto] sm:items-end"
    >
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="expense-date">
          Date
        </label>
        <input
          id="expense-date"
          name="date"
          type="date"
          required
          defaultValue={todayInputValue()}
          className={inputClass}
        />
      </div>
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="expense-category">
          Category
        </label>
        <input
          id="expense-category"
          name="category"
          type="text"
          list="expense-categories"
          required
          className={inputClass}
          placeholder="Rent"
        />
        <datalist id="expense-categories">
          <option value="Rent" />
          <option value="Utilities" />
          <option value="Salaries" />
          <option value="Fuel" />
          <option value="Supplies" />
          <option value="Maintenance" />
          <option value="Other" />
        </datalist>
      </div>
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="expense-description">
          Description
        </label>
        <input
          id="expense-description"
          name="description"
          type="text"
          className={inputClass}
          placeholder="Optional"
        />
      </div>
      <div className={fieldWrap}>
        <label className={labelClass} htmlFor="expense-amount">
          Amount (AED)
        </label>
        <input
          id="expense-amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          className={inputClass}
        />
      </div>
      <button type="submit" disabled={pending} className={btnPrimarySm}>
        {pending ? "Adding…" : "+ Add expense"}
      </button>
      {state?.error && <p className={`${errorText} sm:col-span-5`}>{state.error}</p>}
    </form>
  );
}
