import json
import os
import random
import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.brain.assessment import generate_report_card, grade_answer
from app.brain.bkt import DEMO_TRANSIT_OVERRIDE, classify_mastery, update_p_know
from app.brain.diagnostic import run_diagnostic
from app.brain.learning_path import build_learning_path, get_or_create_profile
from app.brain.lesson_planner import (
    STAGE_INSTRUCTIONS,
    STAGE_ORDER,
    choose_visual_type,
    generate_concept_dag,
)
from app.brain.misconceptions import diagnose_misconception
from app.brain.visual_generator import generate_visual
from app.db import (
    Concept,
    Flashcard,
    Lesson,
    LessonSessionModel,
    MasteryState,
    get_db,
)
from app.llm import call_llm
from app.schemas import QuestionBlock, TeachingTurn

router = APIRouter()


class LearningPathBody(BaseModel):
    topic: str
    student_id: str
    time_budget: str
    learner_level: str = "beginner"
    language: str = "English"
    teaching_style: str = "Direct"


class DiagnosticBody(BaseModel):
    document_id: str | None = None
    learner_level: str = "beginner"
    language: str = "English"
    teaching_style: str = "Direct"
    time_budget: str = "20 minutes"


class NextTurnBody(BaseModel):
    student_id: str
    lesson_id: str


class AnswerBody(BaseModel):
    student_id: str
    lesson_id: str
    concept_id: str
    turn_id: str
    student_answer: str


class RevisionBody(BaseModel):
    concept_ids: list[str]
    lesson_id: str = ""


@router.get("/ping")
def ping():
    return {"ok": True, "service": "brain"}


@router.post("/ingest")
def ingest(file: UploadFile = File(...)):
    suffix = Path(file.filename or "upload.txt").suffix.lower()
    if suffix not in {".pdf", ".docx", ".pptx", ".txt"}:
        raise HTTPException(400, "Accepted: pdf, docx, pptx, txt")
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file.file.read())
        tmp_path = tmp.name
    from app.brain.rag.ingest import ingest_document

    lang = "en"
    document_id = ingest_document(tmp_path, source_language=lang)
    try:
        os.unlink(tmp_path)
    except OSError:
        pass
    return {"document_id": document_id}


@router.post("/diagnostic/{student_id}/{topic}")
def diagnostic(student_id: str, topic: str, body: DiagnosticBody | None = None):
    body = body or DiagnosticBody()
    return run_diagnostic(
        student_id=student_id,
        topic=topic,
        document_id=body.document_id,
        learner_level=body.learner_level,
        language=body.language,
        teaching_style=body.teaching_style,
        time_budget=body.time_budget,
    )


@router.post("/learning-path")
def learning_path(body: LearningPathBody):
    return build_learning_path(
        topic=body.topic,
        student_id=body.student_id,
        time_budget=body.time_budget,
        learner_level=body.learner_level,
        language=body.language,
        teaching_style=body.teaching_style,
    )


@router.get("/profile/{student_id}")
def profile(student_id: str):
    return get_or_create_profile(student_id)


@router.get("/mastery/{student_id}")
def mastery(student_id: str):
    with get_db() as db:
        rows = db.query(MasteryState).filter_by(student_id=student_id).all()
        return [
            {
                "student_id": r.student_id,
                "concept_id": r.concept_id,
                "p_know": r.p_know,
                "p_transit": r.p_transit,
                "p_guess": r.p_guess,
                "p_slip": r.p_slip,
                "set_by_diagnostic": r.set_by_diagnostic,
                "last_updated_turn": r.last_updated_turn,
                "mastery_level": classify_mastery(r.p_know),
            }
            for r in rows
        ]


@router.get("/report/{student_id}/{lesson_id}")
def report(student_id: str, lesson_id: str):
    return generate_report_card(student_id, lesson_id)


