"use client";

import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cardClass, sectionTitle } from "@/lib/ui/classNames";
import { formatMoney } from "@/lib/invoiceMath";

export type RevenueTrendPoint = {
  month: string;
  invoiced: number;
  collected: number;
};

function formatAxisValue(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return `${value}`;
}

export function RevenueTrendChart({ data }: { data: RevenueTrendPoint[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cardClass}
    >
      <h2 className={`${sectionTitle} mb-4`}>Revenue trend</h2>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueInvoicedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="revenueCollectedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0} />
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
            <Area
              type="monotone"
              dataKey="invoiced"
              name="Invoiced"
              stroke="#1d4ed8"
              strokeWidth={2}
              fill="url(#revenueInvoicedFill)"
              isAnimationActive
              animationDuration={1100}
              animationEasing="ease-out"
            />
            <Area
              type="monotone"
              dataKey="collected"
              name="Collected"
              stroke="#059669"
              strokeWidth={2}
              fill="url(#revenueCollectedFill)"
              isAnimationActive
              animationDuration={1100}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
