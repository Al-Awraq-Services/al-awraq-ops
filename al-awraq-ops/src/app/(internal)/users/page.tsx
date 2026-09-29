import Link from "next/link";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { deactivateUserAction, reactivateUserAction, changeRoleAction } from "@/actions/users";
import { IssueResetTokenButton } from "@/components/forms/IssueResetTokenButton";
import {
  pageWrap,
  pageTitle,
  inputClass,
  link,
  linkDanger,
  linkSuccess,
  btnPrimary,
  statGrid,
  statTile,
  statLabel,
  statValueClass,
  tableWrap,
  table,
  thClass,
  tdClass,
  trHover,
  badgeClass,
  mutedText,
} from "@/lib/ui/classNames";

/**
 * Admin-only, enforced here via requireRole — not just absent from other
 * roles' navigation. A Staff/Technician session hitting this URL directly
 * is redirected server-side before any user data is fetched.
 *
 * Layout pass (2026-09-13): a stat row (Active/Inactive/Admins) shows
 * first, and "+ Add user" links to its own page (`/users/new`) instead of
 * an inline form — see the equivalent Customer page comment for why.
 */
export default async function UsersPage() {
  const currentUser = await requireRole(["ADMIN"]);
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });

  const activeCount = users.filter((u) => u.isActive).length;
  const inactiveCount = users.length - activeCount;
  const adminCount = users.filter((u) => u.role === "ADMIN").length;

  return (
    <main className={pageWrap}>
      <h1 className={pageTitle}>Users</h1>

      <div className={statGrid}>
        <div className={statTile}>
          <p className={statValueClass("green")}>{activeCount}</p>
          <p className={statLabel}>Active</p>
        </div>
        <div className={statTile}>
          <p className={statValueClass("red")}>{inactiveCount}</p>
          <p className={statLabel}>Inactive</p>
        </div>
        <div className={statTile}>
          <p className={statValueClass("blue")}>{adminCount}</p>
          <p className={statLabel}>Admins</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Link href="/users/new" className={btnPrimary}>
          + Add user
        </Link>
      </div>

      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={thClass}>Name</th>
              <th className={thClass}>Email</th>
              <th className={thClass}>Role</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={trHover}>
                <td className={tdClass}>{u.name}</td>
                <td className={tdClass}>{u.email}</td>
                <td className={tdClass}>
                  <form
                    action={changeRoleAction.bind(null, u.id)}
                    className="flex items-center gap-2"
                  >
                    <select
                      name="role"
                      defaultValue={u.role}
                      disabled={u.id === currentUser.id}
                      className={`${inputClass} w-auto py-1 text-xs disabled:opacity-50`}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="STAFF">Staff</option>
                      <option value="TECHNICIAN">Technician</option>
                    </select>
                    {u.id !== currentUser.id && (
                      <button type="submit" className={`${link} text-xs`}>
                        Save
                      </button>
                    )}
                  </form>
                </td>
                <td className={tdClass}>
                  <span className={badgeClass(u.isActive ? "green" : "red")}>
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className={`${tdClass} flex flex-col gap-2`}>
                  <IssueResetTokenButton userId={u.id} />
                  {u.id === currentUser.id ? (
                    <span className="text-xs text-neutral-400">
                      (this is you)
                    </span>
                  ) : u.isActive ? (
                    <form action={deactivateUserAction.bind(null, u.id)}>
                      <button type="submit" className={`${linkDanger} text-xs`}>
                        Deactivate
                      </button>
                    </form>
                  ) : (
                    <form action={reactivateUserAction.bind(null, u.id)}>
                      <button type="submit" className={`${linkSuccess} text-xs`}>
                        Reactivate
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.length === 0 && <p className={mutedText}>No users yet.</p>}
    </main>
  );
}
