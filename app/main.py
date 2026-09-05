import os
import threading
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

load_dotenv()


def _print_mode_banner() -> None:
    mock_llm = os.getenv("MOCK_LLM", "true")
    mock_video = os.getenv("MOCK_VIDEO", "true")
    replica = "SET" if os.getenv("TAVUS_AVATAR_ID", "").strip() else "EMPTY"
    print("=" * 60)
    if str(mock_video).lower() == "true":
        print("  MOCK MODE - no Tavus / Sarvam spend")
    else:
        print("  LIVE TAVUS MODE - real minutes will be spent")
    print(f"  MOCK_LLM={mock_llm}  MOCK_VIDEO={mock_video}  replica={replica}")
    print("=" * 60)


_print_mode_banner()

Path("static_files").mkdir(exist_ok=True)

app = FastAPI(title="AI Teacher")

# Allow the deployed Vercel origin (FRONTEND_URL) plus local dev so the
# CORS loop works in both directions after deploy without breaking localhost.
_frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
_allowed_origins = list(
    dict.fromkeys(
        [
            _frontend_url,
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    )
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.db import engine  # noqa: E402, F401  — creates 10 tables + WAL
from app.brain.routes import router as brain_router  # noqa: E402
from app.video.routes import router as video_router  # noqa: E402

app.include_router(brain_router, prefix="/api/brain")
app.include_router(video_router, prefix="/api/video")
app.mount("/static", StaticFiles(directory="static_files"), name="static")


def _warmup_embedder() -> None:
    try:
        from app.brain.rag.ingest import get_embedder

        get_embedder()
        print("[startup] embedder warmup complete")
    except Exception as e:
        print(f"[startup] embedder warmup skipped: {e}")


threading.Thread(target=_warmup_embedder, daemon=True, name="embedder-warmup").start()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "mock_llm": os.getenv("MOCK_LLM"),
        "mock_video": os.getenv("MOCK_VIDEO"),
        "force_fallback": os.getenv("FORCE_FALLBACK"),
    }


def _fallback_reason() -> str | None:
    from app.llm import LAST_TIER_USED

    if os.getenv("FORCE_FALLBACK", "false").lower() == "true":
        return "force_fallback"
    if os.getenv("MOCK_LLM", "true").lower() == "true":
        return "mock_llm"
    if os.getenv("MOCK_VIDEO", "true").lower() == "true":
        return "mock_video"
    if not os.getenv("GEMINI_API_KEY", "").strip() and LAST_TIER_USED != "gemini":
        return "missing_key"
    if LAST_TIER_USED in ("local", "ollama", "claude", "none"):
        return "tier_failed"
    return None


@app.get("/api/status")
def get_status():
    from app.llm import API_KEY_VALID, LAST_TIER_USED, QUOTA_EXHAUSTED

    return {
        "status": "ok",
        "llm_tier": LAST_TIER_USED,
        "mock_llm": os.getenv("MOCK_LLM", "true"),
        "mock_video": os.getenv("MOCK_VIDEO", "true"),
        "force_fallback": os.getenv("FORCE_FALLBACK", "false"),
        "local_model": os.getenv("LOCAL_LLM_MODEL", "qwen2.5:7b"),
        "api_key_present": bool(os.getenv("GEMINI_API_KEY", "").strip()),
        "tavus_key_present": bool(os.getenv("TAVUS_API_KEY", "").strip()),
        "sarvam_key_present": bool(os.getenv("SARVAM_API_KEY", "").strip()),
        "api_key_valid": API_KEY_VALID,
        "quota_exhausted": QUOTA_EXHAUSTED,
        "fallback_reason": _fallback_reason(),
    }


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(status_code=422, content={"error": exc.errors()})


@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "type": type(exc).__name__},
    )
