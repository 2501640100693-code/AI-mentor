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
import { humanError } from "@/lib/errors";
import type { MasteryRow, StatusPayload, TeachingTurn } from "@/lib/types";

const TURN_LANGUAGES = ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam", "Marathi", "Bengali", "Gujarati"];

function splitSentences(text: string): string[] {
  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : text.trim() ? [text.trim()] : [];
}

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

// Resolves a concept id to a display label. Falls back to a generic,
// learner-facing "Concept N" label instead of leaking internal
// naming (hashes, "fallback_concept_x", etc.) when the lesson plan
// has no matching name.
function formatConceptLabel(conceptId: string, names: Record<string, string>, index: number) {
  if (names[conceptId]) return names[conceptId];

  const numberMatch = conceptId.match(/(\d+)(?!.*\d)/);
  return `Concept ${numberMatch ? numberMatch[1] : index + 1}`;
}

function badgeLabel(status: StatusPayload | null) {
  if (!status) return "Cloud AI";
  if (status.mock_llm === "true") return "Mock LLM";
  if (status.force_fallback === "true" || status.llm_tier === "ollama" || status.llm_tier === "local") {
    return "Local AI";
  }
  return "Cloud AI";
}

function applyClip(
  clip: { video_url?: string | null; audio_url?: string | null },
  apiBase: string,
  setVideoUrl: (url: string) => void,
  setAudioUrl: (url: string) => void,
) {
  setVideoUrl(api.mediaUrl(clip.video_url) || `${apiBase}/static/avatar_talking.mp4`);
  setAudioUrl(api.mediaUrl(clip.audio_url));
}

function videoShouldMute(videoUrl: string, audioUrl: string) {
  if (audioUrl) return true;
  const isLocalStatic = /\/static\//i.test(videoUrl);
  return isLocalStatic;
}

