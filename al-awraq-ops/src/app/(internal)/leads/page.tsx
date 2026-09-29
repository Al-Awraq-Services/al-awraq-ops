import Link from "next/link";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import type { LeadSource, LeadStatus } from "@/generated/prisma/enums";
import {
  pageWrap,
  pageTitle,
  inputClass,
  link,
  btnPrimary,
  statGrid,
  statTile,
  statLabel,
  statValueClass,
  mutedText,
  tableWrap,
  table,
  thClass,
  tdClass,
  trHover,
  badgeClass,
} from "@/lib/ui/classNames";

const SOURCE_LABELS: Record<LeadSource, string> = {
  PHONE: "Phone",
  WHATSAPP: "WhatsApp",
  REFERRAL: "Referral",
  WEBSITE: "Website",
  OTHER: "Other",
};

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

function isLeadSource(value: string | undefined): value is LeadSource {
  return !!value && value in SOURCE_LABELS;
}

/**
 * Admin + Staff only, enforced via requireRole — a Technician session
 * hitting this URL directly is redirected server-side before any lead
 * data is fetched, matching the pattern already used by /customers.
 *
 * Search is limited to source, customer name, and phone — nothing else.
 * No status filter, no archival view — Lead has no archive state; every
 * status is shown together, since none is approved to be hidden.
 *
 * Layout pass (2026-09-13): stats (New/Converted/Lost counts) now show
 * first, and "+ Add lead" links to its own page (`/leads/new`) instead of
 * an inline form — see the equivalent Customer page comment for why.
 * `CONVERTED` moved from a solid black badge to green (a successful
 * outcome), matching the new green-for-success rule applied across every
 * status badge.
 */
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string }>;
}) {
  await requireRole(["ADMIN", "STAFF"]);

  const { q, source } = await searchParams;
  const query = q?.trim();
  const sourceFilter = isLeadSource(source) ? source : undefined;

  const [leads, newCount, convertedCount, lostCount] = await Promise.all([
    db.lead.findMany({
      where: {
        ...(sourceFilter ? { source: sourceFilter } : {}),
        ...(query
          ? {
              customer: {
                is: {
                  OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { phone: { contains: query, mode: "insensitive" } },
                  ],
                },
              },
            }
          : {}),
      },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    }),
    db.lead.count({ where: { status: "NEW" } }),
    db.lead.count({ where: { status: "CONVERTED" } }),
    db.lead.count({ where: { status: "LOST" } }),
  ]);

  return (
    <main className={pageWrap}>
      <h1 className={pageTitle}>Leads</h1>

      <div className={statGrid}>
        <div className={statTile}>
          <p className={statValueClass("blue")}>{newCount}</p>
          <p className={statLabel}>New</p>
        </div>
        <div className={statTile}>
          <p className={statValueClass("green")}>{convertedCount}</p>
          <p className={statLabel}>Converted</p>
        </div>
        <div className={statTile}>
          <p className={statValueClass("red")}>{lostCount}</p>
          <p className={statLabel}>Lost</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Link href="/leads/new" className={btnPrimary}>
          + Add lead
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <form method="GET" className="flex items-center gap-2 text-sm">
          <select
            name="source"
            defaultValue={sourceFilter ?? ""}
            className={`${inputClass} w-auto`}
          >
            <option value="">Any source</option>
            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search by customer name or phone"
            className={`${inputClass} max-w-xs`}
          />
          <button type="submit" className={link}>
            Search
          </button>
          {(query || sourceFilter) && (
            <Link href="/leads" className={link}>
              Clear
            </Link>
          )}
        </form>

        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={thClass}>Source</th>
                <th className={thClass}>Description</th>
                <th className={thClass}>Customer</th>
                <th className={thClass}>Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className={trHover}>
                  <td className={tdClass}>{SOURCE_LABELS[lead.source]}</td>
                  <td className={`${tdClass} max-w-xs truncate`}>
                    <Link href={`/leads/${lead.id}`} className={link}>
                      {lead.description}
                    </Link>
                  </td>
                  <td className={tdClass}>
                    {lead.customer ? (
                      lead.customer.name
                    ) : (
                      <span className={mutedText}>No customer linked</span>
                    )}
                  </td>
                  <td className={tdClass}>
                    <span className={badgeClass(STATUS_BADGE_TONE[lead.status])}>
                      {STATUS_LABELS[lead.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {leads.length === 0 && (
          <p className={mutedText}>
            {query || sourceFilter
              ? "No leads match that search."
              : "No leads yet — create one above."}
          </p>
        )}
      </div>
    </main>
  );
}
