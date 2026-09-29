import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { CreateUserForm } from "@/components/forms/CreateUserForm";
import { pageWrap, pageTitle, linkMuted } from "@/lib/ui/classNames";

/**
 * Admin-only. A dedicated create page — see the equivalent Customer page
 * for the full reasoning (docs/HANDOVER_LOG.md, layout pass 2026-09-13).
 * On success, `createUserAction` redirects to `/users`. `CreateUserForm`
 * already renders its own card surface, so it's used directly here (same
 * as it always was on the list page) rather than wrapped in a second one.
 */
export default async function NewUserPage() {
  await requireRole(["ADMIN"]);

  return (
    <main className={pageWrap}>
      <Link href="/users" className={`inline-flex items-center gap-1.5 ${linkMuted}`}>
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        Users
      </Link>

      <h1 className={pageTitle}>Add a user</h1>

      <CreateUserForm />
    </main>
  );
}
