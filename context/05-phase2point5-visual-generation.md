# Phase 2.5 — Visual Generation Engine (Windows verify commands)

## Paste this into Cursor:

```
Create app/brain/visual_generator.py — generate_visual(visual_type, concept, reasoning, level, subject_hint="") -> str

Routes: none->"", MOCK_VIDEO->mock SVG, equation->LaTeX via call_llm,
code->fenced block, diagram|graph|timeline|concept_map->SVG with validation+retry.

Integration: lesson_planner sets turn.visual_content via generate_visual() when visual_type != "none".

tests/test_visual.py: none, equation, code, diagram, malformed SVG returns "".

Verify:
- [ ] pytest tests/test_visual.py -v
- [ ] python -c "from app.brain.visual_generator import generate_visual; v=generate_visual('diagram','Ohm Law circuit','Show V I R','beginner'); print(v[:200] if v else 'EMPTY')"
- [ ] FORCE_FALLBACK=true — same diagram still renders or returns "" gracefully
```
