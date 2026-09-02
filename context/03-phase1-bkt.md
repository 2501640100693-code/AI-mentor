# Phase 1 — BKT engine (pure logic, no API calls)

## PATCH NOTES — Windows: use `python` not `python3.11`.

---

## Paste this into Cursor:

```
In app/brain/bkt.py implement TWO functions:

FUNCTION 1: update_p_know(p_know, p_transit, p_guess, p_slip, correct: bool) -> float
  Standard two-state BKT update:
  Step 1 — Posterior given observation (Bayes' rule):
    if correct:
      p_know_given_obs = (p_know * (1 - p_slip)) / (
        p_know * (1 - p_slip) + (1 - p_know) * p_guess
      )
    else:
      p_know_given_obs = (p_know * p_slip) / (
        p_know * p_slip + (1 - p_know) * (1 - p_guess)
      )
  Step 2 — Apply learning transition:
    p_know_new = p_know_given_obs + (1 - p_know_given_obs) * p_transit
  Step 3 — CLAMP:
    return max(0.0001, min(0.9999, p_know_new))

FUNCTION 2: classify_mastery(p_know: float) -> str
  "strong" if p_know >= 0.7
  "developing" if 0.5 <= p_know < 0.7
  "weak" if p_know < 0.5

ADD: DEMO_TRANSIT_OVERRIDE = {} at module level.

In tests/test_bkt.py write tests covering:
  1. correct=True raises p_know
  2. correct=False lowers p_know
  3. p_know stays in (0, 1)
  4. Repeated correct answers converge toward 1.0 (20 iterations)
  5. classify_mastery returns all three strings
  No LLM, no network.

Verify:
- [ ] pytest tests/test_bkt.py -v — all pass
- [ ] python -c "from app.brain.bkt import update_p_know; print(update_p_know(0.3, 0.4, 0.2, 0.1, correct=True))"
- [ ] python -c "from app.brain.bkt import update_p_know; print(update_p_know(0.01, 0.01, 0.01, 0.99, correct=False))"
- [ ] python -c "from app.brain.bkt import classify_mastery; print([classify_mastery(x) for x in [0.8, 0.6, 0.3]])"
```
