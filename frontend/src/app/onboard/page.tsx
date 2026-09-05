"use client";

import React, { forwardRef, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimation,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import { useApp } from "@/contexts/AppContext";
import type { LearnerProfile } from "@/lib/types";

// ── Theme tokens — read from globals.css, not invented per-page ───────
const ONBOARD_THEME = {
  bg0: "var(--void)",
  bg1: "var(--surface)",
  border: "var(--hairline)",
  ink: "var(--ink)",
  inkDim: "color-mix(in srgb, var(--ink) 55%, transparent)",
  inkFaint: "color-mix(in srgb, var(--ink) 30%, transparent)",
  brass: "var(--ember)",
  brassLight: "#dba26a",
  brassWash: "color-mix(in srgb, var(--ember) 13%, transparent)",
  danger: "#E0796B",
} as const;

// ── Shared: pointer capability ────────────────────────────────────────
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

// ── OrreryCenterpiece ────────────────────────────────────────────────
type OrreryStatus = "idle" | "active" | "complete";

const RINGS = [
  { radius: 92, rotateX: 72, rotateZ: 0, duration: 22, dir: 1, color: "rgba(200,130,60,0.55)" },
  { radius: 92, rotateX: 30, rotateZ: 60, duration: 17, dir: -1, color: "rgba(219,162,106,0.5)" },
  { radius: 92, rotateX: 105, rotateZ: 120, duration: 26, dir: 1, color: "rgba(79,184,166,0.4)" },
] as const;

const TILT_RANGE = 10;

function Ring({
  radius,
  rotateX,
  rotateZ,
  duration,
  dir,
  color,
  reduceMotion,
}: (typeof RINGS)[number] & { reduceMotion: boolean }) {
  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        width: radius * 2,
        height: radius * 2,
        marginLeft: -radius,
        marginTop: -radius,
        transformStyle: "preserve-3d",
        transform: `rotateX(${rotateX}deg) rotateZ(${rotateZ}deg)`,
      }}
    >
      <div
        className="h-full w-full rounded-full"
        style={{
          border: `1px solid ${color}`,
          boxShadow: `0 0 14px ${color}, inset 0 0 14px ${color}`,
          animation: reduceMotion
            ? undefined
            : `orrery-spin ${duration}s linear infinite ${dir === -1 ? "reverse" : "normal"}`,
        }}
      />
    </div>
  );
}

function OrreryCenterpiece({
  status = "idle",
  progress = 0,
  className = "",
}: {
  status?: OrreryStatus;
  progress?: number;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const isCoarsePointer = useIsCoarsePointer();
  const tiltDisabled = shouldReduceMotion || isCoarsePointer;
  const containerRef = useRef<HTMLDivElement>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 150, damping: 20, mass: 0.5 });
  const springY = useSpring(rawY, { stiffness: 150, damping: 20, mass: 0.5 });

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (tiltDisabled || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rawY.set((px - 0.5) * 2 * TILT_RANGE);
    rawX.set((0.5 - py) * 2 * -TILT_RANGE);
  }

  function handlePointerLeave() {
    rawX.set(0);
    rawY.set(0);
  }

  const coreGlow = 0.35 + progress * 0.4;

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`relative aspect-square w-full max-w-[280px] select-none ${className}`}
      style={{ perspective: 900 }}
      aria-hidden="true"
      data-status={status}
    >
      <style>{`
        @keyframes orrery-spin {
          from { transform: rotateZ(0deg); }
          to { transform: rotateZ(360deg); }
        }
      `}</style>
      <motion.div
        className="relative h-full w-full"
        style={{
          transformStyle: "preserve-3d",
          rotateX: tiltDisabled ? 0 : springX,
          rotateY: tiltDisabled ? 0 : springY,
        }}
      >
        {RINGS.map((ring, i) => (
          <Ring key={i} {...ring} reduceMotion={!!shouldReduceMotion} />
        ))}
        <div
          className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            backgroundColor: "var(--ember)",
            boxShadow: `0 0 ${12 + coreGlow * 20}px ${coreGlow * 10}px rgba(200,130,60,${coreGlow})`,
            transform: "translateZ(0)",
          }}
        />
      </motion.div>
    </div>
  );
}

// ── StepSidebar ────────────────────────────────────────────────────────
interface WaypointStep {
  title: string;
  description: string;
}

