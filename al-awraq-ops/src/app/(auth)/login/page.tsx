import { LoginForm } from "@/components/forms/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 animate-page-in">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 text-base font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_24px_-6px_rgba(29,78,216,0.55)]">
            AA
          </span>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-neutral-950 tracking-tight">
              Al Awraq Services
            </h1>
            <p className="text-sm text-neutral-500">Internal Ops</p>
          </div>
        </div>
        <div className="w-full rounded-2xl border border-neutral-200/70 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-20px_rgba(0,0,0,0.15)]">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
