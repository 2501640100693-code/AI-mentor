import json
import os
import random
import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from pydantic import BaseModel

from app.brain.assessment import generate_report_card, grade_answer
from app.brain.bkt import DEMO_TRANSIT_OVERRIDE, classify_mastery, update_p_know
from app.brain.diagnostic import run_diagnostic, score_diagnostic_answers
from app.brain.learning_path import build_learning_path, get_or_create_profile
from app.brain.session_meta import read_session_meta, write_session_meta
from app.brain.lesson_planner import (
    STAGE_INSTRUCTIONS,
    STAGE_ORDER,
    choose_visual_type,
    generate_concept_dag,
    set_turn_visual_content,
)
from app.brain.misconceptions import diagnose_misconception
from app.brain.visual_generator import generate_visual
from app.db import (
    Concept,
    Flashcard,
    Lesson,
    LessonSessionModel,
    MasteryState,
    Misconception,
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
    request_adapt: bool = False
    language_override: str | None = None


class AnswerBody(BaseModel):
    student_id: str
    lesson_id: str
    concept_id: str
    turn_id: str
    student_answer: str


class DiagnosticAnswerItem(BaseModel):
    concept_id: str
    student_answer: str = ""
    familiarity: str | None = None


class DiagnosticAnswersBody(BaseModel):
    student_id: str
    lesson_id: str
    answers: list[DiagnosticAnswerItem]


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


@router.post("/diagnostic-answers")
def diagnostic_answers(body: DiagnosticAnswersBody):
    return score_diagnostic_answers(
        student_id=body.student_id,
        lesson_id=body.lesson_id,
        answers=[a.model_dump() for a in body.answers],
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
def mastery(student_id: str, lesson_id: str | None = Query(default=None)):
    with get_db() as db:
        rows = db.query(MasteryState).filter_by(student_id=student_id).all()
        if lesson_id:
            allowed = {
                c.concept_id
                for c in db.query(Concept).filter_by(lesson_id=lesson_id).all()
            }
            rows = [r for r in rows if r.concept_id in allowed]
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
                f"Re-teach '{name}' in 5 minutes using a DIFFERENT analogy than a textbook definition. "
                "Keep it concise. Sound like a warm teacher speaking out loud: plain sentences, "
                "no 'Certainly!', no bullet lists, no assistant filler."
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


def _attach_turn_question(
    turn: TeachingTurn,
    current_concept_name: str,
    level: str,
    chunks: list[str] | None,
    document_id: str | None,
) -> None:
    if document_id and not chunks:
        turn.question = QuestionBlock(
            prompt=f"What from the uploaded material is still unclear about {current_concept_name}?",
            type="explain_in_own_words",
            expected_answer_key=current_concept_name,
        )
        return
    q_type = random.choice(
        ["mcq", "short_answer", "conceptual", "explain_in_own_words"]
    )
    grounding = ""
    if chunks:
        grounding = (
            "Based only on this source context, do not invent facts:\n"
            + "\n".join(chunks[:4])
            + "\n"
        )
    q_raw = call_llm(
        f"{grounding}Generate a {q_type} question to test a {level} student's understanding of '{current_concept_name}'.\n"
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
        persisted_stage = session.current_stage or "understand"
        effective_stage = "adapt" if body.request_adapt else persisted_stage
        document_id = session.document_id
        meta = read_session_meta(session)
        if body.language_override and body.language_override.strip():
            meta["language_override"] = body.language_override.strip()
            write_session_meta(session, meta)
        language = meta.get("language_override") or (lesson.language if lesson else "English")
        level = lesson.learner_level if lesson else "beginner"
        topic = lesson.topic if lesson else current_concept_name
        chunks: list[str] = []

        if document_id:
            from app.brain.rag.retrieve import generate_grounded_explanation, retrieve

            chunks = retrieve(
                query=current_concept_name, document_id=document_id, top_k=4
            )
            if effective_stage == "adapt":
                last_script = meta.get("last_script_text") or ""
                misc_desc = meta.get("last_misconception_desc") or "the student's confusion"
                fail_counts = meta.get("fail_counts") if isinstance(meta.get("fail_counts"), dict) else {}
                fails = int(fail_counts.get(current_concept_id, 0) or 0)
                if not chunks:
                    script_text = "This isn't in the uploaded material."
                else:
                    extra = (
                        f"Do not repeat this explanation:\n{last_script}\n"
                        f"Use a new analogy targeting: {misc_desc}. "
                    )
                    if fails >= 2:
                        extra += "Give ONE short example only, not a full re-explanation. "
                    context = "\n\n".join(chunks[:6])
                    script_text = call_llm(
                        f"Teach '{current_concept_name}' in {language}. {extra}"
                        f"Ground EVERY factual claim ONLY in this source context:\n{context}\n"
                        "Sound like a warm teacher speaking out loud: plain sentences, "
                        "no 'Certainly!', no bullet lists, no assistant filler."
                    )
            else:
                script_text = generate_grounded_explanation(
                    current_concept_name, chunks, language
                )
        else:
            if effective_stage == "adapt":
                last_script = meta.get("last_script_text") or ""
                misc_desc = meta.get("last_misconception_desc") or "the student's confusion"
                fail_counts = meta.get("fail_counts") if isinstance(meta.get("fail_counts"), dict) else {}
                fails = int(fail_counts.get(current_concept_id, 0) or 0)
                prompt = (
                    f"You are teaching '{current_concept_name}' to a {level} student in {language}. "
                    f"Do not repeat this explanation:\n{last_script}\n"
                    f"Use a new analogy targeting: {misc_desc}. "
                )
                if fails >= 2:
                    prompt += "Give ONE short example only, not a full re-explanation. "
                else:
                    prompt += "Keep the explanation concise and engaging. "
                prompt += (
                    "Sound like a warm teacher speaking out loud: plain sentences, "
                    "no 'Certainly!', no bullet lists, no assistant filler."
                )
                script_text = call_llm(prompt)
            else:
                prompt = (
                    f"You are teaching '{current_concept_name}' to a {level} student in {language}. "
                    f"Stage: {effective_stage}. {STAGE_INSTRUCTIONS.get(effective_stage, '')} "
                    "Keep the explanation concise and engaging. "
                    "Sound like a warm teacher speaking out loud: plain sentences, "
                    "no 'Certainly!', no bullet lists, no assistant filler."
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
            stage=effective_stage,  # type: ignore[arg-type]
            language=language,
            script_text=script_text,
            visual_type=visual_type,  # type: ignore[arg-type]
            visual_reasoning=visual_reasoning,
        )
        set_turn_visual_content(turn, current_concept_name, level, topic)
        if effective_stage in ("question", "evaluate", "adapt"):
            _attach_turn_question(turn, current_concept_name, level, chunks, document_id)

        turns = json.loads(session.turns_json or "[]")
        turns.append(turn.model_dump())
        session.turns_json = json.dumps(turns)
        # request_adapt is ephemeral: do not advance persisted current_stage from "adapt"
        if body.request_adapt:
            session.current_stage = persisted_stage
        else:
            try:
                idx = STAGE_ORDER.index(effective_stage)
            except ValueError:
                idx = 0
            session.current_stage = STAGE_ORDER[(idx + 1) % len(STAGE_ORDER)]
        session.current_turn_id = turn.turn_id
        session.last_turn_at = turn.turn_id
        meta["last_script_text"] = script_text
        write_session_meta(session, meta)
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
            lesson = db.query(Lesson).filter_by(lesson_id=body.lesson_id).first()
            misconception_id = diagnose_misconception(
                body.student_answer,
                body.concept_id,
                topic=lesson.topic if lesson else None,
            )
            meta = read_session_meta(session)
            meta["last_misconception_id"] = misconception_id
            desc = ""
            if misconception_id:
                mrow = (
                    db.query(Misconception)
                    .filter_by(misconception_id=misconception_id)
                    .first()
                )
                if mrow and mrow.description:
                    desc = mrow.description
            meta["last_misconception_desc"] = desc or "the student's confusion"
            meta["last_script_text"] = matching.get("script_text") or meta.get("last_script_text") or ""
            counts = meta.get("fail_counts") if isinstance(meta.get("fail_counts"), dict) else {}
            counts[body.concept_id] = int(counts.get(body.concept_id, 0) or 0) + 1
            meta["fail_counts"] = counts
            write_session_meta(session, meta)
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
