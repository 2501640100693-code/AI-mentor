"use client";

import { motion } from "framer-motion";

function barColor(value: number) {
  if (value >= 0.7) return { fill: "#34d399", glow: "rgba(52,211,153,0.65)" };
  if (value >= 0.5) return { fill: "#fbbf24", glow: "rgba(251,191,36,0.55)" };
  return { fill: "#f87171", glow: "rgba(248,113,113,0.55)" };
}

export function AnimatedProgressBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const { fill, glow } = barColor(clamped);
  return (
    <div className="min-w-[140px] flex-1">
      <div className="mb-1 flex justify-between text-[11px] uppercase tracking-wide text-white/70">
        <span className="truncate pr-2">{label}</span>
        <span>{Math.round(clamped * 100)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamped * 100}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
          className="h-full rounded-full"
          style={{ background: fill, boxShadow: `0 0 12px ${glow}` }}
        />
      </div>
    </div>
  );
}
