import Image from "next/image";
import Link from "next/link";
import { cardClass, btnPrimary, mutedText } from "@/lib/ui/classNames";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center px-4 py-10"
    >
      <div className={`${cardClass} flex w-full max-w-sm flex-col items-center gap-4 text-center`}>
        <Image
          src="/logo.jpg"
          alt="Al Awraq Services"
          width={72}
          height={64}
          className="h-14 w-auto opacity-80"
        />
        <div>
          <p className="text-sm font-semibold text-blue-700">404</p>
          <h1 className="mt-1 text-lg font-bold text-neutral-950">Page not found</h1>
          <p className={`${mutedText} mt-1`}>
            There&apos;s nothing at this address — it may have been moved or the
            link was mistyped.
          </p>
        </div>
        <Link href="/" className={btnPrimary}>
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
