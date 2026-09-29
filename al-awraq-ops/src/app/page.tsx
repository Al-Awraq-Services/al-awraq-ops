import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { btnPrimary, linkMuted } from "@/lib/ui/classNames";

/**
 * Was a plain placeholder through Phase A, with a comment noting it should
 * redirect to /login or /dashboard "once Phase B (authentication) exists."
 * Phase B has existed since 2026-09-01 but this redirect was never actually
 * wired up in any subsequent phase — fixed as part of the UI/Branding pass
 * (2026-09-09), since a stale root placeholder is a front-end gap.
 *
 * Public request-a-quote pass (2026-09-13): an authenticated visitor still
 * redirects straight to /dashboard, unchanged — but an unauthenticated one
 * no longer blind-redirects to /login. Before the public "Request a Quote"
 * page existed, every unauthenticated visitor was necessarily staff (no
 * other reason to be here), so sending them straight to the login form was
 * correct. Now a real customer could land on the root domain, and shoving
 * them at a staff login screen is the wrong front door — this renders a
 * small public landing instead, with "Request a Quote" as the primary
 * action and a quiet "Staff sign in" link for the actual staff case.
 * Read-only (`getSession`, not `requireUser`) — this route itself has no
 * protected content, it only decides what to show/where to send next.
 */
export default async function Home() {
  const user = await getSession();
  if (user) redirect("/dashboard");

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 animate-page-in">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 text-base font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_24px_-6px_rgba(29,78,216,0.55)]">
          AA
        </span>
        <div>
          <h1 className="text-xl font-semibold text-neutral-950 tracking-tight">
            Al Awraq Services
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            AC duct cleaning, maintenance &amp; repair.
          </p>
        </div>
        <Link href="/request-a-quote" className={btnPrimary}>
          Request a quote
        </Link>
        <Link href="/login" className={linkMuted}>
          Staff sign in
        </Link>
      </div>
    </main>
  );
}
