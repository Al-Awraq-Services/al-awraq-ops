"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMainAccountForAction } from "@/lib/auth/appAuth";
import { parseExpenseFormData } from "@/lib/validation/expense";

export type ExpenseActionState = { error?: string; success?: boolean } | undefined;

/**
 * The Accounting Machine (/accounting) is main-account-only (see
 * appAuth.ts — requireMainAccountForAction), same hard rule as the page
 * itself. Expenses are rendered as a plain inline list/form on that one
 * page, so both actions just revalidate it rather than redirecting.
 */
export async function createExpenseAction(
  _prevState: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  await requireMainAccountForAction();

  const parsed = parseExpenseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid expense details." };
  }

  const { data } = parsed;
  await db.expense.create({
    data: {
      date: data.date,
      category: data.category,
      description: data.description ?? null,
      amount: data.amount,
    },
  });

  revalidatePath("/accounting");
  return { success: true };
}

export async function deleteExpenseAction(expenseId: string): Promise<{ error?: string }> {
  await requireMainAccountForAction();

  await db.expense.delete({ where: { id: expenseId } });

  revalidatePath("/accounting");
  return {};
}
