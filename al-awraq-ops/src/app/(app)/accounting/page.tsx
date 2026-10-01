import { db } from "@/lib/db";
import { requireMainAccount } from "@/lib/auth/appAuth";
import { toNum, round2, formatMoney } from "@/lib/invoiceMath";
import { AnimatedStat } from "@/components/dashboard/AnimatedStat";
import { ProfitTrendChart, type ProfitTrendPoint } from "@/components/accounting/ProfitTrendChart";
import { RevenueCostBreakdownChart } from "@/components/accounting/RevenueCostBreakdownChart";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { DeleteExpenseButton } from "@/components/forms/DeleteExpenseButton";
import {
  pageWrap,
  pageTitle,
  pageSubtitle,
  sectionTitle,
  statGrid,
  tableWrap,
  table,
  thClass,
  tdClass,
  trHover,
  mutedText,
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

  return (
    <main className={pageWrap}>
      <div>
        <h1 className={pageTitle}>Accounting</h1>
        <p className={pageSubtitle}>
          The whole number game — cash actually collected minus cash actually spent.
        </p>
      </div>

      <div className={statGrid}>
        <AnimatedStat
          label="Revenue collected"
          value={revenueCollected}
          format="money"
          prefix="AED "
          tone="green"
          delay={0}
        />
        <AnimatedStat
          label="Total cost"
          value={totalCost}
          format="money"
          prefix="AED "
          tone="red"
          delay={0.05}
        />
        <AnimatedStat
          label="Net profit"
          value={netProfit}
          format="money"
          prefix="AED "
          tone={netProfit >= 0 ? "green" : "red"}
          delay={0.1}
        />
        <AnimatedStat
          label="Margin"
          value={marginPercent}
          format="percent"
          tone="blue"
          delay={0.15}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <ProfitTrendChart data={profitTrend} />
        </div>
        <div className="lg:col-span-2">
          <RevenueCostBreakdownChart
            invoiceRevenue={invoiceRevenue}
            inquiryRevenue={inquiryRevenue}
            expenseCost={expenseCost}
            purchaseOrderCost={purchaseOrderCost}
          />
        </div>
      </div>

      <div>
        <h2 className={`${sectionTitle} mb-3`}>Expenses</h2>
        <div className="mb-4">
          <ExpenseForm />
        </div>
        {expenseRows.length === 0 ? (
          <p className={mutedText}>No expenses logged yet.</p>
        ) : (
          <div className={tableWrap}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={thClass}>Date</th>
                  <th className={thClass}>Category</th>
                  <th className={thClass}>Description</th>
                  <th className={thClass}>Amount</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody>
                {expenseRows.map((e) => (
                  <tr key={e.id} className={trHover}>
                    <td className={tdClass}>
                      {e.date.toLocaleDateString("en-AE", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className={tdClass}>{e.category}</td>
                    <td className={tdClass}>{e.description || <span className={mutedText}>—</span>}</td>
                    <td className={tdClass}>{money(e.amount)}</td>
                    <td className={tdClass}>
                      <DeleteExpenseButton expenseId={e.id} />
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
