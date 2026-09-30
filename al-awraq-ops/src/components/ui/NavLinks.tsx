"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Users,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon };

const items: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

/** Active-page nav highlighting. Isolated here (needs usePathname) so the
 * surrounding header/layout can stay a Server Component. */
export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto whitespace-nowrap pb-0.5">
      {items.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/" ? pathname === href : pathname.startsWith(href);
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