@router.get("/flashcards/{student_id}/{lesson_id}")
def flashcards(student_id: str, lesson_id: str):
    with get_db() as db:
        existing = (
            db.query(Flashcard)
            .filter_by(student_id=student_id, lesson_id=lesson_id)
            .all()
        )
        if existing:
            return [
                {
                    "flashcard_id": f.flashcard_id,
                    "front": f.front,
                    "back": f.back,
                    "concept_id": f.concept_id,
                }
                for f in existing
            ]
        if os.getenv("MOCK_LLM", "true").lower() == "true":
            mocks = [
                {
                    "flashcard_id": str(uuid.uuid4()),
                    "front": "Ohm's Law",
                    "back": "Voltage equals current times resistance.",
                    "concept_id": "ohms_law",
                },
                {
                    "flashcard_id": str(uuid.uuid4()),
                    "front": "Current",
                    "back": "Flow of electric charge, measured in amperes.",
                    "concept_id": "current",
                },
                {
                    "flashcard_id": str(uuid.uuid4()),
                    "front": "Resistance",
                    "back": "Opposition to current, measured in ohms.",
                    "concept_id": "resistance",
                },
            ]
            for m in mocks:
                db.add(
                    Flashcard(
                        flashcard_id=m["flashcard_id"],
                        student_id=student_id,
                        lesson_id=lesson_id,
                        concept_id=m["concept_id"],
                        front=m["front"],
                        back=m["back"],
                    )
                )
            return mocks
        concepts = db.query(Concept).filter_by(lesson_id=lesson_id).all()
        cards = []
        for c in concepts:
            back = call_llm(
                f"Give a 1-sentence memorable definition of '{c.name}' for a student. Return only the definition."
            )
            fid = str(uuid.uuid4())
            db.add(
                Flashcard(
                    flashcard_id=fid,
                    student_id=student_id,
                    lesson_id=lesson_id,
                    concept_id=c.concept_id,
                    front=c.name,
                    back=back,
                )
            )
            cards.append(
                {
                    "flashcard_id": fid,
                    "front": c.name,
                    "back": back,
                    "concept_id": c.concept_id,
                }
            )
        return cards


@router.post("/revision-session/{student_id}")
def revision_session(student_id: str, body: RevisionBody):
    turns = []
    with get_db() as db:
        for cid in body.concept_ids:
            row = (
                db.query(MasteryState)
                .filter_by(student_id=student_id, concept_id=cid)
                .first()
            )
            if row and row.p_know >= 0.5:
                continue
            concept = db.query(Concept).filter_by(concept_id=cid).first()
            name = concept.name if concept else cid
            script = call_llm(
                f"Re-teach '{name}' in 5 minutes using a DIFFERENT analogy than a textbook definition. Keep it concise."
            )
            turns.append(
                TeachingTurn(
                    turn_id=str(uuid.uuid4()),
                    concept_id=cid,
                    stage="explain",
                    language="English",
                    script_text=script,
                    visual_type="none",
                    visual_reasoning="",
                ).model_dump()
            )
    return turns


@router.get("/concept-map/{topic}/{level}")
def concept_map(topic: str, level: str):
    dag = generate_concept_dag(topic, level)
    reasoning = (
        f"Concept dependency graph. Concepts: {[c['name'] for c in dag]}. "
        f"Dependencies: {[(c['name'], c.get('prerequisite_ids', [])) for c in dag]}"
    )
    svg = generate_visual("concept_map", topic, reasoning, level, topic)
    return {"svg": svg, "concept_ids": [c["concept_id"] for c in dag]}


