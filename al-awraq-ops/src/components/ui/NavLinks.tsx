"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Target,
  FileText,
  Receipt,
  Wrench,
  UserCog,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Premium visual pass (2026-09-12): the previous nav was plain text links
 * with no active-page indicator — deliberately deferred in the prior pass
 * because it needed client-side pathname awareness and the layout is a
 * Server Component by design. Isolated here into its own small Client
 * Component (icon + label + active pill) so the surrounding header/layout
 * stays a Server Component; only this strip needs `usePathname`.
 *
 * Active-state matching: exact for /dashboard, prefix match for everything
 * else (so /customers/[id] still highlights "Customers") — `/dashboard`
 * would otherwise prefix-match every route since it's the layout's root
 * link target in a couple of places, so it's excluded from prefix logic.
 */
export function NavLinks({
  role,
}: {
  role: "ADMIN" | "STAFF" | "TECHNICIAN";
}) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ...(role === "ADMIN" || role === "STAFF"
      ? [
          { href: "/customers", label: "Customers", icon: Users },
          { href: "/leads", label: "Leads", icon: Target },
          { href: "/quotes", label: "Quotes", icon: FileText },
          { href: "/invoices", label: "Invoices", icon: Receipt },
        ]
      : []),
    ...(role === "ADMIN"
      ? [
          { href: "/services", label: "Services", icon: Wrench },
          { href: "/users", label: "Users", icon: UserCog },
        ]
      : []),
  ];

  return (
    <nav className="flex items-center gap-1 overflow-x-auto whitespace-nowrap pb-0.5">
      {items.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
              isActive
                ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                : "text-neutral-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
