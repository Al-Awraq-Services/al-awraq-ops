"use client";

import { motion } from "framer-motion";
import { cardClass, sectionTitle, hintText, emptyState } from "@/lib/ui/classNames";
import { formatMoney } from "@/lib/invoiceMath";

/**
 * Collected vs outstanding as one proportional bar plus the two figures —
 * replaces the earlier donut chart, which spent a whole card on two numbers
 * and needed a hover to read either of them.
 */
export function PaidVsOutstandingChart({
  paid,
  outstanding,
}: {
  paid: number;
  outstanding: number;
}) {
  const collected = Math.max(paid, 0);
  const owed = Math.max(outstanding, 0);
  const total = collected + owed;
  const collectedShare = total > 0 ? collected / total : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
      className={`${cardClass} flex flex-col`}
    >
      <h2 className={sectionTitle}>Collection rate</h2>
      <p className={`${hintText} mt-0.5`}>Share of everything invoiced that has been paid</p>
      {total <= 0 ? (
        <div className={`${emptyState} mt-5`}>Nothing invoiced yet.</div>
      ) : (
        <>
          <p className="mt-6 font-display text-[3.25rem] font-light leading-none tracking-[-0.02em] text-ink figures">
            {(collectedShare * 100).toFixed(1)}
            <span className="ml-0.5 text-[1.75rem] text-muted">%</span>
          </p>
          <div
            className="mt-6 flex h-2 w-full overflow-hidden rounded-full bg-negative-tint"
            role="img"
            aria-label={`${(collectedShare * 100).toFixed(1)}% collected`}
          >
            <motion.div
              className="h-full rounded-full bg-positive"
              initial={{ width: 0 }}
              animate={{ width: `${collectedShare * 100}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            />
          </div>
          <dl className="mt-auto grid grid-cols-2 gap-4 pt-8 text-sm">
            <div>
              <dt className="flex items-center gap-2 text-muted">
                <span aria-hidden="true" className="size-2 rounded-full bg-positive" />
                Collected
              </dt>
              <dd className="mt-1 font-medium text-ink tabular-nums">AED {formatMoney(collected)}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-muted">
                <span aria-hidden="true" className="size-2 rounded-full bg-negative/70" />
                Outstanding
              </dt>
              <dd className="mt-1 font-medium text-negative tabular-nums">AED {formatMoney(owed)}</dd>
            </div>
          </dl>
        </>
      )}
    </motion.section>
  );
}
