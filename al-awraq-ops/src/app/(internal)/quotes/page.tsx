import Link from "next/link";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import type { QuoteStatus } from "@/generated/prisma/enums";
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

const STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  APPROVED: "Approved",
};

// Approved is green (a successful/completed outcome, per the developer's
// red/green rule) — Draft/Sent stay neutral/blue (not yet resolved either
// way), same reasoning already applied to Lead's statuses.
const STATUS_BADGE_TONE: Record<QuoteStatus, "neutral" | "blue" | "green"> = {
  DRAFT: "neutral",
  SENT: "blue",
  APPROVED: "green",
};

function isQuoteStatus(value: string | undefined): value is QuoteStatus {
  return !!value && value in STATUS_LABELS;
}

/**
 * Admin + Staff only (an assumption — see docs/OPEN_DECISIONS.md
 * "Phase D, D1"), enforced via requireRole, same pattern as /customers and
 * /leads. Search is limited to customer name + status, per the
 * already-approved fixed search-field list in OPEN_DECISIONS.md. No
 * archival view — Quote has no archive state, same reasoning as Lead.
 *
 * Layout pass (2026-09-13): stats (Draft/Sent counts + total quoted value
 * across every quote) now show first, and "+ Add quote" links to its own
 * page (`/quotes/new`) instead of an inline form — see the equivalent
 * Customer page comment for why.
 */
export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireRole(["ADMIN", "STAFF"]);

  const { q, status } = await searchParams;
  const query = q?.trim();
  const statusFilter = isQuoteStatus(status) ? status : undefined;

  const [quotes, draftCount, sentCount, approvedCount, allItems] = await Promise.all([
    db.quote.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(query
          ? {
              customer: {
                is: { name: { contains: query, mode: "insensitive" } },
              },
            }
          : {}),
      },
      include: { customer: true, items: true },
      orderBy: { createdAt: "desc" },
    }),
    db.quote.count({ where: { status: "DRAFT" } }),
    db.quote.count({ where: { status: "SENT" } }),
    db.quote.count({ where: { status: "APPROVED" } }),
    db.quoteItem.findMany({ select: { quantity: true, unitPrice: true } }),
  ]);

  const totalValue = allItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice.toNumber(),
    0,
  );

  return (
    <main className={pageWrap}>
      <h1 className={pageTitle}>Quotes</h1>

      <div className={statGrid}>
        <div className={statTile}>
          <p className={statValueClass("neutral")}>{draftCount}</p>
          <p className={statLabel}>Draft</p>
        </div>
        <div className={statTile}>
          <p className={statValueClass("blue")}>{sentCount}</p>
          <p className={statLabel}>Sent</p>
        </div>
        <div className={statTile}>
          <p className={statValueClass("green")}>{approvedCount}</p>
          <p className={statLabel}>Approved</p>
        </div>
        <div className={statTile}>
          <p className={statValueClass("green")}>AED {totalValue.toFixed(0)}</p>
          <p className={statLabel}>Total value</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Link href="/quotes/new" className={btnPrimary}>
          + Add quote
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <form method="GET" className="flex items-center gap-2 text-sm">
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className={`${inputClass} w-auto`}
          >
            <option value="">Any status</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search by customer name"
            className={`${inputClass} max-w-xs`}
          />
          <button type="submit" className={link}>
            Search
          </button>
          {(query || statusFilter) && (
            <Link href="/quotes" className={link}>
              Clear
            </Link>
          )}
        </form>

        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={thClass}>Customer</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Items</th>
                <th className={thClass}>Total</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => {
                const total = quote.items.reduce(
                  (sum, item) => sum + item.quantity * item.unitPrice.toNumber(),
                  0,
                );
                return (
                  <tr key={quote.id} className={trHover}>
                    <td className={tdClass}>
                      <Link href={`/quotes/${quote.id}`} className={link}>
                        {quote.customer.name}
                      </Link>
                    </td>
                    <td className={tdClass}>
                      <span className={badgeClass(STATUS_BADGE_TONE[quote.status])}>
                        {STATUS_LABELS[quote.status]}
                      </span>
                    </td>
                    <td className={tdClass}>{quote.items.length}</td>
                    <td className={tdClass}>AED {total.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {quotes.length === 0 && (
          <p className={mutedText}>
            {query || statusFilter
              ? "No quotes match that search."
              : "No quotes yet — create one above."}
          </p>
        )}
      </div>
    </main>
  );
}
