"use client";

import { motion } from "framer-motion";
import { cardClass, sectionTitle, hintText, emptyState } from "@/lib/ui/classNames";
import { formatMoney } from "@/lib/invoiceMath";

export type TopCustomer = { name: string; revenue: number };

/**
 * Ranked list with a thin proportional rule under each row — names stay
 * fully readable (the earlier horizontal bar chart truncated them to a
 * 110px axis) and exact figures are visible without hovering.
 */
export function TopCustomersChart({ data }: { data: TopCustomer[] }) {
  const max = data.reduce((m, c) => Math.max(m, c.revenue), 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.14 }}
      className={cardClass}
    >
      <h2 className={sectionTitle}>Top customers</h2>
      <p className={`${hintText} mt-0.5`}>By total invoiced, all time</p>
      {data.length === 0 ? (
        <div className={`${emptyState} mt-5`}>No customer revenue yet.</div>
      ) : (
        <ol className="mt-4 flex flex-col">
          {data.map((customer, index) => (
            <li key={customer.name} className="border-b border-line/70 py-3 last:border-b-0">
              <div className="flex items-baseline gap-3 text-sm">
                <span className="w-4 shrink-0 text-[12px] text-faint tabular-nums">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{customer.name}</span>
                <span className="shrink-0 text-ink-2 tabular-nums">AED {formatMoney(customer.revenue)}</span>
              </div>
              <div className="mt-2 ml-7 h-[3px] rounded-full bg-surface-3">
                <motion.div
                  className="h-full rounded-full bg-brand/70"
                  initial={{ width: 0 }}
                  animate={{ width: max > 0 ? `${(customer.revenue / max) * 100}%` : 0 }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 + index * 0.05 }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </motion.section>
  );
}
