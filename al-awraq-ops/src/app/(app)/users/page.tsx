import Link from "next/link";
import { db } from "@/lib/db";
import { requireMainAccount } from "@/lib/auth/appAuth";
import {
  pageWrap,
  pageHeader,
  pageActions,
  pageTitle,
  pageSubtitle,
  btnPrimary,
  tableWrap,
  table,
  thClass,
  tdClass,
  trHover,
  rowLink,
  badgeClass,
} from "@/lib/ui/classNames";

export default async function UsersPage() {
  await requireMainAccount();

  const users = await db.user.findMany({ orderBy: [{ isMainAccount: "desc" }, { name: "asc" }] });

  function accessSummary(user: (typeof users)[number]): string {
    if (user.isMainAccount) return "Full access";
    const parts: string[] = [];
    if (user.canManageInvoices) parts.push("Manage invoices");
    else if (user.canViewInvoices) parts.push("View invoices");
    if (user.canManageCustomers) parts.push("Manage customers");
    else if (user.canViewCustomers) parts.push("View customers");
    if (user.canManageInquiries) parts.push("Manage inquiries");
    else if (user.canViewInquiries) parts.push("View inquiries");
    if (user.canManagePurchaseOrders) parts.push("Manage POs");
    else if (user.canViewPurchaseOrders) parts.push("View POs");
    return parts.length > 0 ? parts.join(" · ") : "No access yet";
  }

  return (
    <main className={pageWrap}>
      <div className={pageHeader}>
        <div>
          <h1 className={pageTitle}>Users</h1>
          <p className={pageSubtitle}>Accounts that can sign in to this app.</p>
        </div>
        <div className={pageActions}>
          <Link href="/users/new" className={btnPrimary}>
            New account
          </Link>
        </div>
      </div>

      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={thClass}>Name</th>
              <th className={thClass}>Username</th>
              <th className={thClass}>Access</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className={trHover}>
                <td className={tdClass}>
                  <Link href={`/users/${user.id}`} className={rowLink}>
                    {user.name}
                  </Link>
                </td>
                <td className={tdClass}>
                  <span className="text-muted">@{user.username}</span>
                </td>
                <td className={tdClass}>
                  {user.isMainAccount ? (
                    <span className={badgeClass("blue")}>Main account</span>
                  ) : (
                    accessSummary(user)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
