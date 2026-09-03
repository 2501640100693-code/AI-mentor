import json
import re

from app.brain.bkt import classify_mastery
from app.db import (
    Concept,
    MasteryState,
    StudentProfileModel,
    get_db,
)
from app.llm import call_llm
from app.schemas import QuestionBlock, ReportCard


def grade_answer(question: QuestionBlock, student_answer: str) -> tuple[bool, str]:
    if question.type == "mcq":
        correct = (
            student_answer.strip().lower()
            == question.expected_answer_key.strip().lower()
        )
        return (
            correct,
            "Correct."
            if correct
            else f"The correct answer was {question.expected_answer_key}.",
        )

    grading_prompt = f"""You are grading a student's answer to a teaching question.
Question: {question.prompt}
Key concept the answer should demonstrate: {question.expected_answer_key}
Student's answer: {student_answer}

Classify the student's answer as exactly one of: CORRECT, PARTIALLY_CORRECT, INCORRECT.
Then give ONE short sentence of constructive feedback.
Respond in EXACTLY this format, nothing else:
LABEL: <CORRECT|PARTIALLY_CORRECT|INCORRECT>
FEEDBACK: <one sentence>"""
    result = call_llm(grading_prompt, prefer="gemini")
    label_match = re.search(
        r"LABEL:\s*(CORRECT|PARTIALLY_CORRECT|INCORRECT)", result, re.IGNORECASE
    )
    feedback_match = re.search(r"FEEDBACK:\s*(.+)", result)
    label = label_match.group(1).upper() if label_match else "INCORRECT"
    feedback = (
        feedback_match.group(1).strip()
        if feedback_match
        else "Let's review this concept again."
    )
    is_correct = label == "CORRECT"
    if label == "PARTIALLY_CORRECT" and not feedback.lower().startswith("partial"):
        feedback = f"Partially correct — {feedback}"
    return is_correct, feedback


def generate_report_card(student_id: str, lesson_id: str) -> ReportCard:
    with get_db() as db:
        lesson_concepts = db.query(Concept).filter_by(lesson_id=lesson_id).all()
        names = {c.concept_id: c.name for c in lesson_concepts}
        concept_ids = set(names.keys())
        all_rows = db.query(MasteryState).filter_by(student_id=student_id).all()
        rows = [r for r in all_rows if r.concept_id in concept_ids] if concept_ids else all_rows
        if not rows:
            return ReportCard(
                student_id=student_id,
                lesson_id=lesson_id,
                score_percent=0.0,
                strong_areas=[],
                weak_areas=[],
                recommendation="No assessment data yet for this lesson.",
            )
        score_percent = (sum(r.p_know for r in rows) / len(rows)) * 100
        strong_areas = [
            names.get(r.concept_id, r.concept_id)
            for r in rows
            if classify_mastery(r.p_know) == "strong"
        ]
        weak_areas = [
            names.get(r.concept_id, r.concept_id)
            for r in rows
            if classify_mastery(r.p_know) == "weak"
        ]
        lowest = min(rows, key=lambda r: r.p_know)
        recommendation = (
            f"Focus on {names.get(lowest.concept_id, lowest.concept_id)} next — "
            "it had the lowest mastery score."
        )
        profile = db.query(StudentProfileModel).filter_by(student_id=student_id).first()
        if not profile:
            profile = StudentProfileModel(student_id=student_id)
            db.add(profile)
        completed = json.loads(profile.lessons_completed_json or "[]")
        if lesson_id not in completed:
            completed.append(lesson_id)
        profile.lessons_completed_json = json.dumps(completed)
        agg = json.loads(profile.aggregate_mastery_json or "{}")
        for r in rows:
            agg[r.concept_id] = r.p_know
        profile.aggregate_mastery_json = json.dumps(agg)
        profile.overall_strong_json = json.dumps(
            [k for k, v in agg.items() if classify_mastery(v) == "strong"]
        )
        profile.overall_weak_json = json.dumps(
            [k for k, v in agg.items() if classify_mastery(v) == "weak"]
        )
        return ReportCard(
            student_id=student_id,
            lesson_id=lesson_id,
            score_percent=round(score_percent, 1),
            strong_areas=strong_areas,
            weak_areas=weak_areas,
            recommendation=recommendation,
        )
