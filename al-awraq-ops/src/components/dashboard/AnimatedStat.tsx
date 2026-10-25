"use client";

import { useEffect, useState } from "react";
import { motion, animate, useMotionValue } from "framer-motion";
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
 *
 * Uses `useMotionValue` + `animate(motionValue, target, {onUpdate})` rather
 * than the older `animate(from, to, options)` call shape — framer-motion
 * 13's `animate()` call signatures are `(value: number | MotionValue, keyframes, options)`,
 * so passing a bare number (not a MotionValue) as the first argument never
 * actually drives `onUpdate` — confirmed live, it silently no-ops and every
 * stat tile in the app rendered "0" regardless of the real value. Animating
 * an explicit MotionValue is the documented, version-stable way to do this.
 */
export function AnimatedStat({
  value,
  label,
  format = "integer",
  prefix = "",
  tone = "neutral",
  delay = 0,
  className = statTile,
}: {
  value: number;
  label: string;
  format?: "money" | "integer" | "percent";
  prefix?: string;
  tone?: Tone;
  delay?: number;
  /** Surface classes — defaults to a standalone stat tile; the dashboard
   * passes plain cell padding when tiles sit inside one shared ledger strip. */
  className?: string;
}) {
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.1,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(latest),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay]);

  const formatted =
    format === "money"
      ? formatMoney(display)
      : format === "percent"
        ? `${display.toFixed(1)}%`
        : Math.round(display).toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      <div className={statLabel}>{label}</div>
      <div className={statValueClass(tone)}>
        {prefix}
        {formatted}
      </div>
    </motion.div>
  );
}
