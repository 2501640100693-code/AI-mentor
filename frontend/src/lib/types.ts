export type TeachingVia = "prerendered" | "reactive";

export type LearnerProfile = {
  name: string;
  level: string;
  objective: string;
  knowledge: string;
  style: string;
  language: string;
  teaching_via: TeachingVia;
  time_budget: string;
  topic: string;
};

export type ConceptNode = {
  concept_id: string;
  name: string;
  prerequisite_ids: string[];
  target_depth: string;
  estimated_minutes: number;
};

export type LessonPlan = {
  lesson_id: string;
  topic: string;
  learner_level: string;
  language: string;
  teaching_style: string;
  time_budget_minutes: number;
  interaction_density: string;
  concepts: ConceptNode[];
};

export type DaySchedule = {
  day: number;
  topics: string[];
  estimated_minutes: number;
  focus: string;
};

export type StudyPlan = {
  plan_id: string;
  root_topic: string;
  student_id: string;
  total_days: number;
  daily_schedule: DaySchedule[];
};

export type QuestionBlock = {
  prompt: string;
  type:
    | "mcq"
    | "short_answer"
    | "problem"
    | "conceptual"
    | "application"
    | "explain_in_own_words";
  expected_answer_key: string;
  options?: string[] | null;
};

export type TeachingTurn = {
  turn_id: string;
  concept_id: string;
  stage:
    | "understand"
    | "plan"
    | "explain"
    | "demonstrate"
    | "question"
    | "evaluate"
    | "adapt";
  language: string;
  script_text: string;
  visual_type:
    | "diagram"
    | "graph"
    | "code"
    | "timeline"
    | "equation"
    | "concept_map"
    | "none";
  visual_reasoning: string;
  visual_content?: string | null;
  question?: QuestionBlock | null;
};

export type MasteryRow = {
  student_id: string;
  concept_id: string;
  p_know: number;
  mastery_level?: string;
};

export type ReportCard = {
  student_id: string;
  lesson_id: string;
  score_percent: number;
  strong_areas: string[];
  weak_areas: string[];
  recommendation: string;
  incorrect_concepts?: string[];
  suggested_next_topic?: string;
  summary?: string;
};

export type DiagnosticQuestion = {
  question: string;
  concept_id: string;
  expected_answer_key?: string;
  expected_familiarity?: string;
};

export type Flashcard = {
  flashcard_id: string;
  front: string;
  back: string;
  concept_id: string;
};

export type VideoSegment = {
  turn_id: string;
  video_url?: string | null;
  audio_url?: string | null;
  duration_seconds: number;
  subtitle_text: string;
  cache_key: string;
  render_tier: "prerendered" | "fast_reactive" | "fallback";
};

export type StatusPayload = {
  status: string;
  llm_tier: string;
  mock_llm: string;
  mock_video: string;
  force_fallback: string;
  local_model: string;
  api_key_present?: boolean;
  tavus_key_present?: boolean;
  sarvam_key_present?: boolean;
  api_key_valid?: boolean | null;
  quota_exhausted?: boolean;
  fallback_reason?: string | null;
};
