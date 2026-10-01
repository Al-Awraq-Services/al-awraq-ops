import Image from "next/image";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/appAuth";
import { LoginForm } from "@/components/forms/LoginForm";
import { cardClass } from "@/lib/ui/classNames";

export default async function LoginPage() {
  if (await getCurrentUser()) {
    redirect("/");
  }

  const profile = await db.businessProfile.findUnique({ where: { id: "singleton" } });

  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center px-4 py-10"
    >
      <div className={`${cardClass} w-full max-w-sm`}>
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo.jpg"
            alt="Al Awraq Services"
            width={96}
            height={85}
            className="h-20 w-auto"
            priority
          />
          <div>
            <h1 className="text-lg font-bold text-neutral-950">
              {profile?.legalName ?? "Al Awraq Services"}
            </h1>
            <p className="text-sm text-neutral-500">Invoicing</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
