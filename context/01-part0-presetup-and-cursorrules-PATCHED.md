# Part 0 — Windows pre-setup + Part 1 — .cursorrules (FINAL PATCHED)

## PATCH NOTES
- Windows 11 native — no WSL2.
- ELEVEN Pydantic models, MisconceptionEntry typo fixed, LessonSession.document_id added.
- Frontend: Next.js latest + Three.js (R3F) + Framer Motion for 3D animated UI.
- chromadb>=1.0.0, GEMINI_MODEL env var, TESSERACT_CMD for Windows.

---

## Part 0 — Pre-setup (PowerShell, human only ~45 min)

```
H.1 Python 3.11:  winget install Python.Python.3.11 -e
H.2 Node LTS:     winget install OpenJS.NodeJS.LTS -e
H.3 Git:          winget install Git.Git -e
H.4 Tesseract:    UB Mannheim installer + Hindi pack + PATH
H.5 GPU:          nvidia-smi  (RTX 5050 ~8GB)
H.6 Ollama:       OllamaSetup.exe + ollama pull qwen2.5:7b + ollama ps (GPU)
H.7 venv+TTS:     python -m venv .venv; .\.venv\Scripts\Activate.ps1
                  pip install pyttsx3  (optional: piper-tts)
H.8 Accounts:     Gemini, Sarvam, Tavus, Render, Vercel
H.9 Open folder:  C:\Users\ravij\ai mentor  in Cursor Agent mode
```

---

## Part 1 — Save as `.cursorrules` in repo root

```
PROJECT: AI Teacher — personalized adaptive video lessons with talking avatar,
RAG grounding, BKT mastery, misconception detection, subject-aware visual panel,
multilingual TTS, 3D animated frontend.

PLATFORM: Windows 11 native, PowerShell. python in .venv. No WSL/apt/sudo/python3.11.

STACK (locked):
- Backend: Python 3.11 + FastAPI modular monolith (brain/ + video/ function calls, NOT localhost HTTP)
- Frontend: Next.js latest (App Router) + TypeScript + Tailwind
  + three + @react-three/fiber + @react-three/drei (3D backgrounds, score rings)
  + framer-motion (page/element animations)
  Glassmorphism dark theme — highly attractive demo UI, not plain forms.
  "use client" FIRST LINE on any file using hooks, sessionStorage, AudioContext,
  Daily.co, Three.js, or Framer Motion.
- DB: SQLite SQLAlchemy WAL. Vector: ChromaDB >=1.0.0 local ./chroma_data
- Embeddings: SentenceTransformer("all-MiniLM-L6-v2", device="cpu") — REQUIRED

ENV (.env.example must include):
  GEMINI_API_KEY, GEMINI_MODEL=gemini-2.5-flash-lite, ANTHROPIC_API_KEY (optional)
  TAVUS_*, SARVAM_API_KEY, LOCAL_LLM_MODEL, PIPER_VOICE_PATH
  TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
  MOCK_LLM, MOCK_VIDEO, FORCE_FALLBACK, FRONTEND_URL

LLM call_llm(): Gemini -> Ollama (generate not chat) -> Claude (optional)
  GEMINI model from GEMINI_MODEL env. Claude: filter content blocks type=="text"
  LAST_TIER_USED module var for /api/status. Never raise to caller.

TTS synthesize_speech(): Sarvam REST base64 decode, speaker="shubh" -> Piper -> pyttsx3

Avatar: Tavus broadcast /v2/videos; CVI persona (echo) once -> conversation per lesson

ELEVEN PYDANTIC MODELS: ConceptNode, QuestionBlock (+options), TeachingTurn (+visual_content),
VideoSegment, StudentMasteryState, LearningPath, StudentProfile,
LessonSession (+document_id), MisconceptionEntry, ReportCard, DaySchedule, StudyPlan

TEN SQL TABLES + flashcards. WAL mode on connect.

EXCEPTION HANDLERS: separate HTTPException, RequestValidationError, Exception — not one blanket.

ASYNC SAFETY: Tavus poll routes plain def OR async httpx — never sync 5min block in async def.

CHROMADB smoke test after pip install (see Phase 0 file).

SELF-CHECK: run every phase Verify checklist, report real output.

DO NOT: google.generativeai, ollama.chat(), chromadb<1.0, create-next-app@14,
  is_multi_day_budget(), Sarvam as WebSocket, recreate Tavus persona per lesson,
  skip __init__.py, let embeddings use GPU.
```

---

## Vendor table

| Layer | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| LLM | Gemini (GEMINI_MODEL env) | Ollama qwen2.5:7b | Claude (optional) |
| TTS | Sarvam shubh | Piper | pyttsx3 |
| Avatar broadcast | Tavus /v2/videos | D-ID | cached |
| Avatar reactive | Tavus CVI echo | — | loop clips |
| UI | Three.js particles + Framer Motion | — | CSS 3D transforms |
