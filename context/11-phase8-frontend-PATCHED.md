# Phase 8 — Frontend: 8 screens + 3D animated UI (PATCHED — Windows Native)

## PATCH NOTES
- Next.js latest (`create-next-app@latest --yes`), not 14.
- **3D + animation stack (required):** `three`, `@react-three/fiber`, `@react-three/drei`, `framer-motion`.
- Design goal: **highly attractive, attention-grabbing, premium hackathon demo UI** — not plain Tailwind forms.
- All R3F/Framer/hook files: `"use client"` as line 1.

---

## Visual design system (implement in Phase 8)

```
DESIGN TOKENS:
  Background: deep gradient #0f0c29 -> #302b63 -> #24243e (or similar dark purple-blue)
  Accent: electric cyan #00d4ff, soft violet #a78bfa, success #34d399, warning #fbbf24
  Glass cards: bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl
  Typography: clean sans (Geist or Inter), large headings, high contrast on dark bg

3D LAYER (React Three Fiber — shared across app):
  Create frontend/src/components/three/AppSceneBackground.tsx
    "use client"
    Full-viewport fixed Canvas behind all pages (z-index -1, pointer-events-none)
    Contents: FloatingParticles (1000+ points, slow drift), subtle AmbientLight +
    PointLight, optional slow-rotating TorusKnot or IcosahedronWireframe as hero mesh
    Use @react-three/drei: Stars, Float, MeshDistortMaterial for organic motion
    Performance: dpr={[1, 1.5]}, frameloop="always" only on onboard/player; "demand" elsewhere

ANIMATION LAYER (Framer Motion — every screen):
  Page transitions: motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
  Stagger children on lists (lesson concepts, flashcards, report chips)
  Buttons: whileHover={{scale:1.03}} whileTap={{scale:0.98}}
  Mastery bars: animate width + box-shadow glow on change
  Stage badge: pulse ring when stage === "demonstrate"

SHARED UI COMPONENTS (create these first):
  frontend/src/components/ui/GlassCard.tsx — glassmorphism container
  frontend/src/components/ui/GlowButton.tsx — gradient CTA with hover glow
  frontend/src/components/ui/AnimatedProgressBar.tsx — mastery bar with color tiers
  frontend/src/components/three/FloatingIcon3D.tsx — reusable 3D icon (book, atom, chart)
  frontend/src/contexts/AppContext.tsx — learner profile, student_id, lesson_id, document_id
  frontend/src/lib/studentId.ts, mockApi.ts, api.ts
```

---

## Paste this into Cursor:

