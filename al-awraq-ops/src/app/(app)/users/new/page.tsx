import Link from "next/link";
import { requireMainAccount } from "@/lib/auth/appAuth";
import { CreateUserForm } from "@/components/forms/CreateUserForm";
import {
  pageWrap,
  pageHeader,
  pageTitle,
  pageSubtitle,
  backLink,
  cardClass,
} from "@/lib/ui/classNames";

export default async function NewUserPage() {
  await requireMainAccount();

  return (
    <main className={pageWrap}>
      <div className="flex flex-col gap-4">
        <Link href="/users" className={`${backLink} self-start`}>
          ← Users
        </Link>
        <div className={pageHeader}>
          <div>
            <h1 className={pageTitle}>New account</h1>
            <p className={pageSubtitle}>Create a login and choose what it can access.</p>
          </div>
        </div>
      </div>
      <div className={`${cardClass} max-w-2xl`}>
        <CreateUserForm />
      </div>
    </main>
  );
}
