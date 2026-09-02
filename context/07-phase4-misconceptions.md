# Phase 4 — Misconception bank + cold-start + hallucination check

## Paste this into Cursor:

```
(Same logic as original — no OS-specific commands in verify section.)

misconceptions.py: 15-20 hand-written entries for demo subject, diagnose_misconception
(cosine >= 0.70), generate_and_cache_misconceptions for cold-start topics.

hallucination_check.py: verify_claims() second LLM pass, prefer="gemini".

Verify manually with wrong/right answers, cold-start concept, fabricated claim test.
Tune 0.70 threshold during Phase 9 rehearsal.
```
