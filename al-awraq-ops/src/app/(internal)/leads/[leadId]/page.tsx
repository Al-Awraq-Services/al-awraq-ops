import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { updateLeadAction } from "@/actions/leads";
import { LeadForm } from "@/components/forms/LeadForm";
import type { LeadStatus } from "@/generated/prisma/enums";
import { pageWrap, pageTitle, cardClass, badgeClass } from "@/lib/ui/classNames";

const STATUS_BADGE_TONE: Record<LeadStatus, "blue" | "green" | "red"> = {
  NEW: "blue",
  CONVERTED: "green",
  LOST: "red",
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONVERTED: "Converted",
  LOST: "Lost",
};

/**
 * Admin + Staff only. Editable at every status — no lock. No conversion
 * action, no delete action, per the approved C3 scope.
 */
export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  await requireRole(["ADMIN", "STAFF"]);

  const { leadId } = await params;
  const [lead, customers] = await Promise.all([
    db.lead.findUnique({ where: { id: leadId } }),
    db.customer.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!lead) notFound();

  return (
    <main className={pageWrap}>
      <div className="flex items-center gap-3">
        <h1 className={pageTitle}>Lead</h1>
        <span className={badgeClass(STATUS_BADGE_TONE[lead.status])}>
          {STATUS_LABELS[lead.status]}
        </span>
      </div>

      <div className={cardClass}>
        <LeadForm
          key={`${lead.source}|${lead.description}|${lead.customerId}|${lead.status}`}
          action={updateLeadAction.bind(null, lead.id)}
          customers={customers}
          defaultValues={{
            source: lead.source,
            description: lead.description,
            customerId: lead.customerId,
            status: lead.status,
          }}
          includeStatus
          submitLabel="Save changes"
        />
      </div>
    </main>
  );
}
