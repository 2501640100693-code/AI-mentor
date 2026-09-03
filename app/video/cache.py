from app.db import VideoCache, get_db
from app.schemas import VideoSegment


def get_cached_segment(cache_key: str) -> VideoSegment | None:
    with get_db() as db:
        cached = db.query(VideoCache).filter_by(cache_key=cache_key).first()
        if not cached:
            return None
        return VideoSegment(
            turn_id=cached.cache_key,
            video_url=cached.video_url,
            audio_url=cached.audio_url,
            subtitle_text=cached.subtitle_text or "",
            cache_key=cached.cache_key,
            render_tier=cached.render_tier or "prerendered",
        )
