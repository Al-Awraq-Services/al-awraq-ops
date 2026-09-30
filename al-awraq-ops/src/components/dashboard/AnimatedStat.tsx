"use client";

import { useEffect, useState } from "react";
import { motion, animate } from "framer-motion";
import { statTile, statLabel, statValueClass } from "@/lib/ui/classNames";
import { formatMoney } from "@/lib/invoiceMath";

type Tone = "blue" | "red" | "green" | "neutral";

/**
 * A stat tile whose number counts up from 0 to `value` on mount, driven by
 * framer-motion's imperative `animate()` (numeric tween, not a spring — a
 * spring can overshoot/oscillate past the target, which reads oddly for a
 * money figure). The tile itself fades + slides up on entrance.
 *
 * `format` is a plain string tag, not a function prop — a Server Component
 * caller cannot pass a function across the Server/Client boundary (Next.js
 * throws "Functions cannot be passed directly to Client Components"), so
 * the actual formatting logic lives here instead.
 */
export function AnimatedStat({
  value,
  label,
  format = "integer",
  prefix = "",
  tone = "neutral",
  delay = 0,
}: {
  value: number;
  label: string;
  format?: "money" | "integer";
  prefix?: string;
  tone?: Tone;
  delay?: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.1,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(latest),
    });
    return () => controls.stop();
  }, [value, delay]);

  const formatted = format === "money" ? formatMoney(display) : Math.round(display).toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={statTile}
    >
      <div className={statLabel}>{label}</div>
      <div className={statValueClass(tone)}>
        {prefix}
        {formatted}
      </div>
    </motion.div>
  );
}
