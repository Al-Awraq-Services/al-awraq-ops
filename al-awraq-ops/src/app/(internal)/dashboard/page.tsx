import Link from "next/link";
import { Users, Target, FileText, Receipt, Wrench, UserCog, type LucideIcon } from "lucide-react";
import { requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { cardInteractiveClass, pageWrap, pageTitle, pageSubtitle, mutedText } from "@/lib/ui/classNames";

/**
 * UI/Branding pass (2026-09-09): upgraded from the Phase B placeholder to a
 * role-aware set of quick-link cards with a live count per module. Premium
 * visual pass (2026-09-12) added per-module icons (matching NavLinks.tsx),
 * a staggered fade-in on the card grid, and a hover-lift on each card. This
 * is still deliberately not the full Phase 5 §9 dashboard (recent activity
 * feed, quotes/jobs by status, pending payment, etc.) — those need entities
 * and reporting queries beyond what a "landing page" pass should add;
 * counts on simple `count()` queries are the only data this page reads.
 */
export default async function DashboardPage() {
  const user = await requireUser();

  const canSeeCustomersLeadsQuotes = user.role === "ADMIN" || user.role === "STAFF";
  const canSeeAdminOnly = user.role === "ADMIN";

  const [customerCount, leadCount, quoteCount, invoiceCount, serviceCount, userCount] =
    await Promise.all([
      canSeeCustomersLeadsQuotes ? db.customer.count({ where: { isArchived: false } }) : null,
      canSeeCustomersLeadsQuotes ? db.lead.count({ where: { status: "NEW" } }) : null,
      canSeeCustomersLeadsQuotes ? db.quote.count() : null,
      canSeeCustomersLeadsQuotes ? db.invoice.count({ where: { status: "UNPAID" } }) : null,
      canSeeAdminOnly ? db.service.count({ where: { isActive: true } }) : null,
      canSeeAdminOnly ? db.user.count({ where: { isActive: true } }) : null,
    ]);

  const modules = [
    canSeeCustomersLeadsQuotes && {
      href: "/customers",
      label: "Customers",
      count: customerCount,
      countLabel: "active",
      icon: Users,
      tint: "bg-blue-50 text-blue-700",
    },
    canSeeCustomersLeadsQuotes && {
      href: "/leads",
      label: "Leads",
      count: leadCount,
      countLabel: "new",
      icon: Target,
      tint: "bg-amber-50 text-amber-700",
    },
    canSeeCustomersLeadsQuotes && {
      href: "/quotes",
      label: "Quotes",
      count: quoteCount,
      countLabel: "total",
      icon: FileText,
      tint: "bg-violet-50 text-violet-700",
    },
    canSeeCustomersLeadsQuotes && {
      href: "/invoices",
      label: "Invoices",
      count: invoiceCount,
      countLabel: "unpaid",
      icon: Receipt,
      tint: "bg-rose-50 text-rose-700",
    },
    canSeeAdminOnly && {
      href: "/services",
      label: "Services",
      count: serviceCount,
      countLabel: "active",
      icon: Wrench,
      tint: "bg-teal-50 text-teal-700",
    },
    canSeeAdminOnly && {
      href: "/users",
      label: "Users",
      count: userCount,
      countLabel: "active",
      icon: UserCog,
      tint: "bg-indigo-50 text-indigo-700",
    },
  ].filter(Boolean) as {
    href: string;
    label: string;
    count: number;
    countLabel: string;
    icon: LucideIcon;
    tint: string;
  }[];

  return (
    <main className={pageWrap}>
      <div>
        <h1 className={pageTitle}>Welcome, {user.name.split(" ")[0]}</h1>
        <p className={pageSubtitle}>
          Signed in as {user.name} · {user.role}
        </p>
      </div>

      {modules.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {modules.map((m, i) => (
            <Link
              key={m.href}
              href={m.href}
              style={{ "--i": i } as React.CSSProperties}
              className={`${cardInteractiveClass} animate-stagger flex flex-col gap-3 p-4 sm:gap-4 sm:p-6`}
            >
              <span
                className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl ${m.tint}`}
              >
                <m.icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} />
              </span>
              <div>
                <span className="text-xs sm:text-sm font-medium text-neutral-500">
                  {m.label}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950">
                    {m.count}
                  </span>
                  <span className="text-xs text-neutral-400">{m.countLabel}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-sm">
          <p className={mutedText}>
            Your account doesn&apos;t have access to any modules yet. Ask an
            Admin if you believe this is incorrect.
          </p>
        </div>
      )}
    </main>
  );
}
