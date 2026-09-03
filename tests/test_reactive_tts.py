import asyncio
import inspect
import time
from unittest.mock import patch

from app.video.avatar_client import (
    _ensure_persona,
    _wav_to_pcm_16khz,
    open_reactive_session,
    speak_reactive,
)
from app.video.fallback import fallback_response
from app.video.tts_client import synthesize_speech


def test_synthesize_returns_bytes_not_base64(monkeypatch):
    monkeypatch.setenv("MOCK_VIDEO", "false")
    monkeypatch.setenv("FORCE_FALLBACK", "false")
    with patch(
        "app.video.tts_client._sarvam_with_retry",
        return_value=b"RIFF....WAVDATA",
    ):
        out = synthesize_speech("hello", "English")
    assert isinstance(out, (bytes, bytearray))
    assert out == b"RIFF....WAVDATA"
    # Must be decoded audio bytes, not a base64 ASCII string
    assert b"=" not in out or out.startswith(b"RIFF")


def test_sarvam_fail_falls_to_piper(monkeypatch):
    monkeypatch.setenv("MOCK_VIDEO", "false")
    monkeypatch.setenv("FORCE_FALLBACK", "false")
    with patch(
        "app.video.tts_client._sarvam_with_retry",
        side_effect=RuntimeError("sarvam down"),
    ):
        with patch("app.video.tts_client._piper", return_value=b"piper-wav") as piper:
            with patch("app.video.tts_client._pyttsx3_tts") as pyttsx:
                out = synthesize_speech("hello", "English")
    assert out == b"piper-wav"
    piper.assert_called_once()
    pyttsx.assert_not_called()


def test_force_fallback_video_segment_has_audio(monkeypatch):
    monkeypatch.setenv("FORCE_FALLBACK", "true")
    monkeypatch.setenv("MOCK_VIDEO", "false")
    with patch("app.video.fallback.synthesize_speech", return_value=b"RIFFAUDIO"):
        seg = fallback_response("Explain Ohm's Law briefly", "English")
    assert seg.render_tier == "fallback"
    assert seg.audio_url
    assert seg.audio_url.startswith("/static/")
    assert seg.video_url.startswith("/static/")


def test_persona_reuses_env_id(monkeypatch):
    monkeypatch.setenv("TAVUS_PERSONA_ID", "persona-once-123")
    with patch("app.video.avatar_client.httpx.post") as post:
        pid = _ensure_persona()
    assert pid == "persona-once-123"
    post.assert_not_called()


def test_open_reactive_session_mock_fast(monkeypatch):
    monkeypatch.setenv("MOCK_VIDEO", "true")
    t0 = time.perf_counter()
    out = open_reactive_session("lesson-abc")
    elapsed = time.perf_counter() - t0
    assert out["conversation_id"] == "mock-lesson-abc"
    assert elapsed < 2.0


def test_speak_reactive_is_async_and_fast(monkeypatch):
    monkeypatch.setenv("MOCK_VIDEO", "true")
    assert inspect.iscoroutinefunction(speak_reactive)
    t0 = time.perf_counter()
    asyncio.run(speak_reactive("mock-lesson", "hi", "English"))
    assert time.perf_counter() - t0 < 2.0


def test_wav_to_pcm_passthrough_non_wav():
    assert _wav_to_pcm_16khz(b"rawpcm") == b"rawpcm"
    assert _wav_to_pcm_16khz(b"") == b""
