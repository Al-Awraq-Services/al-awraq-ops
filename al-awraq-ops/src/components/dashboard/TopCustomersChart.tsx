"use client";

import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { cardClass, sectionTitle, mutedText } from "@/lib/ui/classNames";
import { formatMoney } from "@/lib/invoiceMath";

export type TopCustomer = { name: string; revenue: number };

const barColors = ["#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"];

function formatAxisValue(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return `${value}`;
}

export function TopCustomersChart({ data }: { data: TopCustomer[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
      className={cardClass}
    >
      <h2 className={`${sectionTitle} mb-4`}>Top customers</h2>
      {data.length === 0 ? (
        <p className={mutedText}>No customer revenue yet.</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatAxisValue}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fontSize: 12, fill: "#374151" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => `AED ${formatMoney(Number(value))}`}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 10px 30px -15px rgba(0,0,0,0.2)",
                }}
              />
              <Bar
                dataKey="revenue"
                radius={[0, 8, 8, 0]}
                isAnimationActive
                animationDuration={1100}
                animationEasing="ease-out"
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={barColors[index % barColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
