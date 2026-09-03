"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { PageShell } from "@/components/ui/PageShell";
import { useApp } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import { MOCK_LESSON } from "@/lib/mockApi";

const ConceptGraph3D = dynamic(() => import("@/components/three/ConceptGraph3D"), {
  ssr: false,
});

function unlockAudio() {
  const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const osc = ctx.createOscillator();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.05);
  void ctx.resume();
}

export default function LessonPlanPage() {
  const router = useRouter();
  const { profile, lessonPlan, studyPlan, lessonId, setConversationUrl } = useApp();
  const [busy, setBusy] = useState(false);
  const plan = lessonPlan || MOCK_LESSON;
  const concepts = plan.concepts;

  const today = useMemo(() => studyPlan?.daily_schedule?.[0]?.day ?? 1, [studyPlan]);

  async function startLesson() {
    setBusy(true);
    unlockAudio();
    const session = await api.openReactiveSession(lessonId || plan.lesson_id);
    setConversationUrl(session.conversation_url || "");
    router.push("/player");
  }

  return (
    <PageShell
      title={studyPlan ? `${studyPlan.total_days}-day path` : plan.topic}
      subtitle={`${profile.level} · ${plan.time_budget_minutes || 20} minutes · ${plan.interaction_density} interaction`}
    >
      <GlassCard className="mb-6 p-4" hover={false}>
        <ConceptGraph3D concepts={concepts} />
      </GlassCard>
      {studyPlan ? (
        <div className="mb-6 flex gap-4 overflow-x-auto pb-2">
          {studyPlan.daily_schedule.map((day) => (
            <GlassCard
              key={day.day}
              className={`min-w-[180px] p-4 ${day.day === today ? "border-cyan-300 shadow-[0_0_24px_rgba(0,212,255,0.35)]" : ""}`}
              hover={false}
            >
              <p className="text-xs uppercase tracking-widest text-cyan-300">
                {day.day === today ? "Today" : `Day ${day.day}`}
              </p>
              <p className="mt-2 font-medium">{day.focus}</p>
              <p className="mt-1 text-xs text-white/60">{day.estimated_minutes} min</p>
            </GlassCard>
          ))}
        </div>
      ) : null}
      <GlassCard className="p-6" hover={false}>
        <div className="space-y-3">
          {concepts.map((c, i) => (
            <motion.div
              key={c.concept_id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl border border-white/10 bg-black/20 p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-white/50">
                    {c.estimated_minutes} min · {c.target_depth}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {c.prerequisite_ids.length === 0 ? (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white/60">
                      root
                    </span>
                  ) : (
                    c.prerequisite_ids.map((p) => (
                      <span
                        key={p}
                        className="rounded-full bg-violet-400/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-violet-200"
                      >
                        {p.split("_").slice(-1)[0]}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <GlowButton className="mt-6" onClick={startLesson} disabled={busy}>
          {busy ? "Opening session…" : "Start Lesson"}
        </GlowButton>
      </GlassCard>
    </PageShell>
  );
}
