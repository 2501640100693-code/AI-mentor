import inspect
import os
from datetime import datetime, timezone

from app.db import VideoCache, get_db
from app.video import routes as video_routes
from app.video.avatar_client import render_broadcast


def test_render_broadcast_route_is_plain_def():
    assert not inspect.iscoroutinefunction(video_routes.render_broadcast_route)
    assert not inspect.iscoroutinefunction(render_broadcast)


def test_mock_video_returns_instantly(monkeypatch):
    monkeypatch.setenv("MOCK_VIDEO", "true")
    seg = render_broadcast("Hello Ohm's Law", "English", "ohms_law", "beginner")
    assert seg.video_url == "/static/avatar_talking.mp4"
    assert seg.render_tier == "prerendered"
    assert seg.cache_key == "ohms_law:main:English:beginner"
    assert "Hello" in seg.subtitle_text


def test_cache_hit_on_second_call(monkeypatch):
    monkeypatch.setenv("MOCK_VIDEO", "false")
    monkeypatch.delenv("TAVUS_API_KEY", raising=False)
    cache_key = "cache_test:main:English:beginner"
    with get_db() as db:
        existing = db.query(VideoCache).filter_by(cache_key=cache_key).first()
        if existing:
            db.delete(existing)
        db.add(
            VideoCache(
                cache_key=cache_key,
                video_url="/static/avatar_talking.mp4",
                subtitle_text="cached subtitle",
                render_tier="prerendered",
                created_at=datetime.now(timezone.utc),
            )
        )
    first = render_broadcast("ignored", "English", "cache_test", "beginner")
    second = render_broadcast("ignored again", "English", "cache_test", "beginner")
    assert first.video_url == "/static/avatar_talking.mp4"
    assert second.cache_key == cache_key
    assert first.cache_key == second.cache_key
