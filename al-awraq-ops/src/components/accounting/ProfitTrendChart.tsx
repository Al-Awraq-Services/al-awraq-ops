"use client";

import { motion } from "framer-motion";
import {
  Area,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cardClass, sectionTitle, mutedText } from "@/lib/ui/classNames";
import { formatMoney } from "@/lib/invoiceMath";

export type ProfitTrendPoint = {
  month: string;
  revenue: number;
  cost: number;
  net: number;
};

function formatAxisValue(value: number): string {
  if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}k`;
  return `${value}`;
}

/**
 * Trailing 6-month cash-basis trend: revenue collected (Invoice +
 * Inquiry amountPaid) vs cost paid out (Expense + PurchaseOrder
 * amountPaid), with net profit drawn as a line over the two filled areas.
 * Follows the same recharts + framer-motion + cardClass pattern as
 * src/components/dashboard/RevenueTrendChart.tsx.
 */
export function ProfitTrendChart({ data }: { data: ProfitTrendPoint[] }) {
  const hasActivity = data.some((point) => point.revenue !== 0 || point.cost !== 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cardClass}
    >
      <h2 className={`${sectionTitle} mb-4`}>Revenue vs cost vs net (last 6 months)</h2>
      {!hasActivity ? (
        <p className={mutedText}>No cash activity yet.</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="profitRevenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profitCostFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                width={44}
                tickFormatter={formatAxisValue}
              />
              <Tooltip
                formatter={(value) => `AED ${formatMoney(Number(value))}`}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 10px 30px -15px rgba(0,0,0,0.2)",
                }}
              />
              <Legend verticalAlign="top" height={28} iconType="circle" />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue collected"
                stroke="#059669"
                strokeWidth={2}
                fill="url(#profitRevenueFill)"
                isAnimationActive
                animationDuration={1100}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="cost"
                name="Cost paid"
                stroke="#dc2626"
                strokeWidth={2}
                fill="url(#profitCostFill)"
                isAnimationActive
                animationDuration={1100}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey="net"
                name="Net profit"
                stroke="#1d4ed8"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#1d4ed8", strokeWidth: 0 }}
                isAnimationActive
                animationDuration={1100}
                animationEasing="ease-out"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
