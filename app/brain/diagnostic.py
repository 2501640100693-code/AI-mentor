import json
import re
import uuid

from app.brain.lesson_planner import generate_concept_dag
from app.brain.session_meta import read_session_meta, write_session_meta
from app.db import Concept, Lesson, LessonSessionModel, MasteryState, get_db
from app.llm import call_llm
from app.schemas import LessonPlan


def _prior_name_to_p_know(student_id: str, db) -> dict[str, float]:
    rows = db.query(MasteryState).filter_by(student_id=student_id).all()
    if not rows:
        return {}
    ids = [r.concept_id for r in rows]
    concepts = db.query(Concept).filter(Concept.concept_id.in_(ids)).all()
    names = {c.concept_id: (c.name or "").strip().casefold() for c in concepts}
    out: dict[str, float] = {}
    for r in rows:
        name = names.get(r.concept_id, "")
        if name:
            out[name] = r.p_know
    return out


def _review_concept_from_weak(student_id: str, existing_names: set[str], db) -> dict | None:
    from app.brain.learning_path import get_or_create_profile

    profile = get_or_create_profile(student_id)
    for raw_id in profile.overall_weak_concepts:
        concept = db.query(Concept).filter_by(concept_id=raw_id).first()
        if not concept or not concept.name:
            continue
        name = concept.name.strip()
        if name.casefold() in existing_names:
            continue
        safe = re.sub(r"[^a-z0-9]+", "_", raw_id.lower()).strip("_") or "weak"
        return {
            "concept_id": f"review_{safe}"[:64],
            "name": name,
            "prerequisite_ids": [],
            "target_depth": concept.target_depth or "beginner",
            "estimated_minutes": 8,
        }
    return None


def _build_diagnostic_questions(
    topic: str,
    learner_level: str,
    document_id: str | None,
    ordered: list[dict],
) -> list[dict]:
    allowed = {c["concept_id"]: c["name"] for c in ordered}
    allowed_ids = set(allowed)
    catalog = json.dumps([{"concept_id": cid, "name": name} for cid, name in allowed.items()])
    context = ""
    if document_id:
        from app.brain.rag.retrieve import retrieve

        chunks = retrieve(query=topic, document_id=document_id, top_k=4)
        context = "\n".join(chunks)
    prompt = (
        f"Write exactly 3 diagnostic questions for a {learner_level} student about '{topic}'.\n"
        f"Use ONLY these concept_id values (do not invent names or ids):\n{catalog}\n"
    )
    if context:
        prompt += f"Ground questions in this material when possible:\n{context}\n"
    prompt += (
        'Return JSON array: [{"question":"...","concept_id":"...","expected_answer_key":"..."}]'
    )
    raw = call_llm(prompt)
    parsed: list = []
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        parsed = json.loads(match.group(0) if match else raw)
        if not isinstance(parsed, list):
            parsed = []
    except Exception:
        parsed = []

    questions: list[dict] = []
    used: set[str] = set()
    for item in parsed:
        if not isinstance(item, dict):
            continue
        cid = str(item.get("concept_id") or "")
        if cid not in allowed_ids or cid in used:
            continue
        qtext = str(item.get("question") or "").strip()
        if not qtext:
            qtext = f"What do you already know about {allowed[cid]}?"
        questions.append(
            {
                "question": qtext,
                "concept_id": cid,
                "expected_answer_key": str(item.get("expected_answer_key") or "").strip(),
                "expected_familiarity": "no",
            }
        )
        used.add(cid)
        if len(questions) >= 3:
            break

    for c in ordered:
        if len(questions) >= 3:
            break
        if c["concept_id"] in used:
            continue
        questions.append(
            {
                "question": f"What do you already know about {c['name']}?",
                "concept_id": c["concept_id"],
                "expected_answer_key": "",
                "expected_familiarity": "no",
            }
        )
        used.add(c["concept_id"])
    return questions[:3]


def run_diagnostic(
    student_id: str,
    topic: str,
    document_id: str | None = None,
    learner_level: str = "beginner",
    language: str = "English",
    teaching_style: str = "Direct",
    time_budget: str = "20 minutes",
) -> dict:
    from app.brain.learning_path import get_or_create_profile
    from app.brain.lesson_planner import (
        derive_interaction_density,
        parse_time_budget,
        schedule_by_time_budget,
    )
    from app.schemas import ConceptNode

    get_or_create_profile(student_id)

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

    with get_db() as db:
        existing_names = {c["name"].strip().casefold() for c in ordered if c.get("name")}
        review = _review_concept_from_weak(student_id, existing_names, db)
        if review:
            review["concept_id"] = f"{prefix}_{review['concept_id']}"
            ordered.append(review)

        prior = _prior_name_to_p_know(student_id, db)
        questions = _build_diagnostic_questions(topic, learner_level, document_id, ordered)
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
                seeded = prior.get((c.get("name") or "").strip().casefold())
                db.add(
                    MasteryState(
                        student_id=student_id,
                        concept_id=c["concept_id"],
                        p_know=seeded if seeded is not None else 0.3,
                        p_transit=0.4,
                        p_guess=0.2,
                        p_slip=0.1,
                        set_by_diagnostic=True,
                    )
                )
        session = LessonSessionModel(
            student_id=student_id,
            lesson_id=lesson_id,
            current_concept_id=first_concept,
            current_stage="understand",
            document_id=document_id,
            turns_json="[]",
        )
        db.add(session)
        db.flush()
        meta = read_session_meta(session)
        meta["diagnostic_questions"] = questions
        write_session_meta(session, meta)

    return {
        "lesson_id": lesson_id,
        "questions": questions,
        "lesson_plan": plan.model_dump(),
    }


def score_diagnostic_answers(
    student_id: str,
    lesson_id: str,
    answers: list[dict],
) -> dict:
    from app.brain.assessment import grade_answer
    from app.schemas import QuestionBlock

    with get_db() as db:
        session = (
            db.query(LessonSessionModel)
            .filter_by(student_id=student_id, lesson_id=lesson_id)
            .first()
        )
        if not session:
            from fastapi import HTTPException

            raise HTTPException(404, "lesson session not found")
        meta = read_session_meta(session)
        stored = meta.get("diagnostic_questions") or []
        by_id = {q.get("concept_id"): q for q in stored if isinstance(q, dict)}
        updates = []
        for ans in answers:
            cid = str(ans.get("concept_id") or "")
            if not cid:
                continue
            row = (
                db.query(MasteryState)
                .filter_by(student_id=student_id, concept_id=cid)
                .first()
            )
            if not row:
                continue
            familiarity = (ans.get("familiarity") or "").strip().lower() or None
            student_answer = str(ans.get("student_answer") or "").strip()
            stored_q = by_id.get(cid) or {}
            expected = str(stored_q.get("expected_answer_key") or "").strip()
            is_correct = None
            if expected and student_answer:
                qblock = QuestionBlock(
                    prompt=str(stored_q.get("question") or "Diagnostic"),
                    type="short_answer",
                    expected_answer_key=expected,
                )
                is_correct, _ = grade_answer(qblock, student_answer)
            if familiarity == "known" or is_correct is True:
                row.p_know = 0.6
            elif familiarity == "unknown" or is_correct is False:
                row.p_know = 0.2
            updates.append({"concept_id": cid, "p_know": row.p_know})
        meta["diagnostic_scored"] = True
        write_session_meta(session, meta)
        return {"lesson_id": lesson_id, "updates": updates}
