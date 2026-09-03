import json
import uuid

from app.brain.lesson_planner import generate_concept_dag
from app.db import Concept, Lesson, LessonSessionModel, MasteryState, get_db
from app.llm import call_llm
from app.schemas import LessonPlan


def run_diagnostic(
    student_id: str,
    topic: str,
    document_id: str | None = None,
    learner_level: str = "beginner",
    language: str = "English",
    teaching_style: str = "Direct",
    time_budget: str = "20 minutes",
) -> dict:
    from app.brain.lesson_planner import (
        derive_interaction_density,
        parse_time_budget,
        schedule_by_time_budget,
    )
    from app.schemas import ConceptNode

    if document_id:
        from app.brain.rag.retrieve import retrieve

        chunks = retrieve(query=topic, document_id=document_id, top_k=4)
        context = "\n".join(chunks)
        prompt = (
            f"Based only on this material, write 3 diagnostic questions for a "
            f"{learner_level} student about '{topic}'.\n{context}\n"
            'Return JSON array: [{"question":"...","concept_id":"...","expected_familiarity":"no"}]'
        )
    else:
        prompt = (
            f"Write 3 diagnostic questions covering '{topic}' for a {learner_level} student.\n"
            'Return JSON array: [{"question":"...","concept_id":"...","expected_familiarity":"no"}]'
        )
    raw = call_llm(prompt)
    questions = []
    try:
        import re

        match = re.search(r"\[.*\]", raw, re.DOTALL)
        questions = json.loads(match.group(0) if match else raw)
    except Exception:
        questions = [
            {
                "question": f"What do you already know about {topic}?",
                "concept_id": "intro",
                "expected_familiarity": "no",
            }
        ]

    minutes, _ = parse_time_budget(time_budget)
    dag = generate_concept_dag(topic, learner_level)
    ordered = schedule_by_time_budget(dag, minutes)
    lesson_id = str(uuid.uuid4())
    prefix = lesson_id[:8]
    id_map = {c["concept_id"]: f"{prefix}_{c['concept_id']}" for c in ordered}
    namespaced = []
    for c in ordered:
        item = dict(c)
        item["concept_id"] = id_map[c["concept_id"]]
        item["prerequisite_ids"] = [
            id_map[p] for p in c.get("prerequisite_ids", []) if p in id_map
        ]
        namespaced.append(item)
    ordered = namespaced
    plan = LessonPlan(
        lesson_id=lesson_id,
        topic=topic,
        learner_level=learner_level,
        language=language,
        teaching_style=teaching_style,
        time_budget_minutes=minutes,
        interaction_density=derive_interaction_density(minutes),
        concepts=[ConceptNode(**c) for c in ordered],
    )

    with get_db() as db:
        db.add(
            Lesson(
                lesson_id=lesson_id,
                student_id=student_id,
                topic=topic,
                learner_level=learner_level,
                language=language,
                teaching_style=teaching_style,
            )
        )
        first_concept = None
        for c in ordered:
            db.add(
                Concept(
                    concept_id=c["concept_id"],
                    lesson_id=lesson_id,
                    name=c["name"],
                    prerequisite_ids_json=json.dumps(c.get("prerequisite_ids", [])),
                    target_depth=c.get("target_depth", learner_level),
                    estimated_minutes=int(c.get("estimated_minutes") or 10),
                )
            )
            if first_concept is None:
                first_concept = c["concept_id"]
            existing = (
                db.query(MasteryState)
                .filter_by(student_id=student_id, concept_id=c["concept_id"])
                .first()
            )
            if not existing:
                db.add(
                    MasteryState(
                        student_id=student_id,
                        concept_id=c["concept_id"],
                        p_know=0.3,
                        p_transit=0.4,
                        p_guess=0.2,
                        p_slip=0.1,
                        set_by_diagnostic=True,
                    )
                )
        db.add(
            LessonSessionModel(
                student_id=student_id,
                lesson_id=lesson_id,
                current_concept_id=first_concept,
                current_stage="understand",
                document_id=document_id,
                turns_json="[]",
            )
        )

    return {
        "lesson_id": lesson_id,
        "questions": questions,
        "lesson_plan": plan.model_dump(),
    }