type WaypointStatus = "done" | "active" | "upcoming";

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-2 w-2" fill="none" aria-hidden="true">
      <path d="M2.5 6.2L4.8 8.5L9.5 3.5" stroke={ONBOARD_THEME.bg0} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WaypointConnector({ filled }: { filled: boolean }) {
  return (
    <div className="flex w-[13px] justify-center py-[3px]">
      <div className="relative w-[2px] overflow-hidden" style={{ height: 22, backgroundColor: ONBOARD_THEME.border }}>
        <div
          className="absolute left-0 top-0 w-full transition-[height] duration-[350ms] ease-out"
          style={{ height: filled ? "100%" : "0%", backgroundColor: ONBOARD_THEME.brass }}
        />
      </div>
    </div>
  );
}

function WaypointNode({
  step,
  index,
  status,
  isLast,
  onJump,
}: {
  step: WaypointStep;
  index: number;
  status: WaypointStatus;
  isLast: boolean;
  onJump: (index: number) => void;
}) {
  const dot = (
    <span
      className="relative flex h-[13px] w-[13px] flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300"
      style={{
        borderColor: status === "upcoming" ? ONBOARD_THEME.border : ONBOARD_THEME.brass,
        backgroundColor: status === "done" ? ONBOARD_THEME.brass : ONBOARD_THEME.bg0,
      }}
    >
      {status === "done" && <CheckIcon />}
    </span>
  );

  const title = (
    <span
      className="text-[13.5px] transition-colors duration-300"
      style={{ color: status === "upcoming" ? ONBOARD_THEME.inkFaint : ONBOARD_THEME.ink }}
    >
      {step.title}
    </span>
  );

  return (
    <li>
      {status === "done" ? (
        <button
          type="button"
          onClick={() => onJump(index)}
          className="-mx-0.5 flex items-center gap-3 rounded-sm px-0.5 py-0.5 transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8823c]"
          aria-label={`Go to step ${index + 1}: ${step.title}`}
        >
          {dot}
          {title}
        </button>
      ) : (
        <div className="flex items-center gap-3" aria-current={status === "active" ? "step" : undefined}>
          {dot}
          {title}
        </div>
      )}
      {!isLast && <WaypointConnector filled={status === "done"} />}
    </li>
  );
}

function StepSidebar({
  steps,
  currentStep,
  completedThrough,
  onJump,
  className = "",
}: {
  steps: WaypointStep[];
  currentStep: number;
  completedThrough: number;
  onJump: (index: number) => void;
  className?: string;
}) {
  const progress = steps.length > 0 ? (currentStep + 1) / steps.length : 0;
  const orreryStatus: OrreryStatus = currentStep === steps.length - 1 ? "complete" : "active";
  const activeDescription = steps[currentStep]?.description ?? "";

  return (
    <div className={className}>
      <OrreryCenterpiece status={orreryStatus} progress={progress} className="mb-7" />
      <nav aria-label="Onboarding steps">
        <ol className="flex flex-col">
          {steps.map((step, i) => (
            <WaypointNode
              key={i}
              step={step}
              index={i}
              status={i === currentStep ? "active" : i < completedThrough ? "done" : "upcoming"}
              isLast={i === steps.length - 1}
              onJump={onJump}
            />
          ))}
        </ol>
      </nav>
      <p className="mt-5 text-[12.5px] leading-relaxed" style={{ color: ONBOARD_THEME.inkDim }}>
        {activeDescription}
      </p>
    </div>
  );
}

