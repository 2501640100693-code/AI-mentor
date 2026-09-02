# Phase 10 — Docs, /api/status, warm_up_demo, demo script (PATCHED — Windows)

## Paste this into Cursor:

```
STEP A — GitHub (if not done): git init, push to github.com/your-user/ai-teacher

STEP B — Confirm GET /api/status in main.py (Phase 0) reads LAST_TIER_USED

STEP C — scripts/warm_up_demo.py:
  Args: --url http://localhost:8000 (or Render URL)
  1. POST /api/brain/ingest with demo PDF
  2. POST diagnostic + render broadcast segments for demo lesson
  3. Print summary: document_id, N segments cached

STEP D — README.md (Windows setup, not WSL2):
  Prerequisites: Python winget, Node winget, Tesseract UB Mannheim, Ollama native, venv
  Frontend: Next.js + Three.js (R3F) + Framer Motion animated UI
  All sections from original guide (architecture, RAG, BKT, APIs, deploy, limitations)
  Known limitation: gemini-2.5-flash-lite shutdown Oct 2026 — use GEMINI_MODEL env

STEP E — Demo script 3-7 min with timer (onboard -> upload -> player 3D UI ->
  wrong short answer -> adaptation -> report -> optional FORCE_FALLBACK badge demo)

Verify:
- [ ] README renders on GitHub
- [ ] Invoke-RestMethod http://localhost:8000/api/status after one call_llm
- [ ] python scripts/warm_up_demo.py --url http://localhost:8000
- [ ] Two timed rehearsals, one recorded with audible audio
```
