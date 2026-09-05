"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function GlowButton({
  children,
  className = "",
  disabled,
  type = "button",
  onClick,
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  variant?: "default" | "teal";
}) {
  const palette =
    variant === "teal"
      ? "rounded-xl bg-gradient-to-r from-[#0e8f6e] to-[#10CD98] font-semibold text-white shadow-[0_0_24px_rgba(16,205,152,0.35)]"
      : "rounded-full bg-gradient-to-r from-[#D9A441] to-[#E8BE6E] font-semibold text-[#221503] shadow-[0_0_24px_rgba(217,164,65,0.45)]";

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      className={`relative overflow-hidden px-6 py-3 transition disabled:cursor-not-allowed disabled:opacity-50 ${palette} ${className}`}
    >
      {children}
    </motion.button>
  );
}