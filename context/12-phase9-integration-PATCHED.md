# Phase 9 — Integration scenarios (PATCHED — Windows)

## Paste this into Cursor:

```
Before starting: check Tavus/Sarvam/Gemini quotas on dashboards.
MOCK_LLM=false, MOCK_VIDEO=false. Run all 7 scenarios. Fix breaks.

SCENARIO 1 — Full demo: diagnostic -> plan -> broadcast -> reactive wrong answer
  (short_answer NOT mcq) -> mastery drops -> misconception shown -> correct -> report
SCENARIO 2 — Cold-start different topic
SCENARIO 3 — Mid-lesson Hindi switch, TTS log shows sarvam
SCENARIO 4 — FORCE_FALLBACK=true, fallback UI + badge "Local AI" in browser
SCENARIO 5 — generate_concept_dag unseen topic, no cycles
SCENARIO 6 — short_answer correct different wording; mcq zero LLM calls (dashboard check)
SCENARIO 7 — learning-path "7 days" vs "20 minutes" both branch correctly

Verify:
- [ ] All 7 pass
- [ ] Select-String -Path app -Pattern is_multi_day_budget -Recurse — empty
- [ ] Scenario 6 short answer graded correct
```
