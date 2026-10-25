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
import { cardClass, sectionTitle, hintText } from "@/lib/ui/classNames";
import { formatMoney } from "@/lib/invoiceMath";

export type ProfitTrendPoint = {
  month: string;
  revenue: number;
  cost: number;
  net: number;
};

// SVG attributes can't take Tailwind classes, so the chart uses the raw
// values of the globals.css tokens: brand navy (revenue), negative red
// (cost), positive green (net), line (grid) and muted (axis text).
const colors = {
  revenue: "#253a8c",
  cost: "#b42318",
  net: "#1e6a4a",
  grid: "#e6e3dc",
  axis: "#6b6962",
  cursor: "#d4d0c6",
};

function formatAxisValue(value: number): string {
  if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}k`;
  return `${value}`;
}

/**
 * Trailing 6-month cash-basis trend: revenue collected (Invoice +
 * Inquiry amountPaid) vs cost paid out (Expense + PurchaseOrder
 * amountPaid), with net profit drawn as a line over two lightly filled
 * areas. Follows the same recharts + framer-motion + cardClass pattern as
 * src/components/dashboard/RevenueTrendChart.tsx.
 */
export function ProfitTrendChart({ data }: { data: ProfitTrendPoint[] }) {
  const hasActivity = data.some((point) => point.revenue !== 0 || point.cost !== 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cardClass}
    >
      <div className="mb-4">
        <h2 className={sectionTitle}>Revenue, cost and net profit</h2>
        <p className={`${hintText} mt-0.5`}>Last 6 months, by document date</p>
      </div>
      {!hasActivity ? (
        <div className="flex h-72 items-center justify-center text-sm text-muted">
          No cash activity in the last 6 months.
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={colors.grid} vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: colors.axis }}
                axisLine={{ stroke: colors.grid }}
                tickLine={false}
                tickMargin={8}
              />
              <YAxis
                tick={{ fontSize: 12, fill: colors.axis }}
                axisLine={false}
                tickLine={false}
                width={44}
                tickFormatter={formatAxisValue}
              />
              <Tooltip
                formatter={(value) => `AED ${formatMoney(Number(value))}`}
                cursor={{ stroke: colors.cursor }}
                contentStyle={{
                  borderRadius: 8,
                  border: `1px solid ${colors.grid}`,
                  boxShadow: "0 8px 24px -12px rgba(22,24,29,0.25)",
                  fontSize: 13,
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={32}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12.5, color: colors.axis }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue collected"
                stroke={colors.revenue}
                strokeWidth={1.75}
                fill={colors.revenue}
                fillOpacity={0.06}
                isAnimationActive
                animationDuration={600}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="cost"
                name="Cost paid"
                stroke={colors.cost}
                strokeOpacity={0.6}
                strokeWidth={1.75}
                fill={colors.cost}
                fillOpacity={0.04}
                isAnimationActive
                animationDuration={600}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey="net"
                name="Net profit"
                stroke={colors.net}
                strokeWidth={2}
                dot={{ r: 2.5, fill: colors.net, strokeWidth: 0 }}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive
                animationDuration={600}
                animationEasing="ease-out"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
