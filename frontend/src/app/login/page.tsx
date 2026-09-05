"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { motion } from "framer-motion";
import { GlowButton } from "@/components/ui/GlowButton";
import { usePrefersReducedMotion } from "@/components/ParticleSphere/hooks";
import type { FocusField } from "@/components/ParticleSphere/ParticleSphere";

const ParticleSphereCanvas = dynamic(
  () => import("@/components/ParticleSphere/ParticleSphereCanvas"),
  { ssr: false }
);

function FieldBox({
  active,
  typing,
  children,
}: {
  active: boolean;
  typing: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`login-field-box ${active ? "is-focus" : ""} ${typing ? "is-typing" : ""}`}>
      <span className="login-field-spin" aria-hidden />
      <div className="login-field-inner">{children}</div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const reducedMotion = usePrefersReducedMotion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successTick, setSuccessTick] = useState(0);
  const [typingTick, setTypingTick] = useState(0);
  const [focusField, setFocusField] = useState<FocusField>(null);
  const [litField, setLitField] = useState<FocusField>(null);
  const [par, setPar] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (typingTick === 0) return;
    setLitField(focusField);
    const id = window.setTimeout(() => setLitField(null), 900);
    return () => window.clearTimeout(id);
  }, [typingTick, focusField]);

  useEffect(() => {
    if (reducedMotion) return;
    const onMove = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      setPar({ x: nx * 24, y: ny * 16 });
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [reducedMotion]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    setSubmitting(true);
    setSuccessTick((n) => n + 1);
    await new Promise((r) => setTimeout(r, 900));
    router.push("/onboard");
  }

  return (
    <div
      className={`relative min-h-screen overflow-hidden bg-black ${
        submitting && reducedMotion ? "opacity-0 transition-opacity duration-500" : ""
      }`}
    >
      <ParticleSphereCanvas
        successTick={successTick}
        typingTick={typingTick}
        focusField={focusField}
      />

      <div
        className="login-bg-lights"
        aria-hidden
        style={{
          transform: reducedMotion ? undefined : `translate3d(${par.x}px, ${par.y}px, 0)`,
          transition: reducedMotion ? undefined : "transform 0.45s ease-out",
        }}
      >
        <div className="login-bg-dust" />
        <div className="login-bg-orb login-bg-orb-a" />
        <div className="login-bg-orb login-bg-orb-b" />
        <div className="login-bg-orb login-bg-orb-c" />
        <div className="login-bg-ring" />
        <div className="login-bg-sweep" />
        <div className="login-bg-sweep-b" />
        <span className="login-bg-mote login-bg-mote-a" />
        <span className="login-bg-mote login-bg-mote-b" />
        <span className="login-bg-mote login-bg-mote-c" />
        <span className="login-bg-mote login-bg-mote-d" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{
          background:
            "linear-gradient(90deg, #000000 0%, rgba(0,0,0,0.88) 34%, rgba(0,0,0,0.28) 52%, transparent 68%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[16vh]"
        style={{
          background:
            "linear-gradient(to top, rgba(16,205,152,0.12) 0%, transparent 100%)",
        }}
      />

      <main className="pointer-events-none relative z-10 grid min-h-screen grid-cols-1 items-center lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
        <motion.div
          className="pointer-events-auto w-full max-w-lg px-8 py-16 md:px-14 lg:pl-20 lg:pr-6"
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-4 text-xs tracking-[0.32em] text-[#10CD98] uppercase">AI Mentor</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-[3.2rem] lg:leading-[1.1]">
            Your personal AI tutor
            <br />
            for every subject
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(90deg, #93FF0C 0%, #10CD98 100%)",
              }}
            >
              built around you.
            </span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/55 md:text-[15px]">
            Adaptive video lessons, a talking mentor, and instant feedback — learning that
            adjusts to exactly where you are.
          </p>

          <form className="mt-9 max-w-sm space-y-3.5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-[11px] tracking-[0.22em] text-white/50 uppercase">
                Email
              </span>
              <FieldBox active={focusField === "email"} typing={litField === "email"}>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setTypingTick((n) => n + 1);
                  }}
                  onFocus={() => setFocusField("email")}
                  onBlur={() => setFocusField((f) => (f === "email" ? null : f))}
                  placeholder="you@school.edu"
                />
              </FieldBox>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] tracking-[0.22em] text-white/50 uppercase">
                Password
              </span>
              <FieldBox active={focusField === "password"} typing={litField === "password"}>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setTypingTick((n) => n + 1);
                  }}
                  onFocus={() => setFocusField("password")}
                  onBlur={() => setFocusField((f) => (f === "password" ? null : f))}
                  placeholder="••••••••"
                />
              </FieldBox>
            </label>

            {error ? <p className="text-sm text-amber-200/90">{error}</p> : null}

            <GlowButton type="submit" disabled={submitting} variant="teal" className="mt-2 w-full">
              {submitting ? "Signing in…" : "Sign in"}
            </GlowButton>
          </form>

          <p className="mt-5 text-sm text-white/45">
            New here?{" "}
            <Link href="/onboard" className="text-[#10CD98] underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
        </motion.div>
        <div className="pointer-events-none hidden min-h-[40vh] lg:block" aria-hidden />
      </main>
    </div>
  );
}
