"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { PageShell } from "@/components/ui/PageShell";
import { useApp } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import { humanError } from "@/lib/errors";
import type { ReportCard } from "@/lib/types";

const ScoreRing3D = dynamic(() => import("@/components/three/ScoreRing3D"), { ssr: false });

export default function ReportPage() {
  const router = useRouter();
  const { studentId, lessonId, lessonPlan } = useApp();
  const [card, setCard] = useState<ReportCard | null>(null);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!studentId || !lessonId) return;
    let cancelled = false;
    api
      .report(studentId, lessonId)
      .then((next) => {
        if (!cancelled) setCard(next);
      })
      .catch((err) => {
        if (!cancelled) setError(humanError(err, "Could not load the report."));
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, lessonId]);

  async function revision() {
    setBusy(true);
    setError("");
    try {
      const weak = card?.weak_areas?.length
        ? (lessonPlan?.concepts || [])
            .filter((c) => card.weak_areas.includes(c.name) || card.weak_areas.includes(c.concept_id))
            .map((c) => c.concept_id)
        : lessonPlan?.concepts.map((c) => c.concept_id) || [];
      await api.revisionSession(studentId, weak, lessonId);
      router.push("/player");
    } catch (err) {
      setError(humanError(err, "Could not start revision."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell title="Lesson report" subtitle="Mastery distilled into a score you can feel in 3D.">
      <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
        <ScoreRing3D score={card?.score_percent ?? 0} />
        <GlassCard className="p-6" hover={false}>
          {error ? <p className="mb-3 text-sm text-[color:var(--ember)]">{error}</p> : null}
          <p className="text-sm text-white/70">{card?.summary || card?.recommendation}</p>
          {card?.suggested_next_topic ? (
            <p className="mt-3 text-sm text-[color:var(--ink-dim)]">
              Suggested next: {card.suggested_next_topic}
            </p>
          ) : null}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-emerald-300">Strong</p>
              <div className="flex flex-wrap gap-2">
                {(card?.strong_areas || []).map((item, i) => (
                  <motion.span
                    key={item}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm text-emerald-200"
                  >
                    {item}
                  </motion.span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-rose-300">Needs work</p>
              <div className="flex flex-wrap gap-2">
                {(card?.weak_areas || []).map((item, i) => (
                  <motion.span
                    key={item}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="rounded-full bg-rose-400/15 px-3 py-1 text-sm text-rose-200"
                  >
                    {item}
                  </motion.span>
                ))}
              </div>
            </div>
          </div>
          {(card?.incorrect_concepts || []).length ? (
            <div className="mt-4">
              <p className="mb-2 text-xs uppercase tracking-widest text-[color:var(--ember)]">Missed this lesson</p>
              <div className="flex flex-wrap gap-2">
                {(card?.incorrect_concepts || []).map((item, i) => (
                  <motion.span
                    key={item}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="rounded-full border border-[color:var(--ember-soft)] px-3 py-1 text-sm text-[color:var(--ember)]"
                  >
                    {item}
                  </motion.span>
                ))}
              </div>
            </div>
          ) : null}
          {card?.recommendation && card?.summary ? (
            <p className="mt-4 text-sm text-white/55">{card.recommendation}</p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <GlowButton type="button" onClick={() => router.push("/flashcards")}>
              Flashcards
            </GlowButton>
            <GlowButton type="button" onClick={revision} disabled={busy}>
              Revision
            </GlowButton>
            <GlowButton type="button" onClick={() => router.push("/upload")}>
              Next topic
            </GlowButton>
            <GlowButton type="button" onClick={() => router.push("/concept-map")}>
              Concept map
            </GlowButton>
          </div>
        </GlassCard>
      </div>
    </PageShell>
  );
}
