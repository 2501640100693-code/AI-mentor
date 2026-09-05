"use client";

import dynamic from "next/dynamic";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { GlowButton } from "@/components/ui/GlowButton";
import { PageShell } from "@/components/ui/PageShell";
import { useApp } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import { humanError } from "@/lib/errors";
import type { DiagnosticQuestion, LessonPlan, StudyPlan } from "@/lib/types";

const FloatingIcon3D = dynamic(() => import("@/components/three/FloatingIcon3D"), {
  ssr: false,
});

// ── Themed card (same design as the onboarding page's card) ──────────
const CARD_THEME = {
  bg1: "#141A22",
  border: "#232B38",
  brass: "#D9A441",
  brassLight: "#E8BE6E",
} as const;

function useIsCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setCoarse(mq.matches);
    const handler = (e: MediaQueryListEvent) => setCoarse(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return coarse;
}

function CardCornerTicks() {
  const base: React.CSSProperties = {
    position: "absolute",
    width: 12,
    height: 12,
    border: `1px solid ${CARD_THEME.brass}`,
    opacity: 0.5,
  };
  return (
    <>
      <span style={{ ...base, top: 9, left: 9, borderRight: "none", borderBottom: "none" }} aria-hidden="true" />
      <span style={{ ...base, top: 9, right: 9, borderLeft: "none", borderBottom: "none" }} aria-hidden="true" />
      <span style={{ ...base, bottom: 9, left: 9, borderRight: "none", borderTop: "none" }} aria-hidden="true" />
      <span style={{ ...base, bottom: 9, right: 9, borderLeft: "none", borderTop: "none" }} aria-hidden="true" />
    </>
  );
}

const CARD_TILT_RANGE = 4;

function ThemedCard({
  children,
  className = "",
  enableSheen = true,
  highlighted = false,
}: {
  children: React.ReactNode;
  className?: string;
  enableSheen?: boolean;
  highlighted?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  const isCoarsePointer = useIsCoarsePointer();
  const tiltDisabled = shouldReduceMotion || isCoarsePointer;
  const containerRef = useRef<HTMLDivElement>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 120, damping: 18, mass: 0.6 });
  const springY = useSpring(rawY, { stiffness: 120, damping: 18, mass: 0.6 });

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (tiltDisabled || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rawY.set((px - 0.5) * 2 * CARD_TILT_RANGE);
    rawX.set((0.5 - py) * 2 * -CARD_TILT_RANGE);
  }

  function handlePointerLeave() {
    rawX.set(0);
    rawY.set(0);
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{ perspective: 1000 }}
    >
      <motion.div
        className={`relative overflow-hidden rounded-md border ${className}`}
        style={{
          backgroundColor: CARD_THEME.bg1,
          backgroundImage: `linear-gradient(${CARD_THEME.border} 1px, transparent 1px), linear-gradient(90deg, ${CARD_THEME.border} 1px, transparent 1px)`,
          backgroundSize: "22px 22px",
          backgroundPosition: "-1px -1px",
          borderColor: highlighted ? CARD_THEME.brass : CARD_THEME.border,
          boxShadow: highlighted ? "0 0 30px rgba(217,164,65,0.35)" : "none",
          rotateX: tiltDisabled ? 0 : springX,
          rotateY: tiltDisabled ? 0 : springY,
          transformPerspective: 1000,
        }}
      >
        <CardCornerTicks />
        {enableSheen && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12"
            style={{ background: `linear-gradient(90deg, transparent, ${CARD_THEME.brassLight}40, transparent)` }}
            initial={{ x: "-20%", opacity: 0 }}
            animate={shouldReduceMotion ? { opacity: 0 } : { x: "340%", opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.3, delay: 0.25, ease: "easeInOut", times: [0, 0.15, 0.85, 1] }}
          />
        )}
        <div className="relative z-10">{children}</div>
      </motion.div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────
function isStudyPlan(value: LessonPlan | StudyPlan): value is StudyPlan {
  return "daily_schedule" in value;
}

