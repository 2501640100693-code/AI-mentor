"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";

const ReactiveOrbHero = dynamic(
  () => import("@/components/three/ReactiveOrbHero"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-48 w-48 animate-pulse rounded-full border border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_60px_rgba(0,212,255,0.2)]" />
      </div>
    ),
  },
);

const FEATURES = [
  {
    title: "Real-Time Talking Avatar",
    desc: "Interactive video lessons streamed via WebRTC with an expressive AI avatar that explains and reacts dynamically.",
    icon: "🎙️",
    badge: "Daily.co Live",
    href: "/player",
  },
  {
    title: "RAG Document Grounding",
    desc: "Upload PDFs, syllabi, or notes. The system indexes your materials into grounded knowledge trees instantly.",
    icon: "📑",
    badge: "Vector RAG",
    href: "/upload",
  },
  {
    title: "Bayesian Knowledge Tracing",
    desc: "Probabilistic skill modeling tracks your latent mastery (p_know) after every question and updates continuously.",
    icon: "🧠",
    badge: "BKT Engine",
    href: "/quiz",
  },
  {
    title: "Interactive 3D Concept Map",
    desc: "Explore prerequisite concept graphs in full 3D with live status nodes color-coded by mastery tier.",
    icon: "🌐",
    badge: "3D Force Graph",
    href: "/concept-map",
  },
  {
    title: "Spaced Repetition Flashcards",
    desc: "Retain high-yield definitions and equations with active recall and 3D flip card animations.",
    icon: "⚡",
    badge: "Leitner System",
    href: "/flashcards",
  },
  {
    title: "Mastery Cockpit & Reports",
    desc: "Get diagnostic score rings, detailed strength/weakness heatmaps, and next-step study recommendations.",
    icon: "📊",
    badge: "Analytics",
    href: "/report",
  },
];