// ── OnboardingCardShell ──────────────────────────────────────────────
function CornerTicks() {
  const base: React.CSSProperties = { position: "absolute", width: 12, height: 12, border: `1px solid ${ONBOARD_THEME.brass}`, opacity: 0.5 };
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

function OnboardingCardShell({
  children,
  className = "",
  enableSheen = true,
}: {
  children: React.ReactNode;
  className?: string;
  enableSheen?: boolean;
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
    <div ref={containerRef} onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave} style={{ perspective: 1000 }} className={className}>
      <motion.div
        className="relative overflow-hidden rounded-md border p-[30px]"
        style={{
          backgroundColor: "color-mix(in srgb, var(--surface) 78%, transparent)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          backgroundImage: `linear-gradient(${ONBOARD_THEME.border} 1px, transparent 1px), linear-gradient(90deg, ${ONBOARD_THEME.border} 1px, transparent 1px)`,
          backgroundSize: "22px 22px",
          backgroundPosition: "-1px -1px",
          borderColor: ONBOARD_THEME.border,
          rotateX: tiltDisabled ? 0 : springX,
          rotateY: tiltDisabled ? 0 : springY,
          transformPerspective: 1000,
        }}
      >
        <CornerTicks />
        {enableSheen && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12"
            style={{ background: `linear-gradient(90deg, transparent, ${ONBOARD_THEME.brassLight}40, transparent)` }}
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

// ── Form fields ────────────────────────────────────────────────────────
type FieldConfig = {
  key: keyof LearnerProfile;
  label: string;
  kind: "text" | "choice";
  options?: string[];
  multiline?: boolean;
};

const inputBaseClass =
  "w-full rounded border border-white/[0.07] bg-black/[0.22] px-[11px] py-[9px] text-sm text-[#f2f1ec] outline-none transition-colors duration-200 focus:border-[#c8823c] focus:ring-0";

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  error?: string;
};

const TextField = forwardRef(function TextField(
  { id, label, value, onChange, multiline = false, error }: TextFieldProps,
  ref: React.Ref<HTMLInputElement | HTMLTextAreaElement>
) {
  return (
    <div className="mb-4" data-field={id}>
      <label htmlFor={id} className="mb-[6px] block text-xs text-[#f2f1ec]/55">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          ref={ref as React.Ref<HTMLTextAreaElement>}
          className={`${inputBaseClass} min-h-[56px] resize-y`}
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      ) : (
        <input
          id={id}
          ref={ref as React.Ref<HTMLInputElement>}
          type="text"
          className={inputBaseClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      )}
      {error && (
        <p id={`${id}-error`} className="mt-[6px] text-xs text-[#E0796B]">
          {error}
        </p>
      )}
    </div>
  );
});

function ChipButton({ option, active, onSelect }: { option: string; active: boolean; onSelect: (value: string) => void }) {
  const shouldReduceMotion = useReducedMotion();
  const controls = useAnimation();
  const wasActive = useRef(active);

  useEffect(() => {
    if (active && !wasActive.current && !shouldReduceMotion) {
      controls.start({ scale: [1, 1.06, 1] }, { duration: 0.25, ease: "easeOut" });
    }
    wasActive.current = active;
  }, [active, controls, shouldReduceMotion]);

  return (
    <motion.button
      type="button"
      role="button"
      aria-pressed={active}
      animate={controls}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
      onClick={() => onSelect(option)}
      className={`rounded border px-[13px] py-[7px] text-[13px] transition-colors duration-200 ${
        active
          ? "border-[#c8823c] bg-[#c8823c]/[0.13] text-[#f2f1ec]"
          : "border-white/[0.07] text-[#f2f1ec]/55 hover:border-white/20 hover:text-[#f2f1ec]"
      } focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8823c]`}
    >
      <span className="capitalize">{option}</span>
    </motion.button>
  );
}

function ChoiceField({ id, label, options, value, onChange }: { id: string; label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="mb-4" data-field={id}>
      <label className="mb-[6px] block text-xs text-[#f2f1ec]/55">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <ChipButton key={opt} option={opt} active={value === opt} onSelect={onChange} />
        ))}
      </div>
    </div>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
  error,
}: {
  field: FieldConfig;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  if (field.kind === "choice") {
    return <ChoiceField id={String(field.key)} label={field.label} options={field.options ?? []} value={value} onChange={onChange} />;
  }
  return <TextField id={String(field.key)} label={field.label} value={value} onChange={onChange} multiline={field.multiline} error={error} />;
}

// ── StepFieldsPanel ──────────────────────────────────────────────────
const stepVariants = {
  enter: ({ dir, reduce }: { dir: number; reduce: boolean }) => ({ opacity: 0, x: reduce ? 0 : dir * 32 }),
  center: { opacity: 1, x: 0 },
  exit: ({ dir, reduce }: { dir: number; reduce: boolean }) => ({ opacity: 0, x: reduce ? 0 : dir * -32 }),
};

function StepFieldsPanel({
  title,
  description,
  fields,
  form,
  errors,
  onFieldChange,
  direction,
  reduceMotion,
  autoFocusEnabled,
}: {
  title: string;
  description: string;
  fields: FieldConfig[];
  form: LearnerProfile;
  errors: Partial<Record<keyof LearnerProfile, string>>;
  onFieldChange: <K extends keyof LearnerProfile>(key: K, value: LearnerProfile[K]) => void;
  direction: number;
  reduceMotion: boolean;
  autoFocusEnabled: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoFocusEnabled) return;
    const target = panelRef.current?.querySelector<HTMLElement>('input, textarea, [role="button"]');
    target?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      ref={panelRef}
      custom={{ dir: direction, reduce: reduceMotion }}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
    >
      <h2 className="mb-1 text-[17px] font-semibold" style={{ color: ONBOARD_THEME.ink }}>
        {title}
      </h2>
      <p className="mb-[22px] text-[13px]" style={{ color: ONBOARD_THEME.inkDim }}>
        {description}
      </p>
      {fields.map((field) => (
        <FieldRenderer
          key={field.key}
          field={field}
          value={form[field.key] as string}
          onChange={(value) => onFieldChange(field.key, value as never)}
          error={errors[field.key]}
        />
      ))}
    </motion.div>
  );
}

