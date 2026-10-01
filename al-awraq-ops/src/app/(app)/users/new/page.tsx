import Link from "next/link";
import { requireMainAccount } from "@/lib/auth/appAuth";
import { CreateUserForm } from "@/components/forms/CreateUserForm";
import { pageWrap, pageTitle, pageSubtitle, cardClass, link } from "@/lib/ui/classNames";

export default async function NewUserPage() {
  await requireMainAccount();

  return (
    <main className={pageWrap}>
      <div>
        <Link href="/users" className={link}>
          ← Back to users
        </Link>
        <h1 className={`${pageTitle} mt-2`}>New account</h1>
        <p className={pageSubtitle}>Create a login and choose what it can access.</p>
      </div>
      <div className={`${cardClass} max-w-xl`}>
        <CreateUserForm />
      </div>
    </main>
  );
}
