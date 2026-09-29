import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { createLeadAction } from "@/actions/leads";
import { LeadForm } from "@/components/forms/LeadForm";
import { pageWrap, pageTitle, cardClass, linkMuted } from "@/lib/ui/classNames";

/**
 * Admin + Staff only. A dedicated create page — see the equivalent
 * Customer page for the full reasoning (docs/HANDOVER_LOG.md, layout pass
 * 2026-09-13). On success, `createLeadAction` redirects to `/leads`.
 */
export default async function NewLeadPage() {
  await requireRole(["ADMIN", "STAFF"]);

  const customers = await db.customer.findMany({ orderBy: { name: "asc" } });

  return (
    <main className={pageWrap}>
      <Link href="/leads" className={`inline-flex items-center gap-1.5 ${linkMuted}`}>
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        Leads
      </Link>

      <h1 className={pageTitle}>Add a lead</h1>

      <div className={`${cardClass} max-w-lg`}>
        <LeadForm action={createLeadAction} customers={customers} submitLabel="Create lead" />
      </div>
    </main>
  );
}
