"use client";

import type {
  Flashcard,
  LessonPlan,
  MasteryRow,
  ReportCard,
  StatusPayload,
  StudyPlan,
  TeachingTurn,
  VideoSegment,
} from "./types";

const MOCK_LESSON: LessonPlan = {
  lesson_id: "mock-lesson-ohms",
  topic: "Ohm's Law",
  learner_level: "beginner",
  language: "English",
  teaching_style: "Direct",
  time_budget_minutes: 20,
  interaction_density: "standard",
  concepts: [
    {
      concept_id: "current",
      name: "Electric current",
      prerequisite_ids: [],
      target_depth: "beginner",
      estimated_minutes: 5,
    },
    {
      concept_id: "voltage",
      name: "Voltage",
      prerequisite_ids: ["current"],
      target_depth: "beginner",
      estimated_minutes: 5,
    },
    {
      concept_id: "ohms_law",
      name: "Ohm's Law",
      prerequisite_ids: ["current", "voltage"],
      target_depth: "beginner",
      estimated_minutes: 10,
    },
  ],
};

const MOCK_STUDY: StudyPlan = {
  plan_id: "mock-study-7d",
  root_topic: "Ohm's Law",
  student_id: "mock-student",
  total_days: 7,
  daily_schedule: [
    { day: 1, topics: ["Current"], estimated_minutes: 90, focus: "Current" },
    { day: 2, topics: ["Voltage"], estimated_minutes: 90, focus: "Voltage" },
    { day: 3, topics: ["Resistance"], estimated_minutes: 90, focus: "Resistance" },
    { day: 4, topics: ["Ohm's Law"], estimated_minutes: 90, focus: "Ohm's Law" },
    { day: 5, topics: ["Series circuits"], estimated_minutes: 90, focus: "Series" },
    { day: 6, topics: ["Parallel circuits"], estimated_minutes: 90, focus: "Parallel" },
    { day: 7, topics: ["Review"], estimated_minutes: 90, focus: "Review" },
  ],
};

export const mockApi = {
  async ingest(_file: File) {
    return { document_id: "mock-doc-1" };
  },

  async diagnostic(_studentId: string, topic: string) {
    return {
      lesson_id: MOCK_LESSON.lesson_id,
      questions: [
        {
          question: `What do you already know about ${topic}?`,
          concept_id: "ohms_law",
          expected_familiarity: "some",
        },
      ],
      lesson_plan: { ...MOCK_LESSON, topic },
    };
  },

  async learningPath(timeBudget: string, topic: string, studentId: string) {
    if (/day|week/i.test(timeBudget)) {
      return { ...MOCK_STUDY, root_topic: topic, student_id: studentId };
    }
    return { ...MOCK_LESSON, topic };
  },

  async nextTurn(): Promise<TeachingTurn> {
    return {
      turn_id: "mock-turn-1",
      concept_id: "ohms_law",
      stage: "explain",
      language: "English",
      script_text:
        "Ohm's law says voltage equals current times resistance. If current is one amp and resistance is two ohms, voltage is two volts.",
      visual_type: "equation",
      visual_reasoning: "Show the core relationship V = I R",
      visual_content: "V = IR",
    };
  },

  async questionTurn(): Promise<TeachingTurn> {
    return {
      turn_id: "mock-turn-q",
      concept_id: "ohms_law",
      stage: "question",
      language: "English",
      script_text: "Let's check if that stuck.",
      visual_type: "none",
      visual_reasoning: "",
      visual_content: "",
      question: {
        prompt: "If I = 2 A and R = 3 Ω, what is V?",
        type: "short_answer",
        expected_answer_key: "6 volts",
      },
    };
  },

  async answer(_payload: {
    student_id: string;
    lesson_id: string;
    concept_id: string;
    turn_id: string;
    student_answer: string;
  }) {
    const wrong = /current.*voltage|voltage.*current.*same|I\s*=\s*VR/i.test(
      _payload.student_answer,
    );
    return {
      correct: !wrong,
      feedback: wrong
        ? "Voltage and current are not the same. Voltage pushes; current is the flow."
        : "Nice — that matches V = I R.",
      misconception_id: wrong ? "ohm_current_voltage_swap" : null,
      new_p_know: wrong ? 0.22 : 0.71,
    };
  },

  async mastery(studentId: string): Promise<MasteryRow[]> {
    return [
      { student_id: studentId, concept_id: "current", p_know: 0.62, mastery_level: "developing" },
      { student_id: studentId, concept_id: "voltage", p_know: 0.48, mastery_level: "weak" },
      { student_id: studentId, concept_id: "ohms_law", p_know: 0.74, mastery_level: "strong" },
    ];
  },

  async report(studentId: string, lessonId: string): Promise<ReportCard> {
    return {
      student_id: studentId,
      lesson_id: lessonId,
      score_percent: 68,
      strong_areas: ["Ohm's Law"],
      weak_areas: ["Voltage"],
      recommendation: "Revisit voltage with a water-pressure analogy, then retry a short-answer check.",
    };
  },

  async flashcards(): Promise<Flashcard[]> {
    return [
      {
        flashcard_id: "f1",
        front: "Ohm's Law",
        back: "Voltage equals current times resistance (V = I R).",
        concept_id: "ohms_law",
      },
      {
        flashcard_id: "f2",
        front: "Current",
        back: "Flow of electric charge, measured in amperes.",
        concept_id: "current",
      },
      {
        flashcard_id: "f3",
        front: "Resistance",
        back: "Opposition to current, measured in ohms.",
        concept_id: "resistance",
      },
    ];
  },

  async conceptMap() {
    return {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 220">
        <rect width="480" height="220" fill="#0f0c29"/>
        <circle cx="80" cy="110" r="36" fill="#00d4ff22" stroke="#00d4ff"/>
        <text x="80" y="114" text-anchor="middle" fill="#fff" font-size="12">Current</text>
        <circle cx="240" cy="110" r="36" fill="#a78bfa22" stroke="#a78bfa"/>
        <text x="240" y="114" text-anchor="middle" fill="#fff" font-size="12">Voltage</text>
        <circle cx="400" cy="110" r="40" fill="#34d39922" stroke="#34d399"/>
        <text x="400" y="114" text-anchor="middle" fill="#fff" font-size="12">Ohm's Law</text>
        <line x1="116" y1="110" x2="204" y2="110" stroke="#ffffff55"/>
        <line x1="276" y1="110" x2="360" y2="110" stroke="#ffffff55"/>
      </svg>`,
      concept_ids: ["current", "voltage", "ohms_law"],
    };
  },

  async openReactiveSession(lessonId: string) {
    return { conversation_id: `mock-${lessonId}`, conversation_url: "" };
  },

  async renderBroadcast(scriptText: string): Promise<VideoSegment> {
    return {
      turn_id: "mock",
      video_url: "/static/avatar_talking.mp4",
      duration_seconds: 10,
      subtitle_text: scriptText.slice(0, 100),
      cache_key: "mock",
      render_tier: "prerendered",
    };
  },

  async status(): Promise<StatusPayload> {
    return {
      status: "ok",
      llm_tier: "mock",
      mock_llm: "true",
      mock_video: "true",
      force_fallback: "false",
      local_model: "qwen2.5:7b",
    };
  },

  async revisionSession() {
    return [
      {
        turn_id: "rev-1",
        concept_id: "voltage",
        stage: "explain",
        language: "English",
        script_text: "Think of voltage as water pressure in a pipe, not the water itself.",
        visual_type: "none",
        visual_reasoning: "",
      },
    ] satisfies TeachingTurn[];
  },
};

export { MOCK_LESSON, MOCK_STUDY };
