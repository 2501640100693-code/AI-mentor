# AI Teacher

Turns an uploaded document or a topic into a personalized, adaptive, video-delivered lesson with a talking AI avatar, RAG grounding, misconception detection, BKT mastery tracking, multilingual TTS, and a subject-aware visual panel.

## Architecture

Modular monolith: one FastAPI process. `brain/` and `video/` are packages that communicate via **function calls**, not HTTP. The only HTTP boundary is browser ↔ backend.

```
app/
  main.py          FastAPI, /health, /api/status
  llm.py           Gemini → Ollama → Claude
  brain/           BKT, RAG, planner, assessment, routes
  video/           Tavus broadcast + CVI, Sarvam/Piper/pyttsx3 TTS
frontend/          Next.js App Router + Three.js (R3F) + Framer Motion
```

Screens: `/onboard` → `/upload` → `/lesson-plan` → `/player` → `/report` → `/flashcards` / `/concept-map`. The quiz lives inside `/player` when the teaching stage is `question`.

## Prerequisites (Windows 11 native)

- Python 3.11 (`winget install Python.Python.3.11`)
- Node.js LTS (`winget install OpenJS.NodeJS.LTS`)
- Git
- Tesseract OCR with Hindi (UB Mannheim installer). Set `TESSERACT_CMD` if not on PATH.
- Ollama native installer + `ollama pull qwen2.5:7b`
- Optional: Gemini, Tavus, Sarvam API keys
- First `pip install` pulls PyTorch via `sentence-transformers` (large download; embeddings still run **CPU-only**)

## Local setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# fill keys you have; leave others blank

cd frontend
npm install
copy .env.local.example .env.local   # or create NEXT_PUBLIC_API_URL=http://localhost:8000
```

Run two terminals:

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

```powershell
cd frontend
npm run dev
```

## Credentials

Copy `.env.example` to `.env`. Gemini, Sarvam, and Tavus API keys go there. Live talking-replica video also needs `TAVUS_AVATAR_ID` (and optionally `TAVUS_PERSONA_ID` after the first CVI persona create). Anthropic is optional — omitted keys skip that LLM tier. Leave `MOCK_LLM=true` / `MOCK_VIDEO=true` until you want live Gemini/Tavus/Sarvam.

## Mock flags

| Flag | Default | Effect |
|---|---|---|
| `MOCK_LLM=true` | on | `call_llm` returns `MOCK:...` |
| `MOCK_VIDEO=true` | on | avatar/TTS return canned data |
| `FORCE_FALLBACK=true` | off | skip cloud, local TTS + loop clips |

## Prompt & agent chain

1. Diagnostic questions → initial `p_know`
2. Concept DAG + cycle check + fallback list
3. Teaching turns (Understand → Adapt), RAG-grounded vs topic-only
4. Visual generation (SVG / LaTeX / code)
5. Answer grading (MCQ exact match, free-text LLM rubric)
6. Misconception diagnosis (cosine ≥ 0.70)
7. Hallucination check against retrieved chunks
8. Report card from BKT `p_know`

## Third-party services

- LLM: Gemini (`GEMINI_MODEL`, default `gemini-3.5-flash-lite`), Ollama local, optional Claude
- Embeddings: sentence-transformers all-MiniLM-L6-v2 **CPU only**
- Vector DB: ChromaDB local
- Avatar: Tavus `/v2/videos` + CVI echo persona → conversation
- TTS: Sarvam (`speaker=shubh`) → Piper → pyttsx3
- OCR: pytesseract + Tesseract (`eng`/`hin`)

## Deployment

**Render (backend):** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Copy every `.env.example` key into the dashboard. Set `MOCK_LLM=false`, `MOCK_VIDEO=false`. Free tier has **no persistent disk** — SQLite and Chroma wipe on restart.

**Vercel (frontend):** `cd frontend; vercel --prod`. Set `NEXT_PUBLIC_API_URL` to the Render URL, then set Render `FRONTEND_URL` to the Vercel URL and redeploy (CORS both directions).

**Pre-demo:**

1. `Invoke-RestMethod https://your-app.onrender.com/health` (wake cold start)
2. Wait ~60s
3. `python scripts/warm_up_demo.py --url https://your-app.onrender.com`

## Known limitations

- Misconception bank is deep for electricity / Ohm's Law; other topics use live LLM-generated entries.
- PARTIALLY_CORRECT answers count as incorrect for BKT (binary observation).
- `gemini-2.5-flash-lite` is unavailable to new Gemini keys; this repo defaults to `gemini-3.5-flash-lite` via `GEMINI_MODEL`.
- Render free disk is ephemeral.
- No authentication; `student_id` is a session UUID.
- Deployed OCR may need a Tesseract buildpack; local Windows uses `TESSERACT_CMD`.