// ── Step config ────────────────────────────────────────────────────────
type Step = { title: string; description: string; fields: FieldConfig[] };

const STEPS: Step[] = [
  {
    title: "About you",
    description: "So the lesson matches your pace and vocabulary.",
    fields: [
      { key: "name", label: "Your name", kind: "text" },
      { key: "level", label: "Level", kind: "choice", options: ["beginner", "intermediate", "advanced"] },
    ],
  },
  {
    title: "What you're here for",
    description: "This becomes the target the lesson is built around.",
    fields: [
      { key: "objective", label: "What do you want to walk out knowing?", kind: "text", multiline: true },
      { key: "knowledge", label: "What do you already know?", kind: "text", multiline: true },
    ],
  },
  {
    title: "How you'd like it taught",
    description: "Pick a style, language, and how much time you've got.",
    fields: [
      { key: "style", label: "Teaching style", kind: "choice", options: ["Direct", "Socratic", "Storytelling"] },
      { key: "language", label: "Language", kind: "choice", options: ["English", "Hindi"] },
      { key: "teaching_via", label: "Avatar mode", kind: "choice", options: ["prerendered", "reactive"] },
      { key: "time_budget", label: "Time budget", kind: "choice", options: ["5 minutes", "20 minutes", "45 minutes", "7 days", "90 minutes a day for a week"] },
    ],
  },
];

// ── Page ─────────────────────────────────────────────────────────────
export default function OnboardPage() {
  const router = useRouter();
  const { profile, setProfile } = useApp();
  const [form, setForm] = useState<LearnerProfile>(profile);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [completedThrough, setCompletedThrough] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LearnerProfile, string>>>({});
  const shouldReduceMotion = useReducedMotion();

  const hasMountedRef = useRef(false);
  useEffect(() => {
    hasMountedRef.current = true;
  }, []);

  function update<K extends keyof LearnerProfile>(key: K, value: LearnerProfile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  const isLastStep = step === STEPS.length - 1;
  const current = STEPS[step];

  function validateStep(index: number): boolean {
    if (index !== 0) return true;
    if (String(form.name ?? "").trim().length === 0) {
      setFieldErrors((prev) => ({ ...prev, name: "Enter your name first" }));
      return false;
    }
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    if (isLastStep) {
      setProfile(form);
      router.push("/upload");
      return;
    }
    setCompletedThrough((c) => Math.max(c, step + 1));
    setDirection(1);
    setStep((s) => s + 1);
  }

  function goBack() {
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  }

  function jumpTo(index: number) {
    if (index === step || index > completedThrough) return;
    setDirection(index > step ? 1 : -1);
    setStep(index);
  }

  return (
    <PageShell title="Tell us what you're here to learn" subtitle="Three short steps, then we build your lesson.">
      <div className="relative isolate">
        <div className="relative grid items-start gap-8 md:grid-cols-[190px_1fr]">
          <StepSidebar
            steps={STEPS}
            currentStep={step}
            completedThrough={completedThrough}
            onJump={jumpTo}
            className="md:sticky md:top-24"
          />

          <OnboardingCardShell>
            <div className="mb-6 h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: ONBOARD_THEME.border }}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: ONBOARD_THEME.brass }}
                animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: "easeOut" }}
              />
            </div>

            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                goNext();
              }}
            >
              <p className="mb-1 text-xs" style={{ color: ONBOARD_THEME.brassLight }}>
                Step {step + 1} of {STEPS.length}
              </p>

              <AnimatePresence mode="wait" initial={false}>
                <StepFieldsPanel
                  key={step}
                  title={current.title}
                  description={current.description}
                  fields={current.fields}
                  form={form}
                  errors={fieldErrors}
                  onFieldChange={update}
                  direction={direction}
                  reduceMotion={!!shouldReduceMotion}
                  autoFocusEnabled={hasMountedRef.current}
                />
              </AnimatePresence>

              <div className="mt-[22px] flex items-center justify-between border-t pt-[18px]" style={{ borderColor: ONBOARD_THEME.border }}>
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={goBack}
                    className="rounded-sm px-1 py-2 text-[13px] text-[#f2f1ec]/55 transition-colors duration-200 hover:text-[#f2f1ec] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8823c]"
                  >
                    Back
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  className="rounded bg-[#c8823c] px-[18px] py-[10px] text-[13px] font-semibold text-[#1a1006] transition-colors duration-200 hover:bg-[#dba26a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8823c]"
                >
                  {isLastStep ? "Continue to upload" : "Next"}
                </button>
              </div>
            </form>
          </OnboardingCardShell>
        </div>
      </div>
    </PageShell>
  );
}