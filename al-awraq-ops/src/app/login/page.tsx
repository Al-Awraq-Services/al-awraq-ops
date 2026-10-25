import Image from "next/image";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/appAuth";
import { LoginForm } from "@/components/forms/LoginForm";

// Decorative airflow lines echoing the logo's arrows — drawn, not a photo,
// so the panel stays crisp at any size and costs nothing to load.
function AirflowLines() {
  const rows = Array.from({ length: 9 }, (_, i) => i);
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 600 800"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      {rows.map((i) => {
        const y = 300 + i * 34;
        return (
          <path
            key={i}
            d={`M-40 ${y + 60} C 140 ${y + 60}, 220 ${y - 10}, 380 ${y - 10} S 560 ${y + 30}, 680 ${y + 20}`}
            stroke="white"
            strokeOpacity={0.05 + (i % 3) * 0.035}
            strokeWidth={i === 4 ? 1.5 : 1}
          />
        );
      })}
    </svg>
  );
}

export default async function LoginPage() {
  if (await getCurrentUser()) {
    redirect("/");
  }

  const profile = await db.businessProfile.findUnique({ where: { id: "singleton" } });
  // The stored legal name is all caps (as printed on invoices); shown here
  // in title case so it doesn't shout under the heading.
  const legalName = (profile?.legalName ?? "Al Awraq Technical Services Est.")
    .toLowerCase()
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase());

  return (
    <main id="main-content" className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="relative hidden overflow-hidden bg-[#1b2a66] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <AirflowLines />
        <div className="relative flex items-center gap-3">
          <span className="grid size-10 place-items-center overflow-hidden rounded-md bg-white">
            <Image src="/logo.jpg" alt="" width={40} height={35} className="h-auto w-9" priority />
          </span>
          <span className="text-[13px] font-medium tracking-[0.02em] text-white/80">
            Al Awraq Services
          </span>
        </div>
        <div className="relative max-w-md">
          <p className="font-display text-[2.6rem] font-light leading-[1.08] tracking-[-0.02em]">
            Duct cleaning, maintenance and repair across Dubai.
          </p>
          <p className="mt-5 text-sm text-white/60">
            Invoices, inquiries, purchase orders and accounts in one place.
          </p>
        </div>
        <p className="relative text-[12px] text-white/45">Hor Al Anz, Dubai · {legalName}</p>
      </section>

      <section className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-[22rem]">
          <Image
            src="/logo.jpg"
            alt="Al Awraq Services"
            width={96}
            height={85}
            className="mb-10 h-16 w-auto mix-blend-multiply lg:hidden"
            priority
          />
          <h1 className="font-display text-[2.25rem] leading-[1.1] tracking-[-0.018em] text-ink">
            Sign in
          </h1>
          <p className="mt-2 mb-8 text-sm text-muted">{legalName}</p>
          <LoginForm />
          <p className="mt-10 text-[12.5px] text-faint">
            Accounts are created by the main account holder. Ask them if you need access.
          </p>
        </div>
      </section>
    </main>
  );
}
