# AI Teacher

I built this for the AI Innovation Hackathon 2026 (Bharat Academix). You pick a topic or upload notes, and I turn that into a lesson that talks back: a teacher avatar, speech, questions that adapt as you go, and a report at the end.

I wanted it to feel like sitting with someone who actually knows your notes, not a generic chatbot. If you upload a document, the explanations stay inside that material. If something is not in the upload, the teacher says so instead of making it up.

## What I put together

One FastAPI process on the backend. The `brain/` and `video/` packages call each other as functions — the browser is the only HTTP client.

```
app/
  main.py          FastAPI, /health, /api/status
  llm.py           Gemini → Ollama → Claude
  brain/           BKT, RAG, planner, assessment, routes
  video/           Tavus broadcast + CVI, Sarvam/Piper/pyttsx3 TTS
frontend/          Next.js App Router + Three.js (R3F) + Framer Motion
```

The path I walk a student through is `/onboard` → `/upload` → `/lesson-plan` → `/player` → `/report`, then `/flashcards` or `/concept-map` if they want to review. The quiz is inside `/player` when the stage is `question`.

Under the hood I track mastery with BKT, check claims against retrieved chunks, and speak with Sarvam (`speaker=shubh`). I did not change that voice.

## What you need (Windows 11, no WSL)

- Python 3.11 (`winget install Python.Python.3.11`)
- Node.js LTS (`winget install OpenJS.NodeJS.LTS`)
- Git
- Tesseract OCR with Hindi (UB Mannheim installer). Set `TESSERACT_CMD` if it is not on PATH.
- Ollama native installer + `ollama pull qwen2.5:7b`
- Optional: Gemini, Tavus, Sarvam API keys
- First `pip install` pulls PyTorch via `sentence-transformers` (large download; embeddings still run on CPU only)

## How I run it locally

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

Two terminals:

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

```powershell
cd frontend
npm run dev
```

## Credentials

Copy `.env.example` to `.env`. Gemini, Sarvam, and Tavus keys go there. Live replica video also needs `TAVUS_AVATAR_ID` (and optionally `TAVUS_PERSONA_ID` after the first CVI persona create). Anthropic is optional — if that key is missing I skip that LLM tier. Leave `MOCK_LLM=true` / `MOCK_VIDEO=true` until you want live Gemini/Tavus/Sarvam.

## Mock flags

I default these on so a dry run does not spend API minutes.

| Flag | Default | Effect |
|---|---|---|
| `MOCK_LLM=true` | on | `call_llm` returns `MOCK:...` |
| `MOCK_VIDEO=true` | on | avatar/TTS return canned data |
| `FORCE_FALLBACK=true` | off | skip cloud, local TTS + loop clips |

## How a lesson is built

1. Diagnostic questions, then an initial `p_know`
2. Concept DAG, cycle check, fallback list if the graph is messy
3. Teaching turns (Understand → Adapt), grounded in the upload when there is one
4. Visuals (SVG / LaTeX / code) when they help
5. Grading (MCQ exact match, free-text rubric)
6. Misconception check (cosine ≥ 0.70)
7. Hallucination check against retrieved chunks
8. Report card from BKT `p_know`

## Services I wired in

- LLM: Gemini (`GEMINI_MODEL`, default `gemini-3.5-flash-lite`), Ollama local, optional Claude
- Embeddings: sentence-transformers all-MiniLM-L6-v2, CPU only
- Vector DB: ChromaDB on disk
- Avatar: Tavus `/v2/videos` + CVI echo persona → conversation
- TTS: Sarvam (`speaker=shubh`) → Piper → pyttsx3
- OCR: pytesseract + Tesseract (`eng`/`hin`)

## Deployment

**Render (backend):** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Copy every `.env.example` key into the dashboard. Set `MOCK_LLM=false`, `MOCK_VIDEO=false` for a live demo. Free tier has no persistent disk — SQLite and Chroma wipe on restart.

**Vercel (frontend):** `cd frontend; vercel --prod`. Set `NEXT_PUBLIC_API_URL` to the Render URL, then set Render `FRONTEND_URL` to the Vercel URL and redeploy so CORS works both ways.

**Before a demo:**

1. `Invoke-RestMethod https://your-app.onrender.com/health` (wake a cold start)
2. Wait about 60 seconds
3. `python scripts/warm_up_demo.py --url https://your-app.onrender.com`

## Things I know are still limited

- The misconception bank is deep for electricity / Ohm's Law; other topics get live LLM entries.
- PARTIALLY_CORRECT answers count as incorrect for BKT (binary observation).
- `gemini-2.5-flash-lite` is unavailable to new Gemini keys; this repo defaults to `gemini-3.5-flash-lite` via `GEMINI_MODEL`.
- Render free disk is ephemeral.
- No authentication; `student_id` is a session UUID.
- Deployed OCR may need a Tesseract buildpack; local Windows uses `TESSERACT_CMD`.
