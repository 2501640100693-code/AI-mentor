# Phase 11 — Deploy (PATCHED — Windows)

## Paste this into Cursor:

```
STEP A — Render backend:
  Start: uvicorn app.main:app --host 0.0.0.0 --port $PORT
  All .env vars in dashboard. MOCK_LLM=false, MOCK_VIDEO=false.

STEP B — Vercel frontend:
  cd frontend; vercel --prod
  NEXT_PUBLIC_API_URL = Render URL, redeploy

STEP C — CORS loop: Render FRONTEND_URL = Vercel URL, redeploy backend

STEP D — Ephemeral disk: run scripts/warm_up_demo.py against LIVE URL before demo

STEP E — Cold start: Invoke-RestMethod https://your-app.onrender.com/health, wait 60s, warm up

Note: Tesseract OCR on Render may need buildpack — document in Known Limitations if OCR fails deployed.

Verify:
- [ ] Incognito browser full demo on live URL
- [ ] /health MOCK flags false on server
- [ ] Reactive round-trip works deployed
- [ ] warm_up_demo against live URL succeeds
```
