import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { createQuoteAction } from "@/actions/quotes";
import { QuoteForm } from "@/components/forms/QuoteForm";
import { pageWrap, pageTitle, cardClass, linkMuted } from "@/lib/ui/classNames";

/**
 * Admin + Staff only. A dedicated create page — see the equivalent
 * Customer page for the full reasoning (docs/HANDOVER_LOG.md, layout pass
 * 2026-09-13). Unlike Customer/Lead/Service/User, `createQuoteAction`
 * redirects to the new Quote's own detail page (`/quotes/[id]`), not back
 * to `/quotes` — creating a Quote is step one of a two-step flow (create,
 * then add line items), so there's a deliberate next stop rather than
 * "close and done."
 */
export default async function NewQuotePage() {
  await requireRole(["ADMIN", "STAFF"]);

  const [customers, leads] = await Promise.all([
    db.customer.findMany({ orderBy: { name: "asc" } }),
    db.lead.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <main className={pageWrap}>
      <Link href="/quotes" className={`inline-flex items-center gap-1.5 ${linkMuted}`}>
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        Quotes
      </Link>

      <h1 className={pageTitle}>Add a quote</h1>

      <div className={`${cardClass} max-w-lg`}>
        <QuoteForm
          action={createQuoteAction}
          customers={customers}
          leads={leads}
          submitLabel="Create quote"
        />
      </div>
    </main>
  );
}
