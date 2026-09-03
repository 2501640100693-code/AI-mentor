import base64
import io
import os
import tempfile
import wave
from pathlib import Path

from tenacity import retry, stop_after_attempt, wait_fixed


def _sarvam(text: str, language: str) -> bytes:
    key = os.getenv("SARVAM_API_KEY", "")
    if not key:
        raise ValueError("SARVAM_API_KEY not set")

    lang = language
    lang_map = {
        "en": "en-IN",
        "english": "en-IN",
        "hi": "hi-IN",
        "hindi": "hi-IN",
        "en-in": "en-IN",
        "hi-in": "hi-IN",
    }
    lang = lang_map.get(language.lower(), language)

    try:
        from sarvamai import SarvamAI

        client = SarvamAI(api_subscription_key=key)
        response = client.text_to_speech.convert(
            text=text,
            target_language_code=lang,
            speaker="shubh",
            model="bulbul:v3",
            pace=1.0,
        )
        return base64.b64decode(response.audios[0])
    except Exception:
        import httpx

        r = httpx.post(
            "https://api.sarvam.ai/text-to-speech",
            headers={
                "api-subscription-key": key,
                "Content-Type": "application/json",
            },
            json={
                "text": text,
                "target_language_code": lang,
                "speaker": "shubh",
                "model": "bulbul:v3",
            },
            timeout=30.0,
        )
        r.raise_for_status()
        audios = r.json().get("audios") or []
        if not audios:
            raise RuntimeError("Sarvam returned no audios")
        return base64.b64decode(audios[0])


@retry(stop=stop_after_attempt(3), wait=wait_fixed(1), reraise=True)
def _sarvam_with_retry(text, language):
    return _sarvam(text, language)


def _piper(text: str, language: str) -> bytes:
    from piper.voice import PiperVoice

    voice_path = os.getenv("PIPER_VOICE_PATH", "en_US-lessac-medium.onnx")
    config_path = voice_path + ".json"
    if not os.path.exists(voice_path) or not os.path.exists(config_path):
        raise FileNotFoundError(
            f"Piper voice files not found: {voice_path} (+ .json config)"
        )
    voice = PiperVoice.load(voice_path)
    bio = io.BytesIO()
    with wave.open(bio, "wb") as wf:
        voice.synthesize(text, wf)
    return bio.getvalue()


def _pyttsx3_tts(text: str, language: str) -> bytes:
    import pyttsx3

    engine = pyttsx3.init()
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp_path = tmp.name
    tmp.close()
    engine.save_to_file(text, tmp_path)
    engine.runAndWait()
    data = Path(tmp_path).read_bytes()
    try:
        os.unlink(tmp_path)
    except OSError:
        pass
    return data


def synthesize_speech(text: str, language: str) -> bytes:
    """Return raw audio bytes (decoded), never a base64 string."""
    # FORCE_FALLBACK still needs real TTS for fallback VideoSegment audio.
    if (
        os.getenv("MOCK_VIDEO", "true").lower() == "true"
        and os.getenv("FORCE_FALLBACK", "false").lower() != "true"
    ):
        return b""
    for name, fn in [
        ("sarvam", _sarvam_with_retry),
        ("piper", _piper),
        ("pyttsx3", _pyttsx3_tts),
    ]:
        try:
            result = fn(text, language)
            if not isinstance(result, (bytes, bytearray)):
                raise TypeError(f"TTS {name} returned {type(result)}, expected bytes")
            print(f"[TTS] Served by: {name}")
            return bytes(result)
        except Exception as e:
            print(f"[TTS] Tier {name} failed: {e}")
    return b""
