import os
from datetime import datetime, timezone

import httpx
from tenacity import retry, stop_after_attempt, wait_fixed

from app.db import VideoCache, get_db
from app.schemas import VideoSegment
from app.video.fallback import fallback_response


def render_broadcast(
    script_text: str, language: str, concept_id: str, level: str
) -> VideoSegment:
    if os.getenv("MOCK_VIDEO", "true").lower() == "true":
        return VideoSegment(
            turn_id="mock",
            video_url="/static/avatar_talking.mp4",
            duration_seconds=10,
            subtitle_text=script_text[:100],
            cache_key=f"{concept_id}:main:{language}:{level}",
            render_tier="prerendered",
        )

    cache_key = f"{concept_id}:main:{language}:{level}"
    with get_db() as db:
        cached = db.query(VideoCache).filter_by(cache_key=cache_key).first()
        if cached:
            return VideoSegment(
                turn_id=cached.cache_key,
                video_url=cached.video_url,
                audio_url=cached.audio_url,
                subtitle_text=cached.subtitle_text or script_text[:200],
                cache_key=cached.cache_key,
                render_tier="prerendered",
            )

    api_key = os.getenv("TAVUS_API_KEY", "")
    avatar_id = os.getenv("TAVUS_AVATAR_ID", "")
    if not api_key or not avatar_id:
        return fallback_response(script_text, language)

    try:
        response = httpx.post(
            "https://tavusapi.com/v2/videos",
            headers={"x-api-key": api_key, "Content-Type": "application/json"},
            json={
                "replica_id": avatar_id,
                "script": script_text,
                "video_name": cache_key,
            },
            timeout=30.0,
        )
        response.raise_for_status()
        video_id = response.json().get("video_id")
        if not video_id:
            raise RuntimeError("no video_id")

        @retry(stop=stop_after_attempt(30), wait=wait_fixed(10), reraise=True)
        def poll_for_ready():
            r = httpx.get(
                f"https://tavusapi.com/v2/videos/{video_id}",
                headers={"x-api-key": api_key},
                timeout=15.0,
            )
            r.raise_for_status()
            data = r.json()
            status = data.get("status") or data.get("state") or data.get("video_status")
            if status not in ("ready", "completed"):
                raise RuntimeError(f"Not ready yet: {status}")
            return data

        data = poll_for_ready()
        video_url = (
            data.get("download_url")
            or data.get("stream_url")
            or data.get("hosted_url")
            or data.get("video_url")
        )
        with get_db() as db:
            db.add(
                VideoCache(
                    cache_key=cache_key,
                    video_url=video_url,
                    subtitle_text=script_text[:200],
                    render_tier="prerendered",
                    created_at=datetime.now(timezone.utc),
                )
            )
        return VideoSegment(
            turn_id=cache_key,
            video_url=video_url,
            subtitle_text=script_text[:200],
            cache_key=cache_key,
            render_tier="prerendered",
        )
    except Exception as e:
        print(f"[Broadcast] Render failed or timed out: {e}")
        return fallback_response(script_text, language)


def _ensure_persona() -> str:
    persona_id = os.getenv("TAVUS_PERSONA_ID", "")
    if persona_id:
        return persona_id
    api_key = os.getenv("TAVUS_API_KEY", "")
    avatar_id = os.getenv("TAVUS_AVATAR_ID", "")
    if not api_key:
        raise ValueError("TAVUS_API_KEY not set")
    r = httpx.post(
        "https://tavusapi.com/v2/personas",
        headers={"x-api-key": api_key, "Content-Type": "application/json"},
        json={"pipeline_mode": "echo", "default_replica_id": avatar_id},
        timeout=30.0,
    )
    r.raise_for_status()
    persona_id = r.json().get("persona_id")
    print(f"[Tavus] Created persona_id={persona_id} — add TAVUS_PERSONA_ID to .env")
    os.environ["TAVUS_PERSONA_ID"] = persona_id or ""
    return persona_id or ""


def open_reactive_session(lesson_id: str) -> dict:
    if os.getenv("MOCK_VIDEO", "true").lower() == "true" or os.getenv(
        "FORCE_FALLBACK", "false"
    ).lower() == "true":
        return {
            "conversation_id": f"mock-{lesson_id}",
            "conversation_url": "",
        }
    persona_id = _ensure_persona()
    api_key = os.getenv("TAVUS_API_KEY", "")
    r = httpx.post(
        "https://tavusapi.com/v2/conversations",
        headers={"x-api-key": api_key, "Content-Type": "application/json"},
        json={
            "persona_id": persona_id,
            "conversation_name": f"lesson-{lesson_id}",
        },
        timeout=30.0,
    )
    r.raise_for_status()
    data = r.json()
    return {
        "conversation_id": data.get("conversation_id", ""),
        "conversation_url": data.get("conversation_url", ""),
    }


async def speak_reactive(conversation_id: str, text: str, language: str) -> None:
    from app.video.tts_client import synthesize_speech

    audio_bytes = synthesize_speech(text, language)
    # Echo streaming endpoint varies by Tavus SDK version; audio is synthesized
    # and returned via fallback path if conversation streaming is unavailable.
    if not conversation_id or conversation_id.startswith("mock"):
        return
    print(f"[Tavus] speak_reactive {len(audio_bytes)} bytes to {conversation_id}")
