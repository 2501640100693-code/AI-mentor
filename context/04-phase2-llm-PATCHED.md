# Phase 2 — LLM wrapper + lesson planner + DAG scheduler + parse_time_budget (PATCHED — Windows)

## PATCH NOTES
- Use GEMINI_MODEL env var, not hardcoded string.
- parse_time_budget() added here (single source of truth — Phase 7 only adds tests).
- LAST_TIER_USED wired for /api/status (Phase 0 stub).

---

## Paste this into Cursor:

```
STEP A — Implement app/llm.py (replace stub).

  GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")

  _call_gemini uses model=GEMINI_MODEL
  _call_ollama uses ollama.generate() NOT ollama.chat()
  _call_claude filters message.content for type=="text" blocks only

  call_llm(): MOCK_LLM check, tier fallthrough gemini->ollama->claude,
  sets global LAST_TIER_USED on success, never raises to caller.

STEP B — tests/test_llm_fallback.py: mock gemini+claude fail, ollama serves.

STEP C — app/brain/lesson_planner.py:

  generate_concept_dag(topic, level) -> list[dict]  (JSON parse, cycle check,
    fallback builds 3 INDEPENDENT dicts — never [{...}]*3)

  schedule_by_time_budget(dag, budget_minutes) -> list[dict]  (Kahn's, no LLM)

  derive_interaction_density(budget) -> "minimal"|"standard"|"full"

  parse_time_budget(budget_input: str) -> tuple[int, bool]:
    Returns (total_minutes, is_multi_day). is_multi_day True when total > 1440.
    Handles "20 minutes", "1 hour", "7 days", "90 min/day for a week", bare ints.
    Fail-safe: unparseable input -> (20, False). NO is_multi_day_budget() anywhere.

STEP D — tests/test_scheduler.py: DAG order, parse_time_budget cases.

Check .env for GEMINI_API_KEY per CREDENTIAL PROTOCOL.

Verify:
- [ ] pytest tests/test_llm_fallback.py -v
- [ ] pytest tests/test_scheduler.py -v
- [ ] python -c "from app.brain.lesson_planner import generate_concept_dag; import json; print(json.dumps(generate_concept_dag('Ohms Law','beginner'), indent=2))"
- [ ] Select-String -Path app -Pattern is_multi_day_budget -Recurse — zero matches
- [ ] Garbage GEMINI_API_KEY -> ollama fallback in logs; restore key
```