@router.post("/teaching-turn/next")
def teaching_turn_next(body: NextTurnBody):
    with get_db() as db:
        session = (
            db.query(LessonSessionModel)
            .filter_by(student_id=body.student_id, lesson_id=body.lesson_id)
            .first()
        )
        if not session:
            raise HTTPException(404, "lesson session not found")
        lesson = db.query(Lesson).filter_by(lesson_id=body.lesson_id).first()
        concept = None
        if session.current_concept_id:
            concept = (
                db.query(Concept)
                .filter_by(concept_id=session.current_concept_id)
                .first()
            )
        if not concept:
            concept = (
                db.query(Concept).filter_by(lesson_id=body.lesson_id).first()
            )
        current_concept_id = concept.concept_id if concept else "fallback_concept_0"
        current_concept_name = concept.name if concept else "this concept"
        current_stage = session.current_stage or "understand"
        document_id = session.document_id
        language = lesson.language if lesson else "English"
        level = lesson.learner_level if lesson else "beginner"
        topic = lesson.topic if lesson else current_concept_name

        if document_id:
            from app.brain.rag.retrieve import generate_grounded_explanation, retrieve

            chunks = retrieve(
                query=current_concept_name, document_id=document_id, top_k=4
            )
            script_text = generate_grounded_explanation(
                current_concept_name, chunks, language
            )
        else:
            prompt = (
                f"You are teaching '{current_concept_name}' to a {level} student in {language}. "
                f"Stage: {current_stage}. {STAGE_INSTRUCTIONS.get(current_stage, '')} "
                "Keep the explanation concise and engaging."
            )
            script_text = call_llm(prompt)

        visual_type = choose_visual_type(current_concept_name, topic, level)
        visual_reasoning = ""
        if visual_type != "none":
            visual_reasoning = call_llm(
                f"In one sentence, describe what the {visual_type} visual for "
                f"'{current_concept_name}' should show to best aid understanding."
            ).strip()

        turn = TeachingTurn(
            turn_id=str(uuid.uuid4()),
            concept_id=current_concept_id,
            stage=current_stage,
            language=language,
            script_text=script_text,
            visual_type=visual_type,  # type: ignore[arg-type]
            visual_reasoning=visual_reasoning,
        )
        if visual_type != "none":
            turn.visual_content = generate_visual(
                visual_type, current_concept_name, visual_reasoning, level, topic
            )
        if current_stage in ("question", "evaluate"):
            q_type = random.choice(
                ["mcq", "short_answer", "conceptual", "explain_in_own_words"]
            )
            q_raw = call_llm(
                f"Generate a {q_type} question to test a {level} student's understanding of '{current_concept_name}'.\n"
                f'Format as JSON: {{"prompt": "...", "type": "{q_type}", "expected_answer_key": "...", '
                '"options": ["A: ...", "B: ...", "C: ...", "D: ..."]}\n'
                "Only include options if type is mcq. Return ONLY valid JSON."
            )
            try:
                import re as _re

                match = _re.search(r"\{.*\}", q_raw, _re.DOTALL)
                q_data = json.loads(match.group(0) if match else q_raw)
                turn.question = QuestionBlock(**q_data)
            except Exception:
                turn.question = QuestionBlock(
                    prompt=f"Can you explain {current_concept_name} in your own words?",
                    type="explain_in_own_words",
                    expected_answer_key=current_concept_name,
                )

        next_stage = STAGE_ORDER[(STAGE_ORDER.index(current_stage) + 1) % len(STAGE_ORDER)]
        turns = json.loads(session.turns_json or "[]")
        turns.append(turn.model_dump())
        session.turns_json = json.dumps(turns)
        session.current_stage = next_stage
        session.current_turn_id = turn.turn_id
        session.last_turn_at = turn.turn_id
        return turn


@router.post("/answer")
def answer(body: AnswerBody):
    with get_db() as db:
        session = (
            db.query(LessonSessionModel)
            .filter_by(student_id=body.student_id, lesson_id=body.lesson_id)
            .first()
        )
        if not session:
            return {
                "correct": True,
                "feedback": "No session found.",
                "misconception_id": None,
                "new_p_know": 0.5,
            }
        turns = json.loads(session.turns_json or "[]")
        matching = next((t for t in turns if t.get("turn_id") == body.turn_id), None)
        if not matching or not matching.get("question"):
            return {
                "correct": True,
                "feedback": "No question recorded for this turn.",
                "misconception_id": None,
                "new_p_know": 0.5,
            }
        question = QuestionBlock(**matching["question"])
        is_correct, feedback = grade_answer(question, body.student_answer)
        misconception_id = None
        if not is_correct:
            misconception_id = diagnose_misconception(
                body.student_answer, body.concept_id
            )
        row = (
            db.query(MasteryState)
            .filter_by(student_id=body.student_id, concept_id=body.concept_id)
            .first()
        )
        if not row:
            row = MasteryState(
                student_id=body.student_id,
                concept_id=body.concept_id,
                p_know=0.3,
                p_transit=0.4,
                p_guess=0.2,
                p_slip=0.1,
            )
            db.add(row)
            db.flush()
        p_transit = DEMO_TRANSIT_OVERRIDE.get(body.concept_id, row.p_transit)
        new_p_know = update_p_know(
            row.p_know, p_transit, row.p_guess, row.p_slip, correct=is_correct
        )
        row.p_know = new_p_know
        row.last_updated_turn = body.turn_id
        if is_correct:
            concepts = (
                db.query(Concept).filter_by(lesson_id=body.lesson_id).all()
            )
            ids = [c.concept_id for c in concepts]
            if body.concept_id in ids:
                idx = ids.index(body.concept_id)
                if idx + 1 < len(ids):
                    session.current_concept_id = ids[idx + 1]
                    session.current_stage = "understand"
        else:
            session.current_stage = "adapt"
        return {
            "correct": is_correct,
            "feedback": feedback,
            "misconception_id": misconception_id,
            "new_p_know": new_p_know,
        }
