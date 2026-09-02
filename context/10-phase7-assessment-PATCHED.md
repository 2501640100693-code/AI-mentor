# Phase 7 — Assessment, learning path, flashcards, revision (PATCHED — Windows)

## PATCH NOTES
- Schema fields should exist from Phase 0 — Step A is confirm-only.
- parse_time_budget from Phase 2 — do not duplicate is_multi_day_budget().
- diagnostic must return lesson_id + lesson_plan or study_plan.

---

## Paste this into Cursor:

```
STEP A — Confirm schemas (QuestionBlock.options, TeachingTurn.visual_content,
StudyPlan, DaySchedule, LessonSession.document_id) — patch only if missing.

STEP B — Confirm parse_time_budget in lesson_planner.py; add tests if missing.

STEP C — assessment.py: grade_answer() MCQ exact-match; all other types LLM rubric.
generate_report_card() from mastery_state.

STEP D — brain/routes.py endpoints:
  GET /mastery/{student_id}
  GET /report/{student_id}/{lesson_id}
  GET /flashcards/{student_id}/{lesson_id}
  POST /revision-session/{student_id}
  GET /concept-map/{topic}/{level}
  POST /learning-path
  GET /profile/{student_id}
  POST /diagnostic/{student_id}/{topic}  -> returns lesson_id + plan
  POST /teaching-turn/next
  POST /answer

STEP E — learning_path.py using parse_time_budget only.

Verify:
- [ ] pytest tests/test_scheduler.py -v (parse_time_budget cases)
- [ ] Select-String -Path app -Pattern is_multi_day_budget -Recurse — empty
- [ ] Invoke-RestMethod mastery/new-id — returns [] not 404
- [ ] short_answer graded CORRECT when phrasing differs
- [ ] mcq grading — no Gemini API call
- [ ] topic-only teaching-turn — no Chroma retrieve call
- [ ] python -c "from app.schemas import StudyPlan, DaySchedule, QuestionBlock, TeachingTurn"
```
