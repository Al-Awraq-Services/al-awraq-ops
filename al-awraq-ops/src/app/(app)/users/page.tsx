import Link from "next/link";
import { db } from "@/lib/db";
import { requireMainAccount } from "@/lib/auth/appAuth";
import {
  pageWrap,
  pageTitle,
  pageSubtitle,
  btnPrimary,
  tableWrap,
  table,
  thClass,
  tdClass,
  trHover,
  link,
  badgeClass,
} from "@/lib/ui/classNames";

export default async function UsersPage() {
  await requireMainAccount();

  const users = await db.user.findMany({ orderBy: [{ isMainAccount: "desc" }, { name: "asc" }] });

  function accessSummary(user: (typeof users)[number]): string {
    if (user.isMainAccount) return "Full access";
    const parts: string[] = [];
    if (user.canManageInvoices) parts.push("Manage Invoices");
    else if (user.canViewInvoices) parts.push("View Invoices");
    if (user.canManageCustomers) parts.push("Manage Customers");
    else if (user.canViewCustomers) parts.push("View Customers");
    if (user.canManageInquiries) parts.push("Manage Inquiries");
    else if (user.canViewInquiries) parts.push("View Inquiries");
    if (user.canManagePurchaseOrders) parts.push("Manage POs");
    else if (user.canViewPurchaseOrders) parts.push("View POs");
    return parts.length > 0 ? parts.join(", ") : "No access yet";
  }

  return (
    <main className={pageWrap}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={pageTitle}>Users</h1>
          <p className={pageSubtitle}>Accounts that can sign in to this app.</p>
        </div>
        <Link href="/users/new" className={btnPrimary}>
          + New Account
        </Link>
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
                  <Link href={`/users/${user.id}`} className={link}>
                    {user.name}
                  </Link>
                </td>
                <td className={tdClass}>{user.username}</td>
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
