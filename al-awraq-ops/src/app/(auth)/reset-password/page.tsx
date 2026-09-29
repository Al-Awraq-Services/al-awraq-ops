import { SetPasswordForm } from "@/components/forms/SetPasswordForm";

/**
 * Serves both first-time account setup and later password resets — same
 * screen, same mechanism (an Admin-issued one-time token), per the
 * approved Phase 5 UI plan. Phase B keeps the copy generic rather than
 * branching on "is this a first-time setup or a reset" — that distinction
 * is a copy-only polish item, not a functional gap; the underlying token
 * consumption logic is identical either way.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 animate-page-in">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 text-base font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_24px_-6px_rgba(29,78,216,0.55)]">
            AA
          </span>
          <h1 className="text-center text-lg font-semibold text-neutral-950 tracking-tight">
            Set your password
          </h1>
        </div>
        <div className="w-full rounded-2xl border border-neutral-200/70 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-20px_rgba(0,0,0,0.15)]">
          {token ? (
            <SetPasswordForm token={token} />
          ) : (
            <p className="text-sm text-neutral-500 text-center">
              This link is missing its token. Ask an Admin to issue a new
              setup/reset link from the Users screen.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
