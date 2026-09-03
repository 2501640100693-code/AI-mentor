from pydantic import BaseModel, Field
from typing import Optional, Literal


class QuestionBlock(BaseModel):
    prompt: str
    type: Literal[
        "mcq",
        "short_answer",
        "problem",
        "conceptual",
        "application",
        "explain_in_own_words",
    ]
    expected_answer_key: str
    options: Optional[list[str]] = None


class ConceptNode(BaseModel):
    concept_id: str
    name: str
    prerequisite_ids: list[str] = []
    target_depth: str
    estimated_minutes: int


class TeachingTurn(BaseModel):
    turn_id: str
    concept_id: str
    stage: Literal[
        "understand",
        "plan",
        "explain",
        "demonstrate",
        "question",
        "evaluate",
        "adapt",
    ]
    language: str
    script_text: str
    visual_type: Literal[
        "diagram",
        "graph",
        "code",
        "timeline",
        "equation",
        "concept_map",
        "none",
    ]
    visual_reasoning: str
    visual_content: Optional[str] = None
    question: Optional[QuestionBlock] = None


class VideoSegment(BaseModel):
    turn_id: str
    video_url: Optional[str] = None
    audio_url: Optional[str] = None
    duration_seconds: int = 10
    subtitle_text: str
    cache_key: str
    render_tier: Literal["prerendered", "fast_reactive", "fallback"]


class StudentMasteryState(BaseModel):
    student_id: str
    concept_id: str
    p_know: float
    p_transit: float = 0.4
    p_guess: float = 0.2
    p_slip: float = 0.1
    set_by_diagnostic: bool = False
    last_updated_turn: Optional[str] = None
    mastery_level: Optional[str] = None


class LearningPath(BaseModel):
    path_id: str
    root_topic: str
    student_id: str
    ordered_topic_ids: list[str]
    current_position_index: int = 0


class StudentProfile(BaseModel):
    student_id: str
    lessons_completed: list[str] = []
    aggregate_mastery_by_concept: dict = Field(default_factory=dict)
    overall_weak_concepts: list[str] = []
    overall_strong_concepts: list[str] = []
    active_learning_path_id: Optional[str] = None


class LessonPlan(BaseModel):
    lesson_id: str
    topic: str
    learner_level: str
    language: str = "English"
    teaching_style: str = "Direct"
    time_budget_minutes: int
    interaction_density: str
    concepts: list[ConceptNode]


class LessonSession(BaseModel):
    student_id: str
    lesson_id: str
    current_concept_id: Optional[str] = None
    current_stage: str = "understand"
    current_turn_id: Optional[str] = None
    last_turn_at: Optional[str] = None
    document_id: Optional[str] = None


class MisconceptionEntry(BaseModel):
    misconception_id: str
    concept_id: str
    wrong_answer_pattern: str
    description: str
    embedding_stored: bool = False


class ReportCard(BaseModel):
    student_id: str
    lesson_id: str
    score_percent: float
    strong_areas: list[str]
    weak_areas: list[str]
    recommendation: str


class DaySchedule(BaseModel):
    day: int
    topics: list[str]
    estimated_minutes: int
    focus: str


class StudyPlan(BaseModel):
    plan_id: str
    root_topic: str
    student_id: str
    total_days: int
    daily_schedule: list[DaySchedule]