```
FRONTEND SETUP:
  frontend/.env.local: NEXT_PUBLIC_API_URL=http://localhost:8000
  If rescaffolding: npx create-next-app@latest frontend --typescript --tailwind --app --no-git --yes
  cd frontend; npm install katex react-katex prism-react-renderer @uiw/react-md-editor @daily-co/daily-js three @react-three/fiber @react-three/drei framer-motion

  Wrap root layout (frontend/src/app/layout.tsx) with:
    - AppContext provider
    - AppSceneBackground (3D particle field — visible on all pages)
    - Dark gradient class on body: min-h-screen text-white

  Redirect src/app/page.tsx -> /onboard

BUILD MOCK API FIRST (mockApi.ts), then swap endpoints one screen at a time.

--- SCREEN 1: /onboard ---
"use client" + Framer Motion stagger form
  3D accent: left column FloatingIcon3D (book/brain mesh, Float wrapper from drei)
  Right column: GlassCard with 8 fields (name, level, objective, knowledge, style,
  language, teaching_via radio, time presets + custom)
  GlowButton "Continue" -> /upload
  Each field animates in with 0.05s stagger delay

--- SCREEN 2: /upload ---
"use client"
  GlassCard with profile summary chip row (animated chips)
  Upload: drag-drop zone with dashed border + 3D document icon (Float animation)
  Topic mode: text inputs with focus glow ring
  On file: POST /api/brain/ingest -> document_id
  On submit: POST /api/brain/diagnostic/{student_id}/{topic} -> lesson_id -> /lesson-plan

--- SCREEN 3: /lesson-plan ---
"use client"
  StudyPlan or LessonPlan in GlassCard
  Concept list: each concept as animated row with prerequisite tags
  Multi-day: day cards in horizontal scroll with "Today" highlighted (cyan border glow)
  3D accent: mini concept graph — spheres + lines (Canvas 200px height above list)
  GlowButton "Start Lesson":
    a) POST /api/video/open-reactive-session {lesson_id}
    b) Silent AudioContext gesture (gain=0) ON THIS CLICK before navigate
    c) navigate /player

--- SCREEN 4: /player (MOST IMPORTANT — judges evaluate this) ---
"use client"
  LAYOUT: two-panel side-by-side in GlassCard frame with subtle 3D perspective
    transform: perspective(1200px) on container (CSS, not R3F — keeps video performant)

  LEFT 60% — Avatar:
    prerendered: <video autoPlay className="rounded-xl shadow-2xl">
    reactive: Daily.co via @daily-co/daily-js (NOT iframe)
    fallback: poster image + <audio> + badge "Adaptive Mode" (animated pulse)

  RIGHT 40% — Visual Panel (ALWAYS visible):
    visual_type none/empty: large subtitle_text with typewriter-style fade-in
    equation: react-katex BlockMath in GlassCard, try/catch fallback to monospace
    code: prism-react-renderer + language badge
    diagram/graph/timeline/concept_map: dangerouslySetInnerHTML SVG in framed white panel

  TOP: AnimatedProgressBar per concept (poll GET /api/brain/mastery/{student_id} every 8s)
    Green >=70%, yellow 50-70%, red <50% — animate width + glow on change
    Cleanup interval on unmount (critical)

  STAGE BADGE: pill with icon, pulse animation on "Demonstrate"

  OFFLINE BADGE: poll GET /api/status same 8s interval
    "Cloud AI" vs "Local AI (RTX 5050)" with animated dot

  BOTTOM STRIP: subtitle_text always visible

  Optional 3D: thin R3F border frame around avatar panel only (low poly, static)

--- SCREEN 5: Quiz (embedded in /player when stage==question) ---
"use client"
  GlassCard slides up with framer-motion spring
  mcq: radio with animated selection ring
  text types: textarea with character count for explain_in_own_words
  Submit -> POST /api/brain/answer -> show feedback with success/error animation
    then fetch next teaching turn

--- SCREEN 6: /report ---
"use client"
  3D ScoreRing: frontend/src/components/three/ScoreRing3D.tsx
    R3F torus or ring mesh, rotation driven by score_percent, color by tier
  strong_areas green chips, weak_areas red chips (stagger animate in)
  recommendation in GlassCard
  Buttons: Flashcards, Revision (POST /revision-session -> /player), Next Topic

--- SCREEN 7: /flashcards ---
"use client"
  3D flip: CSS preserve-3d + framer-motion rotateY spring on click
  Card floats slightly (whileHover y:-8)
  Prev/Next/I know this/Review again

--- SCREEN 8: /concept-map ---
"use client"
  Fetch GET /api/brain/concept-map/{topic}/{level}
  SVG in GlassCard with drop-shadow
  Empty svg: friendly message, not blank page
  Download PNG: optional (cut if time) — canvas serialize approach

Verify:
- [ ] Select-String -Path frontend\src -Pattern '"use client"' — hook/3D files line 1
- [ ] Full mock walkthrough before real API
- [ ] Ctrl+Shift+R reload: avatar audio plays after Start Lesson click
- [ ] 3D background renders without freezing UI (check FPS on onboard + player)
- [ ] Mastery bars animate on /answer from second tab
- [ ] Interval cleared leaving /player
- [ ] KaTeX + broken LaTeX fallback
- [ ] visual panel never blank — subtitle fallback
- [ ] FORCE_FALLBACK=true -> offline badge + fallback tier looks intentional
- [ ] npm run build succeeds (R3F requires dynamic import or ssr:false if needed —
      use dynamic(() => import('./AppSceneBackground'), {ssr:false}) in layout if build fails)
```
