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


@app.get("/api/status")
def get_status():
    from app.llm import LAST_TIER_USED

    return {
        "status": "ok",
        "llm_tier": LAST_TIER_USED,
        "mock_llm": os.getenv("MOCK_LLM", "true"),
        "mock_video": os.getenv("MOCK_VIDEO", "true"),
        "force_fallback": os.getenv("FORCE_FALLBACK", "false"),
        "local_model": os.getenv("LOCAL_LLM_MODEL", "qwen2.5:7b"),
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