export default function UploadPage() {
  const router = useRouter();
  const {
    studentId,
    profile,
    setProfile,
    setDocumentId,
    setLessonId,
    setLessonPlan,
    setStudyPlan,
  } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [topic, setTopic] = useState(profile.topic || "Ohm's Law");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const [pendingLessonId, setPendingLessonId] = useState("");
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [familiarity, setFamiliarity] = useState<Record<string, "known" | "unknown" | null>>({});

  const chips = [
    profile.name || "Learner",
    profile.level,
    profile.language,
    profile.time_budget,
    profile.teaching_via,
  ];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      let documentId: string | null = null;
      if (file) {
        const ingested = await api.ingest(file);
        documentId = ingested.document_id;
        setDocumentId(documentId);
      }
      const diag = await api.diagnostic(studentId, topic, {
        document_id: documentId,
        learner_level: profile.level,
        language: profile.language,
        teaching_style: profile.style,
        time_budget: profile.time_budget,
      });
      setLessonId(diag.lesson_id);
      setLessonPlan(diag.lesson_plan);
      setPendingLessonId(diag.lesson_id);
      setQuestions(diag.questions || []);
      setAnswers({});
      setFamiliarity({});
      setProfile({ ...profile, topic });
    } catch (err) {
      setError(humanError(err, "Could not start the lesson."));
    } finally {
      setBusy(false);
    }
  }

  async function finishDiagnostic() {
    setBusy(true);
    setError("");
    try {
      if (pendingLessonId && questions.length) {
        await api.submitDiagnosticAnswers({
          student_id: studentId,
          lesson_id: pendingLessonId,
          answers: questions.map((q) => ({
            concept_id: q.concept_id,
            student_answer: answers[q.concept_id] || "",
            familiarity: familiarity[q.concept_id] ?? null,
          })),
        });
      }
      const path = await api.learningPath({
        topic,
        student_id: studentId,
        time_budget: profile.time_budget,
        learner_level: profile.level,
        language: profile.language,
        teaching_style: profile.style,
      });
      if (isStudyPlan(path)) setStudyPlan(path);
      router.push("/lesson-plan");
    } catch (err) {
      setError(humanError(err, "Could not score the diagnostic."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell
      title="Bring a document or a topic"
      subtitle="Drop a PDF, Word, PowerPoint, or text file — or just name the idea you want taught."
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {chips.map((chip, i) => (
          <motion.span
            key={chip}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-full border border-[#D9A441]/30 bg-[#D9A441]/10 px-3 py-1 text-xs uppercase tracking-widest text-[#EDE7DA]"
          >
            {chip}
          </motion.span>
        ))}
      </div>
      <form onSubmit={onSubmit} className="grid gap-6 md:grid-cols-2">
        <ThemedCard className="p-6" highlighted={drag}>
          <div className="h-40">
            <FloatingIcon3D kind="doc" />
          </div>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const next = e.dataTransfer.files[0];
              if (next) setFile(next);
            }}
            className="mt-2 flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-[#232B38] px-6 py-10 text-center"
          >
            <input
              type="file"
              accept=".pdf,.docx,.pptx,.txt"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <p className="text-[#EDE7DA]/80">{file ? file.name : "Drag a file here, or click to upload"}</p>
            <p className="mt-2 text-xs text-[#EDE7DA]/50">PDF · DOCX · PPTX · TXT</p>
          </label>
        </ThemedCard>
        <ThemedCard className="flex flex-col justify-between p-6">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-widest text-[#EDE7DA]/60">Topic</label>
            <input
              className="w-full rounded-xl border border-[#232B38] bg-black/30 px-3 py-3 outline-none ring-[#D9A441]/0 transition focus:ring-2 focus:border-[#D9A441]"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            />
            {error ? <p className="mt-3 text-sm text-[#E0796B]">{error}</p> : null}
          </div>
          <GlowButton type="submit" disabled={busy || questions.length > 0} className="mt-8">
            {busy && !questions.length ? "Building your path…" : "Generate diagnostic & plan"}
          </GlowButton>
        </ThemedCard>
      </form>
      {questions.length ? (
        <ThemedCard className="mt-6 p-6">
          <p className="mb-4 text-xs uppercase tracking-widest text-[#EDE7DA]/60">Quick diagnostic</p>
          <div className="space-y-5">
            {questions.map((q) => (
              <div key={q.concept_id}>
                <p className="mb-2 text-sm text-[#EDE7DA]">{q.question}</p>
                <textarea
                  className="h-20 w-full rounded-xl border border-[#232B38] bg-black/30 px-3 py-2 outline-none focus:ring-2 focus:ring-[#D9A441]"
                  value={answers[q.concept_id] || ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.concept_id]: e.target.value }))}
                  placeholder="Answer in your own words"
                />
                <div className="mt-2 flex gap-2">
                  <GlowButton
                    type="button"
                    onClick={() => setFamiliarity((prev) => ({ ...prev, [q.concept_id]: "known" }))}
                    className={familiarity[q.concept_id] === "known" ? "" : "opacity-70"}
                  >
                    I know this
                  </GlowButton>
                  <GlowButton
                    type="button"
                    onClick={() => setFamiliarity((prev) => ({ ...prev, [q.concept_id]: "unknown" }))}
                    className={familiarity[q.concept_id] === "unknown" ? "" : "opacity-70"}
                  >
                    I don't know
                  </GlowButton>
                </div>
              </div>
            ))}
          </div>
          <GlowButton type="button" className="mt-6" onClick={finishDiagnostic} disabled={busy}>
            {busy ? "Saving answers…" : "Continue to lesson plan"}
          </GlowButton>
        </ThemedCard>
      ) : null}
    </PageShell>
  );
}