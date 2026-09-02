# Phase 6 — Reactive tier (PATCHED — Windows Native)

## PATCH NOTES
- speaker="shubh" (confirmed), NOT anushka.
- POST /api/video/open-reactive-session route required.
- StaticFiles mount for fallback audio.

---

## Paste this into Cursor:

```
Tavus CVI two-step: Persona once (pipeline_mode echo) -> TAVUS_PERSONA_ID in .env;
Conversation per lesson start.

app/video/tts_client.py — synthesize_speech(text, language) -> bytes
  Tier 1 Sarvam REST base64 decode, speaker="shubh", model bulbul:v3
  Tier 2 Piper (.onnx + .json both exist)
  Tier 3 pyttsx3 via tempfile (Windows-safe paths)

app/video/avatar_client.py:
  open_reactive_session(lesson_id) -> {conversation_id, conversation_url}
  speak_reactive(conversation_id, text, language) — async, WAV->PCM 16kHz if needed

app/video/fallback.py — fallback_response, never raises, loop clips + tiered TTS

app/video/routes.py — ADD:
  POST /api/video/open-reactive-session  body {lesson_id}
  Returns {conversation_id, conversation_url}

app/main.py — mount StaticFiles directory="static_files" at /static

Verify:
- [ ] synthesize_speech returns bytes not base64 string
- [ ] Sarvam fail -> piper/pyttsx3 fallback
- [ ] FORCE_FALLBACK=true -> fallback VideoSegment with audio
- [ ] Persona created ONCE — dashboard persona count stays 1
- [ ] Reactive round-trip < 2 seconds
```
