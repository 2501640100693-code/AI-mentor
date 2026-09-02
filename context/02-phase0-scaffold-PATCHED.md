# Phase 0 — Repo scaffold + credential intake (PATCHED — Windows Native)

## PATCH NOTES
- Ten tables (flashcards added), not nine.
- Windows native: venv, `python` not `python3.11`, PowerShell verify commands.
- chromadb>=1.0.0, numpy>=1.26.0, create-next-app@latest.
- ELEVEN Pydantic models complete in Phase 0 (including DaySchedule, document_id).
- GET /api/status + app/llm.py stub in Phase 0.
- Frontend deps include 3D/animation stack (Phase 8): three, @react-three/fiber, @react-three/drei, framer-motion.

---

## Paste this into Cursor:

```
Scaffold the ai-teacher repo exactly per the REPO STRUCTURE in .cursorrules.
Platform: Windows 11, PowerShell. Use python inside .venv — never --break-system-packages.

CREATE THESE FILES IN THIS EXACT ORDER — do not skip any:

STEP A — Python venv (do this first):
  python -m venv .venv
  .\.venv\Scripts\Activate.ps1

STEP B — Package init files:
  Create app/__init__.py (empty)
  Create app/brain/__init__.py (empty)
  Create app/brain/rag/__init__.py (empty)
  Create app/video/__init__.py (empty)

STEP C — .gitignore (create BEFORE .env):
  .env
  __pycache__/
  *.pyc
  *.pyo
  app.db
  chroma_data/
  *.onnx
  *.onnx.json
  node_modules/
  .next/
  frontend/.env.local
  *.log
  .venv/

STEP D — .env.example:
  GEMINI_API_KEY=
  GEMINI_MODEL=gemini-2.5-flash-lite
  ANTHROPIC_API_KEY=
  TAVUS_API_KEY=
  TAVUS_AVATAR_ID=
  TAVUS_VOICE_ID=
  TAVUS_PERSONA_ID=
  SARVAM_API_KEY=
  DID_API_KEY=
  LOCAL_LLM_MODEL=qwen2.5:7b
  PIPER_VOICE_PATH=en_US-lessac-medium.onnx
  TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
  MOCK_VIDEO=true
  MOCK_LLM=true
  FORCE_FALLBACK=false
  FRONTEND_URL=http://localhost:3000

STEP E — requirements.txt:
  fastapi==0.115.0
  uvicorn[standard]==0.32.0
  sqlalchemy==2.0.35
  pydantic==2.9.2
  chromadb>=1.0.0
  sentence-transformers==3.2.1
  pytesseract==0.3.13
  pymupdf==1.24.11
  python-dotenv==1.0.1
  google-genai>=1.5.0,<2.0.0
  anthropic>=0.45.0
  ollama==0.3.3
  pyttsx3==2.90
  tenacity==9.0.0
  httpx==0.27.2
  python-docx==1.1.2
  python-pptx==1.0.2
  numpy>=1.26.0
  pillow>=10.0.0
  sarvamai

  Run: pip install -r requirements.txt --dry-run (fix pins if conflict)
  Then: pip install -r requirements.txt

  ChromaDB smoke test (run before Phase 3):
  python -c "
  import chromadb
  c = chromadb.PersistentClient(path='./chroma_data_test')
  col = c.get_or_create_collection(name='smoketest')
  col.add(ids=['1'], embeddings=[[0.1,0.2]], documents=['a'], metadatas=[{'k':'x'}])
  print(col.query(query_embeddings=[[0.1,0.2]], n_results=1))
  import shutil; shutil.rmtree('./chroma_data_test')
  print('ChromaDB OK')
  "

STEP F — app/schemas.py — ELEVEN Pydantic models (complete, all fields):
  ConceptNode, QuestionBlock (options Optional), TeachingTurn (visual_content Optional),
  VideoSegment, StudentMasteryState, LearningPath, StudentProfile,
  LessonSession (document_id: Optional[str] = None),
  MisconceptionEntry, ReportCard, DaySchedule, StudyPlan (daily_schedule: list[DaySchedule])

STEP G — app/db.py:
  sqlite:///./app.db, WAL mode, TEN tables including flashcards.
  lesson_sessions must include document_id column.

STEP H — app/llm.py stub:
  LAST_TIER_USED: str = "none"
  def call_llm(...): return f"MOCK: {prompt[:50]}" if MOCK else raise NotImplemented

STEP I — app/main.py:
  load_dotenv(), CORS, mount /api/brain and /api/video,
  GET /health, GET /api/status (reads LAST_TIER_USED from app.llm),
  three separate exception handlers (HTTPException, RequestValidationError, Exception).

STEP J — app/brain/routes.py: GET /ping -> {"ok": true, "service": "brain"}
STEP K — app/video/routes.py: GET /ping -> {"ok": true, "service": "video"}

STEP L — frontend/:
  npx create-next-app@latest frontend --typescript --tailwind --app --no-git --yes
  cd frontend; npm install katex react-katex prism-react-renderer @uiw/react-md-editor @daily-co/daily-js three @react-three/fiber @react-three/drei framer-motion
  Create page stubs: onboard/, upload/, lesson-plan/, player/, quiz/, report/, flashcards/, concept-map/
  (NO dashboard/ — not in spec)
  frontend/.env.local: NEXT_PUBLIC_API_URL=http://localhost:8000
  Redirect / -> /onboard in src/app/page.tsx

STEP M — README.md: Windows setup, venv activate, uvicorn + npm run dev

After files created: ask which API keys I have. Write given keys to .env only.

Verify (PowerShell, venv active):
- [ ] pip install -r requirements.txt --dry-run — no conflicts
- [ ] ChromaDB smoke test prints OK
- [ ] uvicorn app.main:app --reload starts
- [ ] Invoke-RestMethod http://localhost:8000/health
- [ ] Invoke-RestMethod http://localhost:8000/api/status
- [ ] cd frontend; npm run dev starts
- [ ] python -c "from app.schemas import LessonPlan, TeachingTurn, VideoSegment, StudentMasteryState, LearningPath, StudentProfile, LessonSession, MisconceptionEntry, ReportCard, StudyPlan, DaySchedule, QuestionBlock, ConceptNode"
- [ ] python -c "import sqlite3; print(sqlite3.connect('app.db').execute(\"SELECT name FROM sqlite_master WHERE type='table'\").fetchall())" — 10 tables
- [ ] Select-String -Path .gitignore -Pattern '\.env'
```
