"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { PageShell } from "@/components/ui/PageShell";
import { useApp } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import type { LessonPlan, StudyPlan } from "@/lib/types";

const FloatingIcon3D = dynamic(() => import("@/components/three/FloatingIcon3D"), {
  ssr: false,
});

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
      const path = await api.learningPath({
        topic,
        student_id: studentId,
        time_budget: profile.time_budget,
        learner_level: profile.level,
        language: profile.language,
        teaching_style: profile.style,
      });
      if (isStudyPlan(path)) setStudyPlan(path);
      else setLessonPlan(path);
      setProfile({ ...profile, topic });
      router.push("/lesson-plan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the lesson.");
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
            className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-widest text-cyan-100"
          >
            {chip}
          </motion.span>
        ))}
      </div>
      <form onSubmit={onSubmit} className="grid gap-6 md:grid-cols-2">
        <GlassCard
          className={`p-6 ${drag ? "border-cyan-300 shadow-[0_0_30px_rgba(0,212,255,0.35)]" : ""}`}
          hover={false}
        >
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
            className="mt-2 flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-white/30 px-6 py-10 text-center"
          >
            <input
              type="file"
              accept=".pdf,.docx,.pptx,.txt"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <p className="text-white/80">{file ? file.name : "Drag a file here, or click to upload"}</p>
            <p className="mt-2 text-xs text-white/50">PDF · DOCX · PPTX · TXT</p>
          </label>
        </GlassCard>
        <GlassCard className="flex flex-col justify-between p-6" hover={false}>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-widest text-white/60">Topic</label>
            <input
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-3 outline-none ring-cyan-400/0 transition focus:ring-2"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            />
            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          </div>
          <GlowButton type="submit" disabled={busy} className="mt-8">
            {busy ? "Building your path…" : "Generate diagnostic & plan"}
          </GlowButton>
        </GlassCard>
      </form>
    </PageShell>
  );
}