const STATS = [
  { value: "99.4%", label: "Fact Grounding Accuracy" },
  { value: "249", label: "Neural Clones In Core" },
  { value: "<350ms", label: "Reactive Turn Latency" },
  { value: "100%", label: "Personalized Curriculum" },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0f0c29]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 shadow-[0_0_18px_rgba(0,212,255,0.5)] transition duration-300 group-hover:scale-105">
              <span className="text-xl font-black text-black">Ω</span>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white group-hover:text-cyan-300 transition">
                AI Teacher
              </span>
              <span className="hidden text-xs text-white/50 sm:inline sm:ml-2">
                Adaptive 3D LMS
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-white/70 md:flex">
            <Link href="/player" className="transition hover:text-cyan-300">
              Classroom
            </Link>
            <Link href="/concept-map" className="transition hover:text-cyan-300">
              Concept Map
            </Link>
            <Link href="/quiz" className="transition hover:text-cyan-300">
              Adaptive Quiz
            </Link>
            <Link href="/flashcards" className="transition hover:text-cyan-300">
              Flashcards
            </Link>
            <Link href="/upload" className="transition hover:text-cyan-300">
              Upload Docs
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/onboard">
              <button className="relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 via-teal-300 to-violet-400 px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#081521] shadow-[0_0_20px_rgba(0,212,255,0.4)] transition duration-200 hover:scale-105 hover:shadow-[0_0_28px_rgba(0,212,255,0.7)]">
                Launch App
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section — Spline Reactive Orb Spec */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-8 pb-16 lg:pt-14 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          {/* Left Text & CTA Group */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-start lg:col-span-6"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-950/40 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-cyan-300 shadow-[0_0_15px_rgba(0,212,255,0.2)] backdrop-blur-md">
              <span className="h-2 w-2 animate-ping rounded-full bg-cyan-400" />
              <span>3D REACTIVE ORB ENGINE • WEBGL</span>
            </div>

            <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
              <span className="block">Effortless</span>
              <span className="block text-white/95">AI-Powered Learning</span>
              <span className="block bg-gradient-to-r from-cyan-300 via-teal-200 to-sky-400 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(0,212,255,0.55)]">
                for your growth
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              No extra setup, just smart adaptive education when you need it.
              Stream real-time talking AI avatar lessons, explore 3D knowledge
              graphs, and master any subject with Bayesian skill tracking.
            </p>

            {/* CTA Group: "JOIN US NOW" Glowing Pill */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/onboard">
                <motion.div
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-cyan-400/50 bg-[#031520] px-8 py-4 text-sm font-bold tracking-widest text-white shadow-[0_0_30px_rgba(0,212,255,0.35)] transition-all hover:border-cyan-300 hover:shadow-[0_0_45px_rgba(0,212,255,0.65)]"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-teal-500/20 to-violet-500/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="relative z-10 uppercase text-cyan-200 group-hover:text-white">
                    JOIN US NOW
                  </span>
                  <svg
                    className="relative z-10 h-4 w-4 text-cyan-300 transition-transform duration-200 group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </motion.div>
              </Link>

              <Link href="/concept-map">
                <button className="rounded-full border border-white/20 bg-white/5 px-6 py-4 text-sm font-medium text-white/80 backdrop-blur-sm transition duration-200 hover:border-white/40 hover:bg-white/10 hover:text-white">
                  Explore 3D Map
                </button>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6 text-xs text-white/60">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span> Instant Diagnostic Path
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span> Grounded in Verified PDFs
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span> Continuous BKT Tracking
              </div>
            </div>
          </motion.div>

          {/* Right 3D Reactive Orb Stage */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative flex h-[460px] w-full items-center justify-center lg:col-span-6 lg:h-[560px]"
          >
            <div className="pointer-events-none absolute -inset-4 rounded-full bg-gradient-to-br from-cyan-500/20 via-transparent to-violet-600/15 blur-3xl" />
            <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-[#09152a]/60 to-[#050b18]/90 shadow-2xl backdrop-blur-xl">
              <ReactiveOrbHero />
              <div className="pointer-events-none absolute top-4 left-4 flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[11px] font-medium text-cyan-300 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00d4ff]" />
                <span>249 Clones • Parallax Responsive</span>
              </div>
              <div className="pointer-events-none absolute right-4 bottom-4 text-[10px] uppercase tracking-widest text-white/40">
                Move pointer to interact
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="relative z-10 border-y border-white/10 bg-black/30 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {STATS.map((stat, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <span className="text-3xl font-black tracking-tight text-white md:text-4xl">
                  <span className="bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-transparent">
                    {stat.value}
                  </span>
                </span>
                <span className="mt-1 text-xs font-medium text-white/60">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="mb-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
            Intelligent Mastery Platform
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Everything You Need To Master Concepts
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/70">
            Powered by modern cognitive science, Bayesian knowledge tracing, and
            real-time generative avatar interactions.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feat, idx) => (
            <Link key={idx} href={feat.href} className="group">
              <GlassCard className="h-full p-6 transition-all duration-300 hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(0,212,255,0.18)]">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-2xl shadow-inner group-hover:scale-110 transition duration-300">
                    {feat.icon}
                  </span>
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-950/40 px-3 py-1 text-[11px] font-semibold text-cyan-300">
                    {feat.badge}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-bold text-white group-hover:text-cyan-300 transition">
                  {feat.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  {feat.desc}
                </p>
                <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
                  <span>Explore Feature</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 border-t border-white/10 bg-black/20 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
              The 3-Step Journey
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              How AI Teacher Accelerates Learning
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Personalized Diagnostic",
                desc: "Set your topic, target depth, and learning style. Our system builds a dependency DAG of core prerequisites.",
              },
              {
                step: "02",
                title: "Interactive Video Lesson",
                desc: "Watch the talking AI avatar break down the concept step-by-step with synchronized visual diagrams and code.",
              },
              {
                step: "03",
                title: "Active Mastery Loop",
                desc: "Solve diagnostic questions and flip flashcards. Bayesian Knowledge Tracing updates your skill confidence in real time.",
              },
            ].map((s, idx) => (
              <div
                key={idx}
                className="relative rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md"
              >
                <span className="text-4xl font-black text-cyan-400/40">
                  {s.step}
                </span>
                <h3 className="mt-4 text-xl font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="relative overflow-hidden rounded-3xl border border-cyan-400/40 bg-gradient-to-r from-[#0d1e38] via-[#091a2f] to-[#160c33] p-10 text-center shadow-[0_0_50px_rgba(0,212,255,0.25)] md:p-16">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />

          <h2 className="relative z-10 text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
            Ready to Start Your Mastery Journey?
          </h2>
          <p className="relative z-10 mx-auto mt-4 max-w-2xl text-base text-white/80 sm:text-lg">
            Experience real-time AI mentoring with full diagnostic tracking and
            interactive 3D concept maps.
          </p>
          <div className="relative z-10 mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/onboard">
              <GlowButton className="px-8 py-4 text-base">
                Start Learning Now →
              </GlowButton>
            </Link>
            <Link href="/upload">
              <button className="rounded-full border border-white/20 bg-white/10 px-8 py-4 font-semibold text-white transition hover:bg-white/20">
                Upload Custom Material
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-[#070517] py-8 text-center text-xs text-white/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <p>© {new Date().getFullYear()} AI Teacher. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/onboard" className="hover:text-cyan-300 transition">
              Onboard
            </Link>
            <Link href="/player" className="hover:text-cyan-300 transition">
              Classroom
            </Link>
            <Link href="/concept-map" className="hover:text-cyan-300 transition">
              Concept Map
            </Link>
            <Link href="/quiz" className="hover:text-cyan-300 transition">
              Quiz
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}


