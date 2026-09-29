import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { logoutAction } from "@/actions/auth";
import { NavLinks } from "@/components/ui/NavLinks";
import { navDangerLink } from "@/lib/ui/classNames";

/**
 * Every route under (internal) requires a valid session — enforced here,
 * server-side, on every request. This is the route-group guard from the
 * Phase 3 architecture plan: requireUser() redirects to /login on its own
 * if there is no valid session, so nothing below this layout ever renders
 * for an unauthenticated request.
 *
 * Role-specific route restrictions (Admin-only screens, etc.) are enforced
 * again, individually, inside each of those pages via requireRole — this
 * layout only proves "someone is signed in," not "this someone may see
 * this page."
 *
 * Header styling (UI/Branding pass, 2026-09-09; refined in the premium
 * visual pass, 2026-09-12): a near-black, sticky, translucent-blur surface
 * — the one recurring "chrome" element the rest of the app sits under.
 * The active-nav-link pill (see NavLinks.tsx — isolated into its own
 * Client Component since it needs `usePathname`, keeping this layout
 * itself a Server Component) uses a neutral white-on-dark highlight, not
 * blue. Sign Out is red (2026-09-13 — an "exit" action, per the developer's
 * explicit rule), styled via `navDangerLink` rather than `linkDanger` since
 * the latter is tuned for a white surface, not this dark one.
 *
 * Two-row layout (identity/sign-out on top, nav below, nav row
 * horizontally scrollable) rather than one packed row — a single row
 * overflowed and clipped "Sign out" off-screen at mobile widths (found
 * live during the 2026-09-09 pass at 375px). No hamburger menu: given no
 * mobile-first requirement was ever stated for this internal tool, a
 * scrollable nav strip is a proportionate fix, not a full mobile nav
 * redesign.
 */
export default async function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/85 text-white backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2.5 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_8px_rgba(29,78,216,0.5)]">
                AA
              </span>
              <span className="hidden text-[15px] font-semibold tracking-tight sm:inline">
                Al Awraq Services <span className="text-neutral-500">· Ops</span>
              </span>
            </Link>
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="hidden items-center gap-2 text-sm text-neutral-300 sm:flex">
                {user.name}
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-neutral-200 ring-1 ring-inset ring-white/10">
                  {user.role}
                </span>
              </span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-neutral-200 ring-1 ring-inset ring-white/10 sm:hidden">
                {user.role}
              </span>
              <form action={logoutAction}>
                <button type="submit" className={`shrink-0 ${navDangerLink}`}>
                  Sign out
                </button>
              </form>
            </div>
          </div>
          <NavLinks role={user.role} />
        </div>
      </header>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
