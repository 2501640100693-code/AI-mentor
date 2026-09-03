"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GlowButton } from "@/components/ui/GlowButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageShell } from "@/components/ui/PageShell";
import { useApp } from "@/contexts/AppContext";
import type { LearnerProfile } from "@/lib/types";

const FloatingIcon3D = dynamic(() => import("@/components/three/FloatingIcon3D"), {
  ssr: false,
});

const FIELDS: Array<{
  key: keyof LearnerProfile;
  label: string;
  type: "text" | "select" | "radio";
  options?: string[];
}> = [
  { key: "name", label: "Your name", type: "text" },
  {
    key: "level",
    label: "Level",
    type: "select",
    options: ["beginner", "intermediate", "advanced"],
  },
  { key: "objective", label: "What do you want to walk out knowing?", type: "text" },
  { key: "knowledge", label: "What do you already know?", type: "text" },
  {
    key: "style",
    label: "Teaching style",
    type: "select",
    options: ["Direct", "Socratic", "Storytelling"],
  },
  {
    key: "language",
    label: "Language",
    type: "select",
    options: ["English", "Hindi"],
  },
  {
    key: "teaching_via",
    label: "Avatar mode",
    type: "radio",
    options: ["prerendered", "reactive"],
  },
  {
    key: "time_budget",
    label: "Time budget",
    type: "select",
    options: ["5 minutes", "20 minutes", "45 minutes", "7 days", "90 minutes a day for a week"],
  },
];

export default function OnboardPage() {
  const router = useRouter();
  const { profile, setProfile } = useApp();
  const [form, setForm] = useState<LearnerProfile>(profile);

  function update<K extends keyof LearnerProfile>(key: K, value: LearnerProfile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <PageShell
      title="Meet your AI teacher"
      subtitle="A cinematic, adaptive lesson cockpit — tell us who you are, then we build a path around you."
    >
      <div className="grid items-center gap-8 md:grid-cols-2">
        <div>
          <FloatingIcon3D kind="atom" />
          <p className="mt-4 text-sm text-white/60">
            Particles, glass, and a talking avatar. This is the lesson you demo in under seven minutes.
          </p>
        </div>
        <GlassCard className="p-6" hover={false}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setProfile(form);
              router.push("/upload");
            }}
          >
            {FIELDS.map((field, i) => (
              <motion.div
                key={field.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <label className="mb-1 block text-xs uppercase tracking-widest text-white/60">
                  {field.label}
                </label>
                {field.type === "select" ? (
                  <select
                    className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 outline-none ring-cyan-400/0 transition focus:ring-2"
                    value={form[field.key]}
                    onChange={(e) => update(field.key, e.target.value as never)}
                  >
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : field.type === "radio" ? (
                  <div className="flex gap-3">
                    {field.options?.map((opt) => (
                      <label
                        key={opt}
                        className={`flex-1 cursor-pointer rounded-xl border px-3 py-2 text-center text-sm ${
                          form.teaching_via === opt
                            ? "border-cyan-300 bg-cyan-300/15 text-cyan-200"
                            : "border-white/15 bg-black/20"
                        }`}
                      >
                        <input
                          type="radio"
                          className="hidden"
                          checked={form.teaching_via === opt}
                          onChange={() => update("teaching_via", opt as LearnerProfile["teaching_via"])}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 outline-none transition focus:ring-2 focus:ring-cyan-400"
                    value={form[field.key]}
                    onChange={(e) => update(field.key, e.target.value as never)}
                    required={field.key === "name"}
                  />
                )}
              </motion.div>
            ))}
            <GlowButton type="submit" className="mt-4 w-full">
              Continue
            </GlowButton>
          </form>
        </GlassCard>
      </div>
    </PageShell>
  );
}
