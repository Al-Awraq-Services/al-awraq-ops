"use client";

import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { cardClass, sectionTitle } from "@/lib/ui/classNames";
import { formatMoney } from "@/lib/invoiceMath";

// Raw values of the globals.css tokens (SVG fills can't take Tailwind
// classes): brand navy + a light navy for revenue, negative red + a muted
// rose for cost.
const colors = {
  invoices: "#253a8c",
  inquiries: "#a8b0d1",
  expenses: "#b42318",
  purchaseOrders: "#c9a19b",
  line: "#e6e3dc",
  axis: "#6b6962",
};

function MiniDonut({
  title,
  data,
}: {
  title: string;
  data: Array<{ name: string; value: number; color: string }>;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="flex-1">
      <div className="mb-2 text-center">
        <h3 className="text-[13px] font-medium text-ink-2">{title}</h3>
        <p className="mt-0.5 font-display text-lg text-ink figures">AED {formatMoney(total)}</p>
      </div>
      {total <= 0 ? (
        <div className="flex h-56 items-center justify-center text-sm text-muted">
          No activity yet.
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={56}
                outerRadius={80}
                paddingAngle={2}
                isAnimationActive
                animationDuration={600}
                animationEasing="ease-out"
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => `AED ${formatMoney(Number(value))}`}
                contentStyle={{
                  borderRadius: 8,
                  border: `1px solid ${colors.line}`,
                  boxShadow: "0 8px 24px -12px rgba(22,24,29,0.25)",
                  fontSize: 13,
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={32}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12.5, color: colors.axis }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/**
 * Two side-by-side donuts in one card: how revenue collected splits
 * between Invoices and Inquiries, and how cost paid out splits between
 * Expenses and Purchase Orders. Same recharts + framer-motion + cardClass
 * pattern as src/components/dashboard/PaidVsOutstandingChart.tsx, just
 * with two breakdowns instead of one, separated by a hairline.
 */
export function RevenueCostBreakdownChart({
  invoiceRevenue,
  inquiryRevenue,
  expenseCost,
  purchaseOrderCost,
}: {
  invoiceRevenue: number;
  inquiryRevenue: number;
  expenseCost: number;
  purchaseOrderCost: number;
}) {
  const revenueData = [
    { name: "Invoices", value: Math.max(invoiceRevenue, 0), color: colors.invoices },
    { name: "Inquiries", value: Math.max(inquiryRevenue, 0), color: colors.inquiries },
  ];
  const costData = [
    { name: "Expenses", value: Math.max(expenseCost, 0), color: colors.expenses },
    { name: "Purchase orders", value: Math.max(purchaseOrderCost, 0), color: colors.purchaseOrders },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
      className={cardClass}
    >
      <h2 className={`${sectionTitle} mb-4`}>Revenue and cost breakdown</h2>
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-0 sm:divide-x sm:divide-line">
        <div className="flex-1 sm:pr-6">
          <MiniDonut title="Revenue collected" data={revenueData} />
        </div>
        <div className="flex-1 border-t border-line pt-6 sm:border-t-0 sm:pl-6 sm:pt-0">
          <MiniDonut title="Cost paid" data={costData} />
        </div>
      </div>
    </motion.div>
  );
}