export default function PlayerPage() {
  const router = useRouter();
  const { hydrated, studentId, lessonId, profile, conversationUrl, lessonPlan } = useApp();
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
  const [error, setError] = useState<string | null>(null);
  const [turnLanguage, setTurnLanguage] = useState(profile.language || "English");
  const [clipDuration, setClipDuration] = useState(0);
  const [captionIndex, setCaptionIndex] = useState(0);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const forceFallback = status?.force_fallback === "true";
  const fallback =
    forceFallback ||
    (profile.teaching_via === "reactive" && !conversationUrl);
  const useDaily =
    !forceFallback &&
    profile.teaching_via === "reactive" &&
    Boolean(conversationUrl);
  const localBadge =
    forceFallback ||
    status?.llm_tier === "ollama" ||
    status?.llm_tier === "local" ||
    status?.mock_llm === "true";
  const muteVideo = videoShouldMute(videoUrl, audioUrl);
  const bannerReason = status?.fallback_reason;

  useEffect(() => {
    if (!hydrated) return;
    if (!studentId || !lessonId) {
      router.replace("/onboard");
    }
  }, [hydrated, studentId, lessonId, router]);

  useEffect(() => {
    if (!hydrated || !studentId || !lessonId) return;
    let cancelled = false;
    async function load() {
      setError(null);
      try {
        const next = await api.nextTurn(studentId, lessonId, {
          language_override: turnLanguage,
        });
        if (cancelled) return;
        setTurn(next);
        const clip = await api.renderBroadcast(
          next.script_text,
          next.language,
          next.concept_id,
          profile.level,
        );
        if (cancelled) return;
        applyClip(clip, apiBase, setVideoUrl, setAudioUrl);
        setClipDuration(clip.duration_seconds || 0);
      } catch (err) {
        if (!cancelled) {
          setError(humanError(err, "Could not load this turn."));
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [hydrated, studentId, lessonId, apiBase, profile.level]);

  useEffect(() => {
    if (!hydrated || !studentId) return;
    let cancelled = false;
    async function poll() {
      try {
        const [m, s] = await Promise.all([api.mastery(studentId, lessonId), api.status()]);
        if (cancelled) return;
        setMastery(m);
        setStatus(s);
      } catch {
        /* keep last good poll */
      }
    }
    poll();
    const id = window.setInterval(poll, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [hydrated, studentId, lessonId]);

  useEffect(() => {
    if (!useDaily || !conversationUrl || !dailyRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const DailyIframe = (await import("@daily-co/daily-js")).default;
        if (cancelled || !dailyRef.current) return;
        const call = DailyIframe.createFrame(dailyRef.current, {
          showLeaveButton: false,
          iframeStyle: { width: "100%", height: "100%", border: "0", borderRadius: "16px" },
        });
        callRef.current = call;
        await call.join({ url: conversationUrl });
      } catch (err) {
        if (!cancelled) setError(humanError(err, "Could not join the live classroom."));
      }
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

  async function fetchNext(opts?: { request_adapt?: boolean }) {
    setError(null);
    try {
      const next = await api.nextTurn(studentId, lessonId, {
        request_adapt: opts?.request_adapt,
        language_override: turnLanguage,
      });
      setTurn(next);
      const clip = await api.renderBroadcast(
        next.script_text,
        next.language,
        next.concept_id,
        profile.level,
      );
      applyClip(clip, apiBase, setVideoUrl, setAudioUrl);
      setClipDuration(clip.duration_seconds || 0);
      setFeedback(null);
      setAnswer("");
    } catch (err) {
      setError(humanError(err, "Could not load the next turn."));
    }
  }

  async function submitAnswer() {
    if (!turn?.question) return;
    setBusy(true);
    setError(null);
    try {
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
      setMastery(await api.mastery(studentId, lessonId));
    } catch (err) {
      setError(humanError(err, "Could not submit that answer."));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const sentences = splitSentences(turn?.script_text || "");
    setCaptionIndex(0);
    if (sentences.length <= 1) return;
    const words = (turn?.script_text || "").split(/\s+/).filter(Boolean).length;
    const totalSeconds = clipDuration > 0 ? clipDuration : Math.max(4, words / 2.5);
    const stepMs = (totalSeconds / sentences.length) * 1000;
    const id = window.setInterval(() => {
      setCaptionIndex((i) => Math.min(i + 1, sentences.length - 1));
    }, stepMs);
    return () => window.clearInterval(id);
  }, [turn?.turn_id, turn?.script_text, clipDuration]);

  const captionSentences = splitSentences(turn?.script_text || "");
  const captionText =
    captionSentences[Math.min(captionIndex, Math.max(captionSentences.length - 1, 0))] ||
    "Preparing the next teaching turn…";

  const conceptIds = new Set((lessonPlan?.concepts || []).map((c) => c.concept_id));
  const names: Record<string, string> = Object.fromEntries(
    (lessonPlan?.concepts || []).map((c) => [c.concept_id, c.name]),
  );

  const scopedMastery = conceptIds.size
    ? mastery.filter((row) => conceptIds.has(row.concept_id))
    : mastery;

  const dedupedMastery = Array.from(
    scopedMastery
      .reduce((map, row) => {
        map.set(row.concept_id, row);
        return map;
      }, new Map<string, MasteryRow>())
      .values(),
  );

  return (
    <main className="relative z-10 mx-auto min-h-screen max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--hairline)] pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--signal)]">Live lesson</p>
          <h1 className="text-2xl font-semibold">{profile.topic || "Adaptive classroom"}</h1>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-[color:var(--ink-dim)]">
            Next turn
            <select
              className="rounded-full border border-[color:var(--hairline)] bg-[color-mix(in_srgb,var(--surface)_60%,transparent)] px-2 py-1 text-xs text-[color:var(--ink)] outline-none"
              value={turnLanguage}
              onChange={(e) => setTurnLanguage(e.target.value)}
            >
              {TURN_LANGUAGES.includes(turnLanguage) ? null : (
                <option value={turnLanguage}>{turnLanguage}</option>
              )}
              {TURN_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </label>
          <span
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
              localBadge
                ? "border-[color:var(--ember-soft)] text-[color:var(--ember)]"
                : "border-[color:var(--signal-soft)] text-[color:var(--signal)]"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
            </span>
            {badgeLabel(status)}
          </span>
          <GlowButton type="button" onClick={() => router.push("/report")}>
            Finish
          </GlowButton>
        </div>
      </div>

      {bannerReason && bannerReason !== null ? (
        <p
          className="mb-4 rounded-xl border border-[color:var(--ember-soft)] bg-[color-mix(in_srgb,var(--ember)_12%,transparent)] px-4 py-2 text-sm text-[color:var(--ember)]"
          role="status"
        >
          {bannerReason === "mock_llm"
            ? "Running on mock lesson text — cloud LLM is off."
            : bannerReason === "mock_video"
              ? "Running on the loop clip — live avatar video is off."
              : bannerReason === "missing_key"
                ? "A cloud key is missing, so this lesson is using a fallback path."
                : bannerReason === "tier_failed"
                  ? "Cloud AI did not respond; using the next available path."
                  : bannerReason === "force_fallback"
                    ? "Forced local fallback is on."
                    : "Using a fallback path for this lesson."}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-xl border border-[color:var(--ember-soft)] px-4 py-2 text-sm text-[color:var(--ember)]">
          {error}
        </p>
      ) : null}

      {/* Mastery bars */}
      {dedupedMastery.length > 0 && (
        <section className="mb-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[color:var(--ink-dim)]">
            Concept mastery
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {dedupedMastery.map((row, index) => (
              <div
                key={row.concept_id}
                className="rounded-xl border border-[color:var(--hairline)] bg-[color-mix(in_srgb,var(--surface)_55%,transparent)] p-3 backdrop-blur-sm"
              >
                <AnimatedProgressBar
                  label={formatConceptLabel(row.concept_id, names, index)}
                  value={row.p_know}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main stage */}
      <div className="perspective-player">
        <GlassCard className="grid gap-4 p-4 md:grid-cols-5" hover={false}>
          <div className="relative md:col-span-3">
            <div
              className={`absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs uppercase tracking-widest ${
                turn?.stage === "demonstrate"
                  ? "animate-pulse bg-[color:var(--signal)] text-[color:var(--void)]"
                  : "bg-black/50 text-white"
              }`}
            >
              <span aria-hidden>{stageIcon(turn?.stage)}</span>
              {turn?.stage || "understand"}
            </div>
            {fallback ? (
              <span className="absolute left-3 top-3 z-10 animate-pulse rounded-full bg-[color:var(--ember)] px-3 py-1 text-xs font-semibold text-[color:var(--void)]">
                Adaptive Mode
              </span>
            ) : null}

            <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-[color-mix(in_srgb,var(--surface)_85%,transparent)] to-[color:var(--void)] shadow-2xl">
              {useDaily ? (
                <div ref={dailyRef} className="h-full w-full" />
              ) : (
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  autoPlay
                  loop
                  muted={muteVideo}
                  playsInline
                  poster=""
                  src={videoUrl || `${apiBase}/static/avatar_talking.mp4`}
                  suppressHydrationWarning
                />
              )}
              {!turn && !useDaily ? (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-[color:var(--ink-dim)]">
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--signal-soft)] border-t-[color:var(--signal)]" />
                  <p className="text-xs uppercase tracking-widest">Preparing your teacher…</p>
                </div>
              ) : null}
            </div>
            {audioUrl ? <audio ref={audioRef} src={audioUrl} autoPlay /> : null}
          </div>
          <div className="md:col-span-2">
            <VisualPanel turn={turn} />
          </div>
        </GlassCard>
      </div>

      {/* Narration caption */}
      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[color:var(--hairline)] bg-[color-mix(in_srgb,var(--surface)_55%,transparent)] px-4 py-3 backdrop-blur-xl">
        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--signal-soft)] text-[10px] text-[color:var(--signal)]">
          ✦
        </span>
        <p className="text-sm text-[color:var(--ink-dim)]">
          {captionText}
        </p>
      </div>

      {turn?.question ? (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 90, damping: 16 }}
          className="mt-6"
        >
          <GlassCard className="p-5" hover={false}>
            <p className="mb-3 text-sm text-[color:var(--ink-dim)]">Check for understanding</p>
            <p className="mb-4 text-lg font-medium">{turn.question.prompt}</p>
            {turn.question.type === "mcq" && turn.question.options ? (
              <div className="space-y-2">
                {turn.question.options.map((opt) => (
                  <label
                    key={opt}
                    className={`block cursor-pointer rounded-xl border px-3 py-2 ${
                      answer === opt
                        ? "border-[color:var(--signal)] shadow-[0_0_16px_rgba(79,184,166,0.35)]"
                        : "border-[color:var(--hairline)]"
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
                  className="h-28 w-full rounded-xl border border-[color:var(--hairline)] bg-[color-mix(in_srgb,var(--surface)_60%,transparent)] p-3 outline-none focus:ring-2 focus:ring-[color:var(--signal)]"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Answer in your own words"
                />
                <p className="mt-1 text-right text-xs text-[color:var(--ink-dim)]">{answer.length} chars</p>
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
                  feedback.correct
                    ? "bg-[color:var(--success-soft)] text-[color:var(--success)]"
                    : "bg-[color:var(--danger-soft)] text-[color:var(--danger)]"
                }`}
              >
                {feedback.text}
              </motion.p>
            ) : null}
          </GlassCard>
        </motion.div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          {turn?.stage === "demonstrate" ? (
            <>
              <GlowButton type="button" onClick={() => fetchNext()}>
                Yes, continue
              </GlowButton>
              <GlowButton type="button" onClick={() => fetchNext({ request_adapt: true })}>
                Explain differently
              </GlowButton>
            </>
          ) : (
            <GlowButton type="button" onClick={() => fetchNext()}>
              Next turn
            </GlowButton>
          )}
        </div>
      )}
    </main>
  );
}