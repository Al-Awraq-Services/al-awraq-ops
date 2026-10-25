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
import { cardClass, sectionTitle, hintText } from "@/lib/ui/classNames";
import { formatMoney } from "@/lib/invoiceMath";

export type RevenueTrendPoint = {
  month: string;
  invoiced: number;
  collected: number;
};

// Recharts draws SVG, which can't take Tailwind classes — these mirror the
// globals.css tokens (brand, positive, line, muted).
const INVOICED = "#253a8c";
const COLLECTED = "#1e6a4a";
const GRID = "#e6e3dc";
const TICK = "#6b6962";

function formatAxisValue(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return `${value}`;
}

function LegendKey({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-2 text-[12.5px] text-muted">
      <svg width="18" height="6" aria-hidden="true">
        <line
          x1="0"
          y1="3"
          x2="18"
          y2="3"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dashed ? "3 3" : undefined}
        />
      </svg>
      {label}
    </span>
  );
}

export function RevenueTrendChart({ data }: { data: RevenueTrendPoint[] }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cardClass}
    >
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className={sectionTitle}>Revenue</h2>
          <p className={`${hintText} mt-0.5`}>Invoiced and collected, last six months</p>
        </div>
        <div className="flex items-center gap-4">
          <LegendKey color={INVOICED} label="Invoiced" />
          <LegendKey color={COLLECTED} label="Collected" dashed />
        </div>
      </div>
      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueInvoicedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={INVOICED} stopOpacity={0.1} />
                <stop offset="100%" stopColor={INVOICED} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: TICK }}
              axisLine={{ stroke: GRID }}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              tick={{ fontSize: 12, fill: TICK }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={formatAxisValue}
            />
            <Tooltip
              formatter={(value) => `AED ${formatMoney(Number(value))}`}
              cursor={{ stroke: "#d4d0c6", strokeWidth: 1 }}
              contentStyle={{
                borderRadius: 8,
                border: `1px solid ${GRID}`,
                boxShadow: "0 8px 24px -12px rgba(22,24,29,0.25)",
                fontSize: 13,
              }}
              labelStyle={{ color: "#16181d", fontWeight: 600, marginBottom: 4 }}
            />
            <Area
              type="monotone"
              dataKey="invoiced"
              name="Invoiced"
              stroke={INVOICED}
              strokeWidth={1.75}
              fill="url(#revenueInvoicedFill)"
              activeDot={{ r: 3.5, strokeWidth: 0 }}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            />
            <Area
              type="monotone"
              dataKey="collected"
              name="Collected"
              stroke={COLLECTED}
              strokeWidth={1.75}
              strokeDasharray="4 3"
              fill="none"
              activeDot={{ r: 3.5, strokeWidth: 0 }}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}
