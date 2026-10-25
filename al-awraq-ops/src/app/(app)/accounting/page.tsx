import { db } from "@/lib/db";
import { requireMainAccount } from "@/lib/auth/appAuth";
import { toNum, round2, formatMoney } from "@/lib/invoiceMath";
import { ProfitTrendChart, type ProfitTrendPoint } from "@/components/accounting/ProfitTrendChart";
import { RevenueCostBreakdownChart } from "@/components/accounting/RevenueCostBreakdownChart";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { DeleteExpenseButton } from "@/components/forms/DeleteExpenseButton";
import {
  pageWrap,
  pageHeader,
  pageTitle,
  pageSubtitle,
  sectionTitle,
  sectionHeader,
  hintText,
  cardClass,
  emptyState,
  statTile,
  statLabel,
  statValueClass,
  tableWrap,
  table,
  thClass,
  thNum,
  tdClass,
  tdNum,
  trHover,
} from "@/lib/ui/classNames";

function money(n: number): string {
  return `AED ${formatMoney(n)}`;
}

export default async function AccountingPage() {
  // Hard rule, not a toggle — the full profit/loss picture is
  // main-account-only, same as the Dashboard (see appAuth.ts).
  await requireMainAccount();

  const [invoices, inquiries, purchaseOrders, expenses] = await Promise.all([
    db.invoice.findMany({ select: { amountPaid: true, invoiceDate: true } }),
    db.inquiry.findMany({ select: { amountPaid: true, inquiryDate: true } }),
    db.purchaseOrder.findMany({ select: { amountPaid: true, orderDate: true } }),
    db.expense.findMany({ orderBy: { date: "desc" } }),
  ]);

  // --- Cash-basis formula (confirmed with the owner) ---
  // Revenue collected = real money actually received on invoices + inquiries.
  // Total cost = real money actually paid out: expenses + PO amountPaid
  // (NOT PO grand total — an unpaid PO hasn't cost anything in cash terms).
  const invoiceRevenue = round2(invoices.reduce((sum, inv) => sum + toNum(inv.amountPaid), 0));
  const inquiryRevenue = round2(inquiries.reduce((sum, inq) => sum + toNum(inq.amountPaid), 0));
  const revenueCollected = round2(invoiceRevenue + inquiryRevenue);

  const expenseCost = round2(expenses.reduce((sum, e) => sum + toNum(e.amount), 0));
  const purchaseOrderCost = round2(
    purchaseOrders.reduce((sum, po) => sum + toNum(po.amountPaid), 0),
  );
  const totalCost = round2(expenseCost + purchaseOrderCost);

  const netProfit = round2(revenueCollected - totalCost);
  const marginPercent = revenueCollected > 0 ? round2((netProfit / revenueCollected) * 100) : 0;

  // Monthly trailing-6-month trend. NOTE: there's no separate "payment
  // date" field on Invoice/Inquiry/PurchaseOrder (amountPaid is a running
  // total, not a dated ledger) — each document's amountPaid is bucketed by
  // its own document date (invoiceDate/inquiryDate/orderDate), the same
  // simplification the Dashboard's RevenueTrendChart already makes for
  // "collected". A payment made in a later month than the document date
  // will therefore show up in the document's month here, not the month
  // cash actually changed hands. Flagged in the handback report.
  const now = new Date();
  const monthsBack = 6;
  const monthBuckets: Array<{ key: string; label: string; revenue: number; cost: number }> = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthBuckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("en-AE", { month: "short", year: "2-digit" }),
      revenue: 0,
      cost: 0,
    });
  }
  const bucketByKey = new Map(monthBuckets.map((bucket) => [bucket.key, bucket]));
  const keyFor = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;

  for (const inv of invoices) {
    const bucket = bucketByKey.get(keyFor(inv.invoiceDate));
    if (bucket) bucket.revenue += toNum(inv.amountPaid);
  }
  for (const inq of inquiries) {
    const bucket = bucketByKey.get(keyFor(inq.inquiryDate));
    if (bucket) bucket.revenue += toNum(inq.amountPaid);
  }
  for (const e of expenses) {
    const bucket = bucketByKey.get(keyFor(e.date));
    if (bucket) bucket.cost += toNum(e.amount);
  }
  for (const po of purchaseOrders) {
    const bucket = bucketByKey.get(keyFor(po.orderDate));
    if (bucket) bucket.cost += toNum(po.amountPaid);
  }

  const profitTrend: ProfitTrendPoint[] = monthBuckets.map((bucket) => ({
    month: bucket.label,
    revenue: round2(bucket.revenue),
    cost: round2(bucket.cost),
    net: round2(bucket.revenue - bucket.cost),
  }));

  const expenseRows = expenses.map((e) => ({
    id: e.id,
    date: e.date,
    category: e.category,
    description: e.description,
    amount: toNum(e.amount),
  }));

  // Headline P&L tiles — static figures (no count-up) so the numbers read
  // like a statement, each with a one-line note on what it's made of.
  const headline: Array<{
    label: string;
    value: string;
    tone: "green" | "red" | "neutral";
    note: string;
  }> = [
    {
      label: "Revenue collected",
      value: money(revenueCollected),
      tone: "green",
      note: "Paid on invoices and inquiries",
    },
    {
      label: "Total cost",
      value: money(totalCost),
      tone: "red",
      note: "Expenses plus purchase order payments",
    },
    {
      label: "Net profit",
      value: money(netProfit),
      tone: netProfit >= 0 ? "green" : "red",
      note: "Revenue collected minus total cost",
    },
    {
      label: "Margin",
      value: `${marginPercent.toFixed(1)}%`,
      tone: "neutral",
      note: "Net profit as a share of revenue",
    },
  ];

  return (
    <main className={pageWrap}>
      <div className={pageHeader}>
        <div>
          <h1 className={pageTitle}>Accounting</h1>
          <p className={pageSubtitle}>
            Cash basis: money actually collected minus money actually paid out.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {headline.map((stat) => (
          <div key={stat.label} className={statTile}>
            <div className={statLabel}>{stat.label}</div>
            <div className={statValueClass(stat.tone)}>{stat.value}</div>
            <p className={`${hintText} mt-2`}>{stat.note}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        <ProfitTrendChart data={profitTrend} />
        <RevenueCostBreakdownChart
          invoiceRevenue={invoiceRevenue}
          inquiryRevenue={inquiryRevenue}
          expenseCost={expenseCost}
          purchaseOrderCost={purchaseOrderCost}
        />
      </div>

      <section className="flex flex-col gap-4">
        <div className={sectionHeader}>
          <h2 className={sectionTitle}>Expenses</h2>
          {expenseRows.length > 0 && (
            <span className={hintText}>
              {expenseRows.length} logged, {money(expenseCost)} in total
            </span>
          )}
        </div>
        <div className={cardClass}>
          <ExpenseForm />
        </div>
        {expenseRows.length === 0 ? (
          <div className={emptyState}>No expenses logged yet.</div>
        ) : (
          <div className={tableWrap}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={thClass}>Date</th>
                  <th className={thClass}>Category</th>
                  <th className={thClass}>Description</th>
                  <th className={thNum}>Amount</th>
                  <th className={thNum}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {expenseRows.map((e) => (
                  <tr key={e.id} className={trHover}>
                    <td className={`${tdClass} whitespace-nowrap`}>
                      {e.date.toLocaleDateString("en-AE", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className={tdClass}>{e.category}</td>
                    <td className={tdClass}>
                      {e.description || <span className="text-faint">—</span>}
                    </td>
                    <td className={tdNum}>{money(e.amount)}</td>
                    <td className={tdNum}>
                      <DeleteExpenseButton expenseId={e.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
