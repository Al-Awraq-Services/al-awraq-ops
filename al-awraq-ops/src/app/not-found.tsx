import Link from "next/link";
import { BrandMark } from "@/components/ui/BrandMark";
import { btnSecondary, mutedText } from "@/lib/ui/classNames";

export default function NotFound() {
  return (
    <main id="main-content" className="flex min-h-dvh flex-col px-6 py-10 sm:px-12">
      <Link href="/" className="flex items-center gap-3 self-start" aria-label="Al Awraq Services — home">
        <BrandMark height={22} />
        <span className="font-display text-[17px] leading-none text-ink">Al Awraq</span>
      </Link>
      <div className="flex flex-1 flex-col justify-center">
        <div className="max-w-md">
          <p className="font-display text-[5.5rem] font-light leading-none tracking-[-0.03em] text-line-strong figures">
            404
          </p>
          <h1 className="mt-6 font-display text-[2rem] leading-[1.1] tracking-[-0.015em] text-ink">
            This page doesn&apos;t exist
          </h1>
          <p className={`${mutedText} mt-3`}>
            The link may be mistyped, or the record it pointed to was deleted.
          </p>
          <Link href="/" className={`${btnSecondary} mt-8`}>
            ← Back to the app
          </Link>
        </div>
      </div>
    </main>
  );
}
