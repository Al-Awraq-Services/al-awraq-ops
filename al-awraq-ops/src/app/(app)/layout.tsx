import Image from "next/image";
import Link from "next/link";
import { requireUser } from "@/lib/auth/appAuth";
import { logoutAction } from "@/actions/authGate";
import { NavLinks } from "@/components/ui/NavLinks";
import { navDangerLink } from "@/lib/ui/classNames";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-neutral-800/50 bg-neutral-950/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo.jpg"
              alt="Al Awraq Services"
              width={36}
              height={32}
              className="h-8 w-auto rounded"
            />
            <span className="text-sm font-semibold tracking-tight text-white">
              Al Awraq Services · Invoicing
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-neutral-400 sm:inline">{user.name}</span>
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
        />
      </header>
      <div id="main-content" tabIndex={-1} className="flex-1 flex flex-col outline-none">
        {children}
      </div>
    </div>
  );
}
