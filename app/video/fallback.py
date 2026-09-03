import os
import random
import uuid
from pathlib import Path

from app.schemas import VideoSegment
from app.video.tts_client import synthesize_speech

STATIC_DIR = Path("static_files")
LOOP_CLIPS = [
    "avatar_idle.mp4",
    "avatar_talking.mp4",
    "avatar_thinking.mp4",
]


def fallback_response(text: str, language: str) -> VideoSegment:
    try:
        STATIC_DIR.mkdir(exist_ok=True)
        audio_bytes = synthesize_speech(text, language)
        audio_filename = f"fallback_{uuid.uuid4().hex}.wav"
        audio_path = STATIC_DIR / audio_filename
        audio_path.write_bytes(audio_bytes or b"")
        audio_url = f"/static/{audio_filename}"
        existing = [c for c in LOOP_CLIPS if (STATIC_DIR / c).exists()]
        clip = random.choice(existing) if existing else "avatar_idle.mp4"
        video_url = f"/static/{clip}"
        return VideoSegment(
            turn_id=f"fallback-{uuid.uuid4().hex[:8]}",
            video_url=video_url,
            audio_url=audio_url,
            duration_seconds=8,
            subtitle_text=text[:200],
            cache_key=f"fallback:{text[:20]}",
            render_tier="fallback",
        )
    except Exception as e:
        print(f"[Fallback] {e}")
        return VideoSegment(
            turn_id="fallback-safe",
            video_url="",
            audio_url="",
            duration_seconds=5,
            subtitle_text=text[:200],
            cache_key="fallback-safe",
            render_tier="fallback",
        )
