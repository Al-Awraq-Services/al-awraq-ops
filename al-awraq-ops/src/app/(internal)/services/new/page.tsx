import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { createServiceAction } from "@/actions/services";
import { ServiceForm } from "@/components/forms/ServiceForm";
import { pageWrap, pageTitle, cardClass, linkMuted } from "@/lib/ui/classNames";

/**
 * Admin-only. A dedicated create page — see the equivalent Customer page
 * for the full reasoning (docs/HANDOVER_LOG.md, layout pass 2026-09-13).
 * On success, `createServiceAction` redirects to `/services`.
 */
export default async function NewServicePage() {
  await requireRole(["ADMIN"]);

  return (
    <main className={pageWrap}>
      <Link href="/services" className={`inline-flex items-center gap-1.5 ${linkMuted}`}>
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        Services
      </Link>

      <h1 className={pageTitle}>Add a service</h1>

      <div className={`${cardClass} max-w-lg`}>
        <ServiceForm action={createServiceAction} submitLabel="Create service" />
      </div>
    </main>
  );
}
