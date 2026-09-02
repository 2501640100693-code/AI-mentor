# Phase 5 — Broadcast-tier avatar rendering (PATCHED — Windows)

## Paste this into Cursor:

```
app/video/avatar_client.py — render_broadcast(script_text, language, concept_id, level) -> VideoSegment

MOCK_VIDEO check, video_cache lookup, Tavus POST /v2/videos + poll until ready.
ASYNC SAFETY: route calling this must be plain `def` OR async poll with httpx.AsyncClient —
never block event loop 5 min inside async def.

Verify:
- [ ] MOCK_VIDEO=true returns mock instantly
- [ ] MOCK_VIDEO=false: one real segment plays
- [ ] Second call same cache_key hits cache
- [ ] /health responds during long render (parallel terminal test)
```
