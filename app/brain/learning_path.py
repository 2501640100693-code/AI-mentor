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
from app.schemas import ConceptNode, DaySchedule, LessonPlan, StudentProfile, StudyPlan


def build_learning_path(
    topic: str,
    student_id: str,
    time_budget: str,
    learner_level: str = "beginner",
    language: str = "English",
    teaching_style: str = "Direct",
):
    total_minutes, is_multi_day = parse_time_budget(time_budget)
    dag = generate_concept_dag(topic, learner_level)

    if not is_multi_day:
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

    daily_budget = 90
    daily_match = re.search(
        r"(\d+)\s*(min|minute|minutes)\s*a\s*day", time_budget.lower()
    )
    if daily_match:
        daily_budget = int(daily_match.group(1))

    ordered = schedule_by_time_budget(dag, total_minutes)
    days: list[list[dict]] = []
    current, minutes = [], 0
    for concept in ordered:
        est = int(concept.get("estimated_minutes") or 10)
        if current and minutes + est > daily_budget:
            days.append(current)
            current, minutes = [], 0
        current.append(concept)
        minutes += est
    if current:
        days.append(current)

    plan_id = str(uuid.uuid4())
    study_plan = StudyPlan(
        plan_id=plan_id,
        root_topic=topic,
        student_id=student_id,
        total_days=max(len(days), 1),
        daily_schedule=[
            DaySchedule(
                day=i + 1,
                topics=[c["name"] for c in day_concepts],
                estimated_minutes=sum(
                    int(c.get("estimated_minutes") or 10) for c in day_concepts
                ),
                focus=day_concepts[0]["name"] if day_concepts else "Review",
            )
            for i, day_concepts in enumerate(days)
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
