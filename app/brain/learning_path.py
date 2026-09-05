import json
import re
import uuid

from app.brain.lesson_planner import (
    derive_interaction_density,
    generate_concept_dag,
    parse_time_budget,
    schedule_by_time_budget,
)
from app.db import LearningPathModel, StudentProfileModel, get_db
from app.llm import call_llm
from app.schemas import ConceptNode, DaySchedule, LessonPlan, StudentProfile, StudyPlan


def _topic_is_broad(topic: str, time_budget: str, is_multi_day: bool) -> bool:
    if is_multi_day:
        return True
    t = topic.strip()
    lowered = t.lower()
    if "," in t or " and " in lowered or "/" in t:
        return True
    words = [w for w in re.split(r"\s+", t) if w]
    if len(words) <= 2 and re.search(r"\b(day|days|week|weeks)\b", time_budget.lower()):
        return True
    return False


def _curriculum_areas(topic: str) -> list[str]:
    raw = call_llm(
        f"Create a multi-topic curriculum under '{topic}'. "
        "Return ONLY a JSON array of 5 to 8 distinct subject-area titles (strings). "
        "Each title is a different area, not the same concept restated."
    )
    areas: list[str] = []
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        parsed = json.loads(match.group(0) if match else raw)
        if isinstance(parsed, list):
            for item in parsed:
                if isinstance(item, str) and item.strip():
                    areas.append(item.strip())
                elif isinstance(item, dict):
                    title = item.get("title") or item.get("name") or item.get("topic")
                    if isinstance(title, str) and title.strip():
                        areas.append(title.strip())
    except Exception:
        areas = []
    if not areas:
        parts = [p.strip() for p in re.split(r",|/|\band\b", topic) if p.strip()]
        areas = parts if len(parts) >= 2 else [topic]
    # unique, keep order, clamp 5-8 when we have enough
    seen: set[str] = set()
    unique: list[str] = []
    for a in areas:
        key = a.casefold()
        if key in seen:
            continue
        seen.add(key)
        unique.append(a)
    if len(unique) > 8:
        unique = unique[:8]
    return unique


def build_learning_path(
    topic: str,
    student_id: str,
    time_budget: str,
    learner_level: str = "beginner",
    language: str = "English",
    teaching_style: str = "Direct",
):
    total_minutes, is_multi_day = parse_time_budget(time_budget)
    broad = _topic_is_broad(topic, time_budget, is_multi_day)

    if not is_multi_day and not broad:
        dag = generate_concept_dag(topic, learner_level)
        ordered = schedule_by_time_budget(dag, total_minutes)
        lesson_id = str(uuid.uuid4())
        return LessonPlan(
            lesson_id=lesson_id,
            topic=topic,
            learner_level=learner_level,
            language=language,
            teaching_style=teaching_style,
            time_budget_minutes=total_minutes,
            interaction_density=derive_interaction_density(total_minutes),
            concepts=[ConceptNode(**c) for c in ordered],
        )

    areas = _curriculum_areas(topic)
    day1_focus = areas[0]
    generate_concept_dag(day1_focus, learner_level)
    daily_budget = 90
    daily_match = re.search(
        r"(\d+)\s*(min|minute|minutes)\s*a\s*day", time_budget.lower()
    )
    if daily_match:
        daily_budget = int(daily_match.group(1))

    plan_id = str(uuid.uuid4())
    study_plan = StudyPlan(
        plan_id=plan_id,
        root_topic=topic,
        student_id=student_id,
        total_days=max(len(areas), 1),
        daily_schedule=[
            DaySchedule(
                day=i + 1,
                topics=[area],
                estimated_minutes=daily_budget,
                focus=area,
            )
            for i, area in enumerate(areas)
        ],
    )
    with get_db() as db:
        db.add(
            LearningPathModel(
                path_id=plan_id,
                student_id=student_id,
                root_topic=topic,
                plan_json=study_plan.model_dump_json(),
            )
        )
        profile = db.query(StudentProfileModel).filter_by(student_id=student_id).first()
        if not profile:
            profile = StudentProfileModel(student_id=student_id)
            db.add(profile)
        profile.active_learning_path_id = plan_id
    return study_plan


def get_or_create_profile(student_id: str) -> StudentProfile:
    with get_db() as db:
        row = db.query(StudentProfileModel).filter_by(student_id=student_id).first()
        if not row:
            row = StudentProfileModel(student_id=student_id)
            db.add(row)
            db.flush()
        return StudentProfile(
            student_id=row.student_id,
            lessons_completed=json.loads(row.lessons_completed_json or "[]"),
            aggregate_mastery_by_concept=json.loads(row.aggregate_mastery_json or "{}"),
            overall_weak_concepts=json.loads(row.overall_weak_json or "[]"),
            overall_strong_concepts=json.loads(row.overall_strong_json or "[]"),
            active_learning_path_id=row.active_learning_path_id,
        )
