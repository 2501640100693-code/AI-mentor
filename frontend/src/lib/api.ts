"use client";

import { mockApi } from "./mockApi";
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

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

function mediaUrl(path?: string | null): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  mediaUrl,

  async ingest(file: File) {
    if (USE_MOCK) return mockApi.ingest(file);
    try {
      const body = new FormData();
      body.append("file", file);
      return await request<{ document_id: string }>("/api/brain/ingest", {
        method: "POST",
        body,
      });
    } catch {
      return mockApi.ingest(file);
    }
  },

  async diagnostic(
    studentId: string,
    topic: string,
    payload: {
      document_id?: string | null;
      learner_level: string;
      language: string;
      teaching_style: string;
      time_budget: string;
    },
  ) {
    if (USE_MOCK) return mockApi.diagnostic(studentId, topic);
    try {
      return await request<{
        lesson_id: string;
        questions: unknown[];
        lesson_plan: LessonPlan;
      }>(
        `/api/brain/diagnostic/${encodeURIComponent(studentId)}/${encodeURIComponent(topic)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
    } catch {
      return mockApi.diagnostic(studentId, topic);
    }
  },

  async learningPath(body: {
    topic: string;
    student_id: string;
    time_budget: string;
    learner_level: string;
    language: string;
    teaching_style: string;
  }): Promise<LessonPlan | StudyPlan> {
    if (USE_MOCK) return mockApi.learningPath(body.time_budget, body.topic, body.student_id);
    try {
      return await request("/api/brain/learning-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      return mockApi.learningPath(body.time_budget, body.topic, body.student_id);
    }
  },

  async nextTurn(studentId: string, lessonId: string): Promise<TeachingTurn> {
    if (USE_MOCK) return mockApi.nextTurn();
    try {
      return await request("/api/brain/teaching-turn/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, lesson_id: lessonId }),
      });
    } catch {
      return mockApi.nextTurn();
    }
  },

  async answer(payload: {
    student_id: string;
    lesson_id: string;
    concept_id: string;
    turn_id: string;
    student_answer: string;
  }) {
    if (USE_MOCK) return mockApi.answer(payload);
    try {
      return await request<{
        correct: boolean;
        feedback: string;
        misconception_id: string | null;
        new_p_know: number;
      }>("/api/brain/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      return mockApi.answer(payload);
    }
  },

  async mastery(studentId: string): Promise<MasteryRow[]> {
    if (USE_MOCK) return mockApi.mastery(studentId);
    try {
      return await request(`/api/brain/mastery/${encodeURIComponent(studentId)}`);
    } catch {
      return mockApi.mastery(studentId);
    }
  },

  async report(studentId: string, lessonId: string): Promise<ReportCard> {
    if (USE_MOCK) return mockApi.report(studentId, lessonId);
    try {
      return await request(
        `/api/brain/report/${encodeURIComponent(studentId)}/${encodeURIComponent(lessonId)}`,
      );
    } catch {
      return mockApi.report(studentId, lessonId);
    }
  },

  async flashcards(studentId: string, lessonId: string): Promise<Flashcard[]> {
    if (USE_MOCK) return mockApi.flashcards();
    try {
      return await request(
        `/api/brain/flashcards/${encodeURIComponent(studentId)}/${encodeURIComponent(lessonId)}`,
      );
    } catch {
      return mockApi.flashcards();
    }
  },

  async conceptMap(topic: string, level: string) {
    if (USE_MOCK) return mockApi.conceptMap();
    try {
      return await request<{ svg: string; concept_ids: string[] }>(
        `/api/brain/concept-map/${encodeURIComponent(topic)}/${encodeURIComponent(level)}`,
      );
    } catch {
      return mockApi.conceptMap();
    }
  },

  async openReactiveSession(lessonId: string) {
    if (USE_MOCK) return mockApi.openReactiveSession(lessonId);
    try {
      return await request<{ conversation_id: string; conversation_url: string }>(
        "/api/video/open-reactive-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lesson_id: lessonId }),
        },
      );
    } catch {
      return mockApi.openReactiveSession(lessonId);
    }
  },

  async renderBroadcast(scriptText: string, language = "English"): Promise<VideoSegment> {
    if (USE_MOCK) return mockApi.renderBroadcast(scriptText);
    try {
      const seg = await request<VideoSegment>("/api/video/render-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script_text: scriptText,
          language,
          concept_id: "intro",
          level: "beginner",
        }),
      });
      return {
        ...seg,
        video_url: mediaUrl(seg.video_url),
        audio_url: mediaUrl(seg.audio_url),
      };
    } catch {
      return mockApi.renderBroadcast(scriptText);
    }
  },

  async status(): Promise<StatusPayload> {
    if (USE_MOCK) return mockApi.status();
    try {
      return await request("/api/status");
    } catch {
      return mockApi.status();
    }
  },

  async revisionSession(studentId: string, conceptIds: string[], lessonId: string) {
    if (USE_MOCK) return mockApi.revisionSession();
    try {
      return await request<TeachingTurn[]>(
        `/api/brain/revision-session/${encodeURIComponent(studentId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ concept_ids: conceptIds, lesson_id: lessonId }),
        },
      );
    } catch {
      return mockApi.revisionSession();
    }
  },
};
