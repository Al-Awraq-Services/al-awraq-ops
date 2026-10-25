import Link from "next/link";
import { requireUser } from "@/lib/auth/appAuth";
import { logoutAction } from "@/actions/authGate";
import { NavLinks } from "@/components/ui/NavLinks";
import { BrandMark } from "@/components/ui/BrandMark";
import { navDangerLink } from "@/lib/ui/classNames";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "");
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Light, paper-toned header (the old near-black bar read as a
          separate dark slab on an otherwise light page). Translucent so
          content scrolling under it stays faintly visible. */}
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            <Link href="/" className="group flex items-center gap-3" aria-label="Al Awraq Services — home">
              <BrandMark height={22} />
              <span className="flex items-baseline gap-2">
                <span className="font-display text-[17px] leading-none tracking-[-0.01em] text-ink">
                  Al Awraq
                </span>
                <span className="hidden text-[12.5px] text-muted sm:inline">Operations</span>
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="grid size-7 place-items-center rounded-md bg-surface-3 text-[11px] font-semibold uppercase text-ink-2 ring-1 ring-inset ring-line"
                >
                  {initials(user.name)}
                </span>
                <span className="hidden text-[13px] text-ink-2 sm:inline">{user.name}</span>
              </div>
              <span aria-hidden="true" className="h-4 w-px bg-line-strong" />
              <form action={logoutAction}>
                <button type="submit" className={navDangerLink}>
                  Sign out
                </button>
              </form>
            </div>
          </div>
          <NavLinks
            isMainAccount={user.isMainAccount}
            canViewInvoices={user.canViewInvoices}
            canViewCustomers={user.canViewCustomers}
            canViewInquiries={user.canViewInquiries}
            canViewPurchaseOrders={user.canViewPurchaseOrders}
          />
        </div>
      </header>
      <div id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {children}
      </div>
    </div>
  );
}
