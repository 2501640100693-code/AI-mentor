# FINAL BUILD PROMPTS — AI Teacher (Windows Native + 3D UI)

**Use these patched files in order.** Location: `context/` in your repo.

| Order | File | What it builds |
|---|---|---|
| 0 | [WINDOWS_NATIVE_SETUP_PATCH.md](WINDOWS_NATIVE_SETUP_PATCH.md) | Human setup (PowerShell) |
| 1 | [01-part0-presetup-and-cursorrules-PATCHED.md](01-part0-presetup-and-cursorrules-PATCHED.md) | Save `.cursorrules` |
| 2 | [02-phase0-scaffold-PATCHED.md](02-phase0-scaffold-PATCHED.md) | Repo scaffold + venv + 3D deps |
| 3 | [03-phase1-bkt.md](03-phase1-bkt.md) | BKT math |
| 4 | [04-phase2-llm-PATCHED.md](04-phase2-llm-PATCHED.md) | LLM + planner + parse_time_budget |
| 5 | [05-phase2point5-visual-generation.md](05-phase2point5-visual-generation.md) | Visual panel backend |
| 6 | [06-phase3-rag-PATCHED.md](06-phase3-rag-PATCHED.md) | RAG + ingest route |
| 7 | [07-phase4-misconceptions.md](07-phase4-misconceptions.md) | Misconceptions |
| 8 | [08-phase5-broadcast-avatar-PATCHED.md](08-phase5-broadcast-avatar-PATCHED.md) | Broadcast video |
| 9 | [09-phase6-reactive-avatar-PATCHED.md](09-phase6-reactive-avatar-PATCHED.md) | Reactive avatar + TTS |
| 10 | [10-phase7-assessment-PATCHED.md](10-phase7-assessment-PATCHED.md) | All API routes |
| 11 | [11-phase8-frontend-PATCHED.md](11-phase8-frontend-PATCHED.md) | **8 screens + 3D animated UI** |
| 12 | [12-phase9-integration-PATCHED.md](12-phase9-integration-PATCHED.md) | Integration tests |
| 13 | [13-phase10-docs-PATCHED.md](13-phase10-docs-PATCHED.md) | README + warm_up_demo |
| 14 | [14-phase11-deploy-PATCHED.md](14-phase11-deploy-PATCHED.md) | Deploy |

## What was fixed vs original guides

- All WSL/bash → Windows PowerShell + venv
- chromadb>=1.0.0, Next.js latest, Sarvam speaker=shubh
- Missing routes: /api/status, POST /ingest, POST /open-reactive-session
- parse_time_budget in Phase 2; 11 complete schemas in Phase 0
- TESSERACT_CMD for Windows pytesseract
- **Phase 8: Three.js particle background, Framer Motion, glassmorphism, 3D score ring, animated mastery bars**

## 3D UI summary (Phase 8)

- **Global:** R3F particle field + dark gradient (`AppSceneBackground.tsx`)
- **Onboard:** 3D floating icon + staggered form animation
- **Player:** Glass panels, animated mastery glow, stage pulse, perspective layout
- **Report:** 3D rotating score ring (`ScoreRing3D.tsx`)
- **Flashcards:** 3D flip with spring physics
- **Deps:** `three`, `@react-three/fiber`, `@react-three/drei`, `framer-motion`

Paste each file's "Paste this into Cursor" block one at a time. Run Verify checklist before next phase.
