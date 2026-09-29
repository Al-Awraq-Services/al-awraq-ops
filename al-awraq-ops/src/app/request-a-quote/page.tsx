import Link from "next/link";
import { db } from "@/lib/db";
import { PublicLeadRequestForm } from "@/components/forms/PublicLeadRequestForm";
import { linkMuted } from "@/lib/ui/classNames";

/**
 * The app's only public, unauthenticated page. Deliberately outside the
 * `(internal)` and `(auth)` route groups — no `requireUser()`/`requireRole`
 * call anywhere in this file, by design, since a visitor here has no
 * account at all. See src/actions/public.ts for the write path and
 * docs/OPEN_DECISIONS.md for the scope decision and standing
 * business-owner-approval flag this whole feature carries.
 */
export default async function RequestAQuotePage() {
  const services = await db.service.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-16">
      <div className="flex w-full max-w-md flex-col items-center gap-8 animate-page-in">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 text-base font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_24px_-6px_rgba(29,78,216,0.55)]">
            AA
          </span>
          <div>
            <h1 className="text-xl font-semibold text-neutral-950 tracking-tight">
              Request a Quote
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Al Awraq Services — AC duct cleaning, maintenance &amp; repair.
              Tell us what you need and we&apos;ll get back to you.
            </p>
          </div>
        </div>

        <div className="w-full rounded-2xl border border-neutral-200/70 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-20px_rgba(0,0,0,0.15)]">
          <PublicLeadRequestForm services={services} />
        </div>

        <Link href="/login" className={linkMuted}>
          Staff sign in
        </Link>
      </div>
    </main>
  );
}
