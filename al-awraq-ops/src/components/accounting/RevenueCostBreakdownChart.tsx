"use client";

import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { cardClass, sectionTitle, mutedText } from "@/lib/ui/classNames";
import { formatMoney } from "@/lib/invoiceMath";

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
      <h3 className="mb-2 text-center text-sm font-medium text-neutral-600">{title}</h3>
      {total <= 0 ? (
        <p className={`${mutedText} text-center`}>No activity yet.</p>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={3}
                isAnimationActive
                animationDuration={1100}
                animationEasing="ease-out"
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => `AED ${formatMoney(Number(value))}`}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 10px 30px -15px rgba(0,0,0,0.2)",
                }}
              />
              <Legend verticalAlign="bottom" height={32} iconType="circle" />
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
 * with two breakdowns instead of one.
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
    { name: "Invoices", value: Math.max(invoiceRevenue, 0), color: "#059669" },
    { name: "Inquiries", value: Math.max(inquiryRevenue, 0), color: "#34d399" },
  ];
  const costData = [
    { name: "Expenses", value: Math.max(expenseCost, 0), color: "#dc2626" },
    { name: "Purchase orders", value: Math.max(purchaseOrderCost, 0), color: "#f87171" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
      className={cardClass}
    >
      <h2 className={`${sectionTitle} mb-4`}>Revenue &amp; cost breakdown</h2>
      <div className="flex flex-col gap-6 sm:flex-row">
        <MiniDonut title="Revenue collected" data={revenueData} />
        <MiniDonut title="Cost paid" data={costData} />
      </div>
    </motion.div>
  );
}
