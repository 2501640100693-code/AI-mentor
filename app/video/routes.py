from fastapi import APIRouter
from pydantic import BaseModel

from app.video.avatar_client import open_reactive_session, render_broadcast
from app.video.fallback import fallback_response

router = APIRouter()


class OpenSessionBody(BaseModel):
    lesson_id: str


class BroadcastBody(BaseModel):
    script_text: str
    language: str = "English"
    concept_id: str = "intro"
    level: str = "beginner"


class FallbackBody(BaseModel):
    text: str
    language: str = "en"


@router.get("/ping")
def ping():
    return {"ok": True, "service": "video"}


@router.post("/open-reactive-session")
def open_session(body: OpenSessionBody):
    return open_reactive_session(body.lesson_id)


@router.post("/render-broadcast")
def render_broadcast_route(body: BroadcastBody):
    # Plain def (not async def): Tavus poll can take minutes; sync handlers
    # run in the threadpool so /health stays responsive.
    return render_broadcast(
        body.script_text, body.language, body.concept_id, body.level
    )


@router.post("/fallback")
def fallback(body: FallbackBody):
    return fallback_response(body.text, body.language)
