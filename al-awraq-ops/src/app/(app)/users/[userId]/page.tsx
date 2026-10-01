import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireMainAccount } from "@/lib/auth/appAuth";
import { UserPermissionsForm } from "@/components/forms/UserPermissionsForm";
import { ResetUserPasswordForm } from "@/components/forms/ResetUserPasswordForm";
import { DeleteUserButton } from "@/components/forms/DeleteUserButton";
import {
  pageWrap,
  pageTitle,
  pageSubtitle,
  sectionTitle,
  cardClass,
  link,
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
      <div>
        <Link href="/users" className={link}>
          ← Back to users
        </Link>
        <h1 className={`${pageTitle} mt-2`}>{user.name}</h1>
        <p className={pageSubtitle}>@{user.username}</p>
      </div>

      {user.isMainAccount ? (
        <div className={`${cardClass} max-w-xl`}>
          <span className={badgeClass("blue")}>Main account</span>
          <p className={`${mutedText} mt-3`}>
            The main account always has full access — the Dashboard, every aggregate money
            figure, and this Users screen — and that can&apos;t be changed or delegated here.
          </p>
        </div>
      ) : (
        <div className={`${cardClass} max-w-xl`}>
          <h2 className={`${sectionTitle} mb-4`}>Access</h2>
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
        </div>
      )}

      <div className={`${cardClass} max-w-xl`}>
        <h2 className={`${sectionTitle} mb-4`}>Reset password</h2>
        <ResetUserPasswordForm userId={user.id} />
      </div>

      {!user.isMainAccount && user.id !== actingUser.id && (
        <div className={`${cardClass} max-w-xl`}>
          <h2 className={`${sectionTitle} mb-3`}>Danger zone</h2>
          <DeleteUserButton userId={user.id} />
        </div>
      )}
    </main>
  );
}
