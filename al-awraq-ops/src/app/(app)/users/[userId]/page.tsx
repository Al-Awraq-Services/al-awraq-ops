import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireMainAccount } from "@/lib/auth/appAuth";
import { UserPermissionsForm } from "@/components/forms/UserPermissionsForm";
import { ResetUserPasswordForm } from "@/components/forms/ResetUserPasswordForm";
import { DeleteUserButton } from "@/components/forms/DeleteUserButton";
import {
  pageWrap,
  pageHeader,
  pageTitle,
  pageSubtitle,
  eyebrow,
  backLink,
  sectionTitle,
  hintText,
  cardClass,
  badgeClass,
  mutedText,
} from "@/lib/ui/classNames";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const actingUser = await requireMainAccount();
  const { userId } = await params;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    notFound();
  }

  return (
    <main className={pageWrap}>
      <div className="flex flex-col gap-4">
        <Link href="/users" className={`${backLink} self-start`}>
          ← Users
        </Link>
        <div className={pageHeader}>
          <div>
            <p className={eyebrow}>Account</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className={pageTitle}>{user.name}</h1>
              {user.isMainAccount && <span className={badgeClass("blue")}>Main account</span>}
            </div>
            <p className={pageSubtitle}>@{user.username}</p>
          </div>
        </div>
      </div>

      {user.isMainAccount ? (
        <section className={`${cardClass} max-w-2xl`}>
          <h2 className={sectionTitle}>Access</h2>
          <p className={`${mutedText} mt-2`}>
            The main account always has full access (the Dashboard, Accounting, every aggregate
            money figure, and this Users screen). That can&apos;t be changed or delegated here.
          </p>
        </section>
      ) : (
        <section className={`${cardClass} max-w-2xl`}>
          <h2 className={sectionTitle}>Access</h2>
          <p className={`${hintText} mt-1 mb-5`}>
            The Dashboard, Accounting and Users screens stay main-account-only.
          </p>
          <UserPermissionsForm
            userId={user.id}
            defaultValues={{
              canViewInvoices: user.canViewInvoices,
              canManageInvoices: user.canManageInvoices,
              canViewCustomers: user.canViewCustomers,
              canManageCustomers: user.canManageCustomers,
              canViewInquiries: user.canViewInquiries,
              canManageInquiries: user.canManageInquiries,
              canViewPurchaseOrders: user.canViewPurchaseOrders,
              canManagePurchaseOrders: user.canManagePurchaseOrders,
            }}
          />
        </section>
      )}

      <section className={`${cardClass} max-w-2xl`}>
        <h2 className={`${sectionTitle} mb-5`}>Reset password</h2>
        <ResetUserPasswordForm userId={user.id} />
      </section>

      {!user.isMainAccount && user.id !== actingUser.id && (
        <section
          className={`${cardClass} flex max-w-2xl flex-wrap items-center justify-between gap-4`}
        >
          <div>
            <h2 className={sectionTitle}>Delete account</h2>
            <p className={`${hintText} mt-1`}>This person will no longer be able to sign in.</p>
          </div>
          <DeleteUserButton userId={user.id} />
        </section>
      )}
    </main>
  );
}
