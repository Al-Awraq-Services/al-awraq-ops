import Link from "next/link";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import {
  pageWrap,
  pageTitle,
  link,
  linkMuted,
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

/**
 * Admin-only, enforced here via requireRole — a Staff or Technician session
 * hitting this URL directly is redirected server-side before any service
 * data is fetched (matches the pattern already used by /users).
 *
 * No search box here, deliberately — the approved fixed search-field list
 * (docs/OPEN_DECISIONS.md) covers Customer, Lead, Quote, and Job only;
 * Service was never included, so none is added here.
 *
 * "Active" / "Inactive" is a view rule, not a filter — a deactivated
 * service never silently vanishes, it moves to its own explicit view, same
 * as Customer's Active/Archived views.
 *
 * Layout pass (2026-09-13): stats (Active/Inactive counts) now show first,
 * and "+ Add service" links to its own page (`/services/new`) instead of
 * an inline form — see the equivalent Customer page comment for why.
 */
export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await requireRole(["ADMIN"]);

  const { view } = await searchParams;
  const showInactive = view === "inactive";

  const [services, activeCount, inactiveCount] = await Promise.all([
    db.service.findMany({
      where: { isActive: !showInactive },
      orderBy: { name: "asc" },
    }),
    db.service.count({ where: { isActive: true } }),
    db.service.count({ where: { isActive: false } }),
  ]);

  const viewLinkHref = (targetView: "active" | "inactive") =>
    targetView === "inactive" ? "/services?view=inactive" : "/services";

  return (
    <main className={pageWrap}>
      <h1 className={pageTitle}>Services</h1>

      <div className={statGrid}>
        <div className={statTile}>
          <p className={statValueClass("green")}>{activeCount}</p>
          <p className={statLabel}>Active</p>
        </div>
        <div className={statTile}>
          <p className={statValueClass("red")}>{inactiveCount}</p>
          <p className={statLabel}>Inactive</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Link href="/services/new" className={btnPrimary}>
          + Add service
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4 text-sm">
          <Link
            href={viewLinkHref("active")}
            className={showInactive ? linkMuted : "text-sm font-semibold text-neutral-900"}
          >
            Active
          </Link>
          <Link
            href={viewLinkHref("inactive")}
            className={showInactive ? "text-sm font-semibold text-neutral-900" : linkMuted}
          >
            Inactive
          </Link>
        </div>

        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Category</th>
                <th className={thClass}>Placeholder price</th>
                <th className={thClass}>Status</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className={trHover}>
                  <td className={tdClass}>
                    <Link href={`/services/${s.id}`} className={link}>
                      {s.name}
                    </Link>
                  </td>
                  <td className={tdClass}>{s.category ?? "—"}</td>
                  <td className={tdClass}>
                    {s.placeholderPrice !== null
                      ? `AED ${s.placeholderPrice.toString()}`
                      : "—"}
                  </td>
                  <td className={tdClass}>
                    <span className={badgeClass(s.isActive ? "green" : "red")}>
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {services.length === 0 && (
          <p className={mutedText}>
            {showInactive
              ? "No inactive services."
              : "No services yet — create one above."}
          </p>
        )}
      </div>
    </main>
  );
}
