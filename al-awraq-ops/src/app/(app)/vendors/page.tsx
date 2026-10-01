import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/appAuth";
import { computeInvoiceTotals, toNum, formatMoney } from "@/lib/invoiceMath";
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
  inputClass,
  mutedText,
} from "@/lib/ui/classNames";

/**
 * Vendor management — reachable only via the "Manage vendors" link on the
 * Purchase Orders list page, not its own main-nav tab (see
 * src/components/ui/NavLinks.tsx, which has no Vendors entry). Gated by
 * the same canView/canManagePurchaseOrders permission pair as PurchaseOrder
 * — Vendor has no permission pair of its own, by design.
 */
export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requirePermission("canViewPurchaseOrders");
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const vendors = await db.vendor.findMany({
    where: query ? { name: { contains: query, mode: "insensitive" } } : undefined,
    include: { purchaseOrders: { include: { items: true } } },
    orderBy: { name: "asc" },
  });

  function poBalance(
    pos: Array<{
      items: Array<{ quantity: unknown; unitPrice: unknown }>;
      taxRatePercent: unknown;
      discountAmount: unknown;
      shipmentAmount: unknown;
      amountPaid: unknown;
    }>,
  ) {
    return pos.reduce((sum, po) => {
      const totals = computeInvoiceTotals(
        po.items.map((item) => ({
          quantity: toNum(item.quantity),
          unitPrice: toNum(item.unitPrice),
        })),
        {
          taxRatePercent: toNum(po.taxRatePercent),
          discountAmount: po.discountAmount ? toNum(po.discountAmount) : null,
          shipmentAmount: po.shipmentAmount ? toNum(po.shipmentAmount) : null,
          amountPaid: toNum(po.amountPaid),
        },
      );
      return sum + totals.balanceDue;
    }, 0);
  }

  const rows = vendors.map((vendor) => ({
    id: vendor.id,
    name: vendor.name,
    address: vendor.address,
    contact: vendor.contact,
    balance: poBalance(vendor.purchaseOrders),
  }));

  return (
    <main className={pageWrap}>
      <div>
        <Link href="/purchase-orders" className={link}>
          ← Back to Purchase Orders
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={pageTitle}>Vendors</h1>
          <p className={pageSubtitle}>Your supplier address book — {vendors.length} on file.</p>
        </div>
        {(user.isMainAccount || user.canManagePurchaseOrders) && (
          <Link href="/vendors/new" className={btnPrimary}>
            + New Vendor
          </Link>
        )}
      </div>

      <form className="flex max-w-sm gap-2" action="/vendors" method="get">
        <input
          type="text"
          name="q"
          placeholder="Search by name…"
          defaultValue={query}
          className={inputClass}
        />
        <button type="submit" className={btnPrimary}>
          Search
        </button>
      </form>

      {rows.length === 0 ? (
        <p className={mutedText}>{query ? `No vendors match "${query}".` : "No vendors yet."}</p>
      ) : (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Address</th>
                <th className={thClass}>Contact</th>
                {user.isMainAccount && <th className={thClass}>Balance</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={trHover}>
                  <td className={tdClass}>
                    <Link href={`/vendors/${row.id}`} className={link}>
                      {row.name}
                    </Link>
                  </td>
                  <td className={tdClass}>{row.address || "—"}</td>
                  <td className={tdClass}>{row.contact || "—"}</td>
                  {user.isMainAccount && (
                    <td className={tdClass}>
                      {row.balance > 0 ? (
                        <span className={badgeClass("red")}>AED {formatMoney(row.balance)}</span>
                      ) : (
                        <span className={badgeClass("green")}>Settled</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
