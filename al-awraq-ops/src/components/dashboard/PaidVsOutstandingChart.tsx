"use client";

import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { cardClass, sectionTitle, mutedText } from "@/lib/ui/classNames";
import { formatMoney } from "@/lib/invoiceMath";

export function PaidVsOutstandingChart({
  paid,
  outstanding,
}: {
  paid: number;
  outstanding: number;
}) {
  const data = [
    { name: "Collected", value: Math.max(paid, 0), color: "#059669" },
    { name: "Outstanding", value: Math.max(outstanding, 0), color: "#dc2626" },
  ];
  const total = data[0].value + data[1].value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
      className={cardClass}
    >
      <h2 className={`${sectionTitle} mb-4`}>Paid vs outstanding</h2>
      {total <= 0 ? (
        <p className={mutedText}>No invoices yet.</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={68}
                outerRadius={100}
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
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
