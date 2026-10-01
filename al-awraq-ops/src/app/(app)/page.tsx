import Link from "next/link";
import { db } from "@/lib/db";
import { requireMainAccount } from "@/lib/auth/appAuth";
import { computeInvoiceTotals, toNum, formatMoney } from "@/lib/invoiceMath";
import { AnimatedStat } from "@/components/dashboard/AnimatedStat";
import {
  RevenueTrendChart,
  type RevenueTrendPoint,
} from "@/components/dashboard/RevenueTrendChart";
import { PaidVsOutstandingChart } from "@/components/dashboard/PaidVsOutstandingChart";
import { TopCustomersChart, type TopCustomer } from "@/components/dashboard/TopCustomersChart";
import {
  pageWrap,
  pageTitle,
  pageSubtitle,
  sectionTitle,
  tableWrap,
  table,
  thClass,
  tdClass,
  trHover,
  link,
  badgeClass,
  mutedText,
} from "@/lib/ui/classNames";

function money(n: number): string {
  return `AED ${formatMoney(n)}`;
}

export default async function DashboardPage() {
  // Hard rule, not a toggle — see the User model comment in schema.prisma.
  await requireMainAccount();

  const invoices = await db.invoice.findMany({
    include: { items: true, customer: { select: { id: true, name: true } } },
    orderBy: { invoiceDate: "desc" },
  });

  const computed = invoices.map((invoice) => {
    const totals = computeInvoiceTotals(
      invoice.items.map((item) => ({
        quantity: toNum(item.quantity),
        unitPrice: toNum(item.unitPrice),
        retentionAmount: item.retentionAmount ? toNum(item.retentionAmount) : null,
      })),
      {
        taxRatePercent: toNum(invoice.taxRatePercent),
        discountAmount: invoice.discountAmount ? toNum(invoice.discountAmount) : null,
        shipmentAmount: invoice.shipmentAmount ? toNum(invoice.shipmentAmount) : null,
        stampDutyAmount: invoice.stampDutyAmount ? toNum(invoice.stampDutyAmount) : null,
        amountPaid: toNum(invoice.amountPaid),
      },
    );
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      customerId: invoice.customerId,
      customerName: invoice.customer.name,
      ...totals,
    };
  });

  const totalCollected = computed.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const totalOutstanding = computed.reduce((sum, inv) => sum + inv.balanceDue, 0);

  const now = new Date();
  const invoicesThisMonth = computed.filter(
    (inv) =>
      inv.invoiceDate.getFullYear() === now.getFullYear() &&
      inv.invoiceDate.getMonth() === now.getMonth(),
  ).length;

  const averageInvoiceValue =
    computed.length > 0
      ? computed.reduce((sum, inv) => sum + inv.grandTotal, 0) / computed.length
      : 0;

  // Monthly revenue trend — trailing 6 months including the current one.
  const monthsBack = 6;
  const monthBuckets: Array<{
    key: string;
    label: string;
    invoiced: number;
    collected: number;
  }> = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthBuckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("en-AE", { month: "short", year: "2-digit" }),
      invoiced: 0,
      collected: 0,
    });
  }
  const bucketByKey = new Map(monthBuckets.map((bucket) => [bucket.key, bucket]));
  for (const inv of computed) {
    const key = `${inv.invoiceDate.getFullYear()}-${inv.invoiceDate.getMonth()}`;
    const bucket = bucketByKey.get(key);
    if (bucket) {
      bucket.invoiced += inv.grandTotal;
      bucket.collected += inv.amountPaid;
    }
  }
  const revenueTrend: RevenueTrendPoint[] = monthBuckets.map((bucket) => ({
    month: bucket.label,
    invoiced: Math.round(bucket.invoiced * 100) / 100,
    collected: Math.round(bucket.collected * 100) / 100,
  }));

  // Top 5 customers by total revenue (grand total across their invoices).
  const revenueByCustomer = new Map<string, { name: string; revenue: number }>();
  for (const inv of computed) {
    const existing = revenueByCustomer.get(inv.customerId);
    if (existing) {
      existing.revenue += inv.grandTotal;
    } else {
      revenueByCustomer.set(inv.customerId, { name: inv.customerName, revenue: inv.grandTotal });
    }
  }
  const topCustomers: TopCustomer[] = Array.from(revenueByCustomer.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((c) => ({ name: c.name, revenue: Math.round(c.revenue * 100) / 100 }));

  const recentInvoices = computed.slice(0, 8);

  const statusTone = (status: string): "green" | "blue" | "red" =>
    status === "PAID" ? "green" : status === "PARTIAL" ? "blue" : "red";

  return (
    <main className={pageWrap}>
      <div>
        <h1 className={pageTitle}>Dashboard</h1>
        <p className={pageSubtitle}>An overview of invoicing activity.</p>
      </div>

      {/* 4 tiles, not the shared 3-col statGrid (which leaves an orphaned
          4th tile alone on its own row at the sm breakpoint) — 2-up on
          mobile, a clean single row of 4 from md up. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <AnimatedStat
          label="Revenue collected"
          value={totalCollected}
          format="money"
          prefix="AED "
          tone="green"
          delay={0}
        />
        <AnimatedStat
          label="Outstanding balance"
          value={totalOutstanding}
          format="money"
          prefix="AED "
          tone="red"
          delay={0.05}
        />
        <AnimatedStat
          label="Invoices this month"
          value={invoicesThisMonth}
          format="integer"
          tone="blue"
          delay={0.1}
        />
        <AnimatedStat
          label="Average invoice value"
          value={averageInvoiceValue}
          format="money"
          prefix="AED "
          tone="neutral"
          delay={0.15}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <RevenueTrendChart data={revenueTrend} />
        </div>
        <PaidVsOutstandingChart paid={totalCollected} outstanding={totalOutstanding} />
        <TopCustomersChart data={topCustomers} />
      </div>

      <div>
        <h2 className={`${sectionTitle} mb-3`}>Recent invoices</h2>
        {recentInvoices.length === 0 ? (
          <p className={mutedText}>No invoices yet.</p>
        ) : (
          <div className={tableWrap}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={thClass}>Number</th>
                  <th className={thClass}>Customer</th>
                  <th className={thClass}>Date</th>
                  <th className={thClass}>Total</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className={trHover}>
                    <td className={tdClass}>
                      <Link href={`/invoices/${inv.id}`} className={link}>
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className={tdClass}>
                      <Link href={`/customers/${inv.customerId}`} className={link}>
                        {inv.customerName}
                      </Link>
                    </td>
                    <td className={tdClass}>
                      {inv.invoiceDate.toLocaleDateString("en-AE", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className={tdClass}>{money(inv.grandTotal)}</td>
                    <td className={tdClass}>
                      <span className={badgeClass(statusTone(inv.status))}>{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
