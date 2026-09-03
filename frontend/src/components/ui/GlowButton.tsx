"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function GlowButton({
  children,
  className = "",
  disabled,
  type = "button",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      className={`relative overflow-hidden rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 px-6 py-3 font-semibold text-[#0f0c29] shadow-[0_0_24px_rgba(0,212,255,0.45)] transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </motion.button>
  );
}
