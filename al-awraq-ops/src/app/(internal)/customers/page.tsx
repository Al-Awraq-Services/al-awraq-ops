import Link from "next/link";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import {
  pageWrap,
  pageTitle,
  inputClass,
  link,
  linkMuted,
  btnPrimary,
  statGrid,
  statTile,
  statLabel,
  statValueClass,
  tableWrap,
  table,
  thClass,
  tdClass,
  trHover,
  badgeClass,
  mutedText,
} from "@/lib/ui/classNames";

/**
 * Admin + Staff only, enforced here via requireRole — a Technician session
 * hitting this URL directly is redirected server-side before any customer
 * data is fetched (matches the pattern already used by /users).
 *
 * Search is limited to name/phone, per the approved scope — nothing else.
 * "Active" / "Archived" is a view rule, not a filter: archived customers
 * never silently vanish, they move to their own explicit view.
 *
 * Layout pass (2026-09-13): stats (Active/Archived counts) now show first,
 * and "+ Add customer" links to its own page (`/customers/new`) instead of
 * revealing an inline form — an inline `<details>` reveal was tried first
 * and replaced the same day; it left a large empty gap next to the narrow
 * form. See docs/HANDOVER_LOG.md.
 */
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string }>;
}) {
  await requireRole(["ADMIN", "STAFF"]);

  const { q, view } = await searchParams;
  const showArchived = view === "archived";
  const query = q?.trim();

  const [customers, activeCount, archivedCount] = await Promise.all([
    db.customer.findMany({
      where: {
        isArchived: showArchived,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { phone: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
    }),
    db.customer.count({ where: { isArchived: false } }),
    db.customer.count({ where: { isArchived: true } }),
  ]);

  const viewLinkHref = (targetView: "active" | "archived") => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (targetView === "archived") params.set("view", "archived");
    const qs = params.toString();
    return qs ? `/customers?${qs}` : "/customers";
  };

  return (
    <main className={pageWrap}>
      <h1 className={pageTitle}>Customers</h1>

      <div className={statGrid}>
        <div className={statTile}>
          <p className={statValueClass("green")}>{activeCount}</p>
          <p className={statLabel}>Active</p>
        </div>
        <div className={statTile}>
          <p className={statValueClass("red")}>{archivedCount}</p>
          <p className={statLabel}>Archived</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Link href="/customers/new" className={btnPrimary}>
          + Add customer
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4 text-sm">
          <Link
            href={viewLinkHref("active")}
            className={showArchived ? linkMuted : "text-sm font-semibold text-neutral-900"}
          >
            Active
          </Link>
          <Link
            href={viewLinkHref("archived")}
            className={showArchived ? "text-sm font-semibold text-neutral-900" : linkMuted}
          >
            Archived
          </Link>
        </div>

        <form method="GET" className="flex items-center gap-2">
          {showArchived && <input type="hidden" name="view" value="archived" />}
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search by name or phone"
            className={`${inputClass} max-w-xs`}
          />
          <button type="submit" className={link}>
            Search
          </button>
        </form>

        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Phone</th>
                <th className={thClass}>Email</th>
                <th className={thClass}>Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className={trHover}>
                  <td className={tdClass}>
                    <Link href={`/customers/${c.id}`} className={link}>
                      {c.name}
                    </Link>
                  </td>
                  <td className={tdClass}>{c.phone}</td>
                  <td className={tdClass}>{c.email ?? "—"}</td>
                  <td className={tdClass}>
                    <span className={badgeClass(c.isArchived ? "red" : "green")}>
                      {c.isArchived ? "Archived" : "Active"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {customers.length === 0 && (
          <p className={mutedText}>
            {showArchived
              ? "No archived customers."
              : query
                ? "No customers match that search."
                : "No customers yet — create one above."}
          </p>
        )}
      </div>
    </main>
  );
}
