import os
from datetime import datetime, timezone

import httpx
from tenacity import retry, stop_after_attempt, wait_fixed

from app.db import VideoCache, get_db
from app.schemas import VideoSegment
from app.video.cache import get_cached_segment
from app.video.fallback import fallback_response


def render_broadcast(
    script_text: str, language: str, concept_id: str, level: str
) -> VideoSegment:
    cache_key = f"{concept_id}:main:{language}:{level}"

    if os.getenv("MOCK_VIDEO", "true").lower() == "true":
        return VideoSegment(
            turn_id="mock",
            video_url="/static/avatar_talking.mp4",
            duration_seconds=10,
            subtitle_text=script_text[:100],
            cache_key=cache_key,
            render_tier="prerendered",
        )

    cached = get_cached_segment(cache_key)
    if cached:
        if not cached.subtitle_text:
            cached.subtitle_text = script_text[:200]
        return cached

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
            # Sync poll inside plain `def` route / threadpool — never in async def.
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
    """Create Tavus CVI persona once (pipeline_mode=echo); reuse TAVUS_PERSONA_ID."""
    persona_id = os.getenv("TAVUS_PERSONA_ID", "").strip()
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
    persona_id = r.json().get("persona_id") or ""
    print(f"[Tavus] Created persona_id={persona_id} — add TAVUS_PERSONA_ID to .env")
    os.environ["TAVUS_PERSONA_ID"] = persona_id
    return persona_id


def open_reactive_session(lesson_id: str) -> dict:
    if os.getenv("MOCK_VIDEO", "true").lower() == "true" or os.getenv(
        "FORCE_FALLBACK", "false"
    ).lower() == "true":
        return {
            "conversation_id": f"mock-{lesson_id}",
            "conversation_url": "",
        }
    try:
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
    except Exception as e:
        print(f"[Tavus] open_reactive_session failed, using mock session: {e}")
        return {
            "conversation_id": f"mock-{lesson_id}",
            "conversation_url": "",
        }


def _wav_to_pcm_16khz(audio_bytes: bytes) -> bytes:
    """Convert WAV bytes to raw PCM s16le mono @ 16 kHz when needed."""
    import audioop
    import io
    import wave

    if not audio_bytes:
        return b""
    # Already raw / unknown — return as-is if not a RIFF WAV
    if len(audio_bytes) < 12 or audio_bytes[:4] != b"RIFF":
        return audio_bytes
    with wave.open(io.BytesIO(audio_bytes), "rb") as wf:
        channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        frames = wf.readframes(wf.getnframes())
    if channels > 1:
        frames = audioop.tomono(frames, sampwidth, 0.5, 0.5)
    if sampwidth != 2:
        frames = audioop.lin2lin(frames, sampwidth, 2)
        sampwidth = 2
    if framerate != 16000:
        frames, _ = audioop.ratecv(frames, sampwidth, 1, framerate, 16000, None)
    return frames


async def speak_reactive(conversation_id: str, text: str, language: str) -> None:
    from app.video.tts_client import synthesize_speech

    audio_bytes = synthesize_speech(text, language)
    pcm = _wav_to_pcm_16khz(audio_bytes)
    if not conversation_id or conversation_id.startswith("mock"):
        return
    if not pcm:
        return
    api_key = os.getenv("TAVUS_API_KEY", "")
    if not api_key:
        print(f"[Tavus] speak_reactive {len(pcm)} PCM bytes (no API key; local only)")
        return
    # Echo / CVI audio ingest — best-effort; never raise to caller
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            await client.post(
                f"https://tavusapi.com/v2/conversations/{conversation_id}/speak",
                headers={
                    "x-api-key": api_key,
                    "Content-Type": "application/octet-stream",
                },
                content=pcm,
            )
        print(f"[Tavus] speak_reactive sent {len(pcm)} PCM bytes to {conversation_id}")
    except Exception as e:
        print(f"[Tavus] speak_reactive soft-fail: {e} ({len(pcm)} PCM bytes ready)")
