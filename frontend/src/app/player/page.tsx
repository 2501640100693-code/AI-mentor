"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatedProgressBar } from "@/components/ui/AnimatedProgressBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { VisualPanel } from "@/components/VisualPanel";
import { useApp } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import type { MasteryRow, StatusPayload, TeachingTurn } from "@/lib/types";

function stageIcon(stage?: string) {
  switch (stage) {
    case "demonstrate":
      return "◆";
    case "question":
    case "evaluate":
      return "?";
    case "explain":
      return "✦";
    case "adapt":
      return "↻";
    default:
      return "●";
  }
}

export default function PlayerPage() {
  const router = useRouter();
  const { studentId, lessonId, profile, conversationUrl, lessonPlan } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const dailyRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<{ leave: () => Promise<unknown>; destroy: () => void } | null>(null);
  const [turn, setTurn] = useState<TeachingTurn | null>(null);
  const [mastery, setMastery] = useState<MasteryRow[]>([]);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    text: string;
    misconception?: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const forceFallback = status?.force_fallback === "true";
  const fallback = forceFallback || !conversationUrl;
  const useDaily =
    !forceFallback &&
    profile.teaching_via === "reactive" &&
    Boolean(conversationUrl);
  const localBadge =
    forceFallback || status?.llm_tier === "ollama" || status?.llm_tier === "local" || status?.mock_llm === "true";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const next = await api.nextTurn(studentId, lessonId);
      if (cancelled) return;
      setTurn(next);
      const clip = await api.renderBroadcast(next.script_text, next.language);
      if (cancelled) return;
      setVideoUrl(api.mediaUrl(clip.video_url) || `${apiBase}/static/avatar_talking.mp4`);
      setAudioUrl(api.mediaUrl(clip.audio_url));
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [studentId, lessonId]);

  useEffect(() => {
    async function poll() {
      const [m, s] = await Promise.all([api.mastery(studentId), api.status()]);
      setMastery(m);
      setStatus(s);
    }
    poll();
    const id = window.setInterval(poll, 8000);
    return () => window.clearInterval(id);
  }, [studentId]);

  useEffect(() => {
    if (!useDaily || !conversationUrl || !dailyRef.current) return;
    let cancelled = false;
    (async () => {
      const DailyIframe = (await import("@daily-co/daily-js")).default;
      if (cancelled || !dailyRef.current) return;
      const call = DailyIframe.createFrame(dailyRef.current, {
        showLeaveButton: false,
        iframeStyle: { width: "100%", height: "100%", border: "0", borderRadius: "16px" },
      });
      callRef.current = call;
      void call.join({ url: conversationUrl });
    })();
    return () => {
      cancelled = true;
      const call = callRef.current;
      if (call) {
        void call.leave();
        call.destroy();
        callRef.current = null;
      }
    };
  }, [useDaily, conversationUrl]);

  async function fetchNext() {
    const next = await api.nextTurn(studentId, lessonId);
    setTurn(next);
    const clip = await api.renderBroadcast(next.script_text, next.language);
    setVideoUrl(api.mediaUrl(clip.video_url) || `${apiBase}/static/avatar_talking.mp4`);
    setAudioUrl(api.mediaUrl(clip.audio_url));
    setFeedback(null);
    setAnswer("");
  }

  async function submitAnswer() {
    if (!turn?.question) return;
    setBusy(true);
    const result = await api.answer({
      student_id: studentId,
      lesson_id: lessonId,
      concept_id: turn.concept_id,
      turn_id: turn.turn_id,
      student_answer: answer,
    });
    setFeedback({
      correct: result.correct,
      text: result.feedback,
      misconception: result.misconception_id,
    });
    setMastery(await api.mastery(studentId));
    setBusy(false);
  }

  const names: Record<string, string> = Object.fromEntries(
    (lessonPlan?.concepts || []).map((c) => [c.concept_id, c.name]),
  );

  return (
    <main className="relative z-10 mx-auto min-h-screen max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Live lesson</p>
          <h1 className="text-2xl font-semibold">{profile.topic || "Adaptive classroom"}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
              localBadge ? "border-amber-300/40 text-amber-200" : "border-cyan-300/40 text-cyan-200"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
            </span>
            {status?.force_fallback === "true"
              ? "Local AI (RTX 5050)"
              : localBadge
                ? "Local AI (RTX 5050)"
                : "Cloud AI"}
          </span>
          <GlowButton type="button" onClick={() => router.push("/report")}>
            Finish
          </GlowButton>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        {mastery.map((row) => (
          <AnimatedProgressBar
            key={row.concept_id}
            label={names[row.concept_id] || row.concept_id}
            value={row.p_know}
          />
        ))}
      </div>

      <div className="perspective-player">
        <GlassCard className="grid gap-4 p-4 md:grid-cols-5" hover={false}>
          <div className="relative md:col-span-3">
            <div
              className={`absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs uppercase tracking-widest ${
                turn?.stage === "demonstrate"
                  ? "animate-pulse bg-cyan-400 text-[#0f0c29]"
                  : "bg-black/50 text-white"
              }`}
            >
              <span aria-hidden>{stageIcon(turn?.stage)}</span>
              {turn?.stage || "understand"}
            </div>
            {fallback ? (
              <span className="absolute left-3 top-3 z-10 animate-pulse rounded-full bg-amber-400/90 px-3 py-1 text-xs font-semibold text-black">
                Adaptive Mode
              </span>
            ) : null}
            {useDaily ? (
              <div ref={dailyRef} className="aspect-video overflow-hidden rounded-xl shadow-2xl" />
            ) : (
              <video
                ref={videoRef}
                className="aspect-video w-full rounded-xl object-cover shadow-2xl"
                autoPlay
                loop
                muted={!audioUrl}
                playsInline
                poster=""
                src={videoUrl || `${apiBase}/static/avatar_talking.mp4`}
              />
            )}
            {audioUrl ? <audio ref={audioRef} src={audioUrl} autoPlay /> : null}
          </div>
          <div className="md:col-span-2">
            <VisualPanel turn={turn} />
          </div>
        </GlassCard>
      </div>

      <p className="mt-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80">
        {turn?.script_text || "Preparing the next teaching turn…"}
      </p>

      {turn?.stage === "question" && turn.question ? (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 90, damping: 16 }}
          className="mt-4"
        >
          <GlassCard className="p-5" hover={false}>
            <p className="mb-3 text-sm text-white/70">Check for understanding</p>
            <p className="mb-4 text-lg font-medium">{turn.question.prompt}</p>
            {turn.question.type === "mcq" && turn.question.options ? (
              <div className="space-y-2">
                {turn.question.options.map((opt) => (
                  <label
                    key={opt}
                    className={`block cursor-pointer rounded-xl border px-3 py-2 ${
                      answer === opt ? "border-cyan-300 shadow-[0_0_16px_rgba(0,212,255,0.35)]" : "border-white/15"
                    }`}
                  >
                    <input
                      type="radio"
                      className="mr-2"
                      checked={answer === opt}
                      onChange={() => setAnswer(opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ) : (
              <div>
                <textarea
                  className="h-28 w-full rounded-xl border border-white/15 bg-black/30 p-3 outline-none focus:ring-2 focus:ring-cyan-400"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Answer in your own words"
                />
                <p className="mt-1 text-right text-xs text-white/40">{answer.length} chars</p>
              </div>
            )}
            <div className="mt-4 flex gap-3">
              <GlowButton type="button" onClick={submitAnswer} disabled={busy || !answer}>
                Submit
              </GlowButton>
              {feedback ? (
                <GlowButton type="button" onClick={fetchNext}>
                  Continue
                </GlowButton>
              ) : null}
            </div>
            {feedback ? (
              <motion.p
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`mt-4 rounded-xl px-4 py-3 ${
                  feedback.correct ? "bg-emerald-400/15 text-emerald-200" : "bg-rose-400/15 text-rose-200"
                }`}
              >
                {feedback.text}
                {feedback.misconception ? ` · misconception ${feedback.misconception}` : ""}
              </motion.p>
            ) : null}
          </GlassCard>
        </motion.div>
      ) : (
        <div className="mt-4">
          <GlowButton type="button" onClick={fetchNext}>
            Next turn
          </GlowButton>
        </div>
      )}
    </main>
  );
}
