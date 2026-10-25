"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

export type NavPermissions = {
  isMainAccount: boolean;
  canViewInvoices: boolean;
  canViewCustomers: boolean;
  canViewInquiries: boolean;
  canViewPurchaseOrders: boolean;
};

/** Active-page nav highlighting. Isolated here (needs usePathname) so the
 * surrounding header/layout can stay a Server Component. Only renders the
 * links this account can actually use — Dashboard, Accounting, and Users
 * are always main-account-only (a hard rule, not a toggle; see
 * appAuth.ts), everything else depends on that account's own canView…
 * flags (main always passes, same as every server-side guard).
 *
 * Text-only tabs with an ink underline on the active one, sitting on the
 * header's bottom rule — quieter than the previous icon pills. */
export function NavLinks({
  isMainAccount,
  canViewInvoices,
  canViewCustomers,
  canViewInquiries,
  canViewPurchaseOrders,
}: NavPermissions) {
  const pathname = usePathname();

  const items: NavItem[] = [
    ...(isMainAccount ? [{ href: "/", label: "Overview" }] : []),
    ...(isMainAccount || canViewInvoices ? [{ href: "/invoices", label: "Invoices" }] : []),
    ...(isMainAccount || canViewInquiries ? [{ href: "/inquiries", label: "Inquiries" }] : []),
    ...(isMainAccount || canViewPurchaseOrders
      ? [{ href: "/purchase-orders", label: "Purchase orders" }]
      : []),
    ...(isMainAccount || canViewCustomers ? [{ href: "/customers", label: "Customers" }] : []),
    ...(isMainAccount ? [{ href: "/accounting", label: "Accounting" }] : []),
    ...(isMainAccount ? [{ href: "/users", label: "Users" }] : []),
    { href: "/settings", label: "Settings" },
  ];

  return (
    <nav aria-label="Main" className="-mb-px flex items-center gap-6 overflow-x-auto whitespace-nowrap">
      {items.map(({ href, label }) => {
        const isActive = href === "/" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`relative py-2.5 text-[13.5px] font-medium transition-colors duration-150 after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:rounded-full after:transition-colors after:content-[''] ${
              isActive
                ? "text-ink after:bg-ink"
                : "text-muted after:bg-transparent hover:text-ink hover:after:bg-line-strong"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
