"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { GlowButton } from "@/components/ui/GlowButton";
import { PageShell } from "@/components/ui/PageShell";
import { useApp } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import type { Flashcard } from "@/lib/types";

export default function FlashcardsPage() {
  const { studentId, lessonId } = useApp();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    api.flashcards(studentId, lessonId).then(setCards);
  }, [studentId, lessonId]);

  const card = cards[index];

  return (
    <PageShell title="Flashcards" subtitle="Tap to flip. Physics-spring 3D, not a flat quiz card.">
      <div className="mx-auto w-full max-w-xl">
        <AnimatePresence mode="wait">
          {card ? (
            <motion.button
              key={card.flashcard_id}
              type="button"
              onClick={() => setFlipped((v) => !v)}
              whileHover={{ y: -8 }}
              className="relative h-72 w-full"
              style={{ perspective: 1200 }}
            >
              <motion.div
                className="flip-card relative h-full w-full"
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 120, damping: 14 }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="flip-face absolute inset-0 flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 p-8 text-2xl font-semibold backdrop-blur-xl">
                  {card.front}
                </div>
                <div
                  className="flip-face absolute inset-0 flex items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-8 text-xl backdrop-blur-xl"
                  style={{ transform: "rotateY(180deg)" }}
                >
                  {card.back}
                </div>
              </motion.div>
            </motion.button>
          ) : (
            <p className="text-white/60">Loading cards…</p>
          )}
        </AnimatePresence>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <GlowButton type="button" onClick={() => { setIndex((i) => Math.max(0, i - 1)); setFlipped(false); }}>
            Prev
          </GlowButton>
          <GlowButton type="button" onClick={() => { setIndex((i) => Math.min(cards.length - 1, i + 1)); setFlipped(false); }}>
            Next
          </GlowButton>
          <GlowButton type="button" onClick={() => setIndex((i) => Math.min(cards.length - 1, i + 1))}>
            I know this
          </GlowButton>
          <GlowButton type="button" onClick={() => setFlipped(true)}>
            Review again
          </GlowButton>
        </div>
        <p className="mt-4 text-center text-xs uppercase tracking-widest text-white/50">
          {cards.length ? `${index + 1} / ${cards.length}` : "no cards yet"}
        </p>
      </div>
    </PageShell>
  );
}
