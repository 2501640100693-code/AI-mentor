"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function PageShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10"
    >
      <div className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-[0.28em] text-cyan-300">AI Teacher</p>
        <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">{title}</h1>
        {subtitle ? <p className="mt-3 max-w-2xl text-white/70">{subtitle}</p> : null}
      </div>
      {children}
    </motion.main>
  );
}
