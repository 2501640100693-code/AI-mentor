"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getOrCreateStudentId } from "@/lib/studentId";
import type { LearnerProfile, LessonPlan, StudyPlan } from "@/lib/types";

const DEFAULT_PROFILE: LearnerProfile = {
  name: "",
  level: "beginner",
  objective: "Understand the core idea well enough to teach it back.",
  knowledge: "I know a little, but I mix up the details.",
  style: "Direct",
  language: "English",
  teaching_via: "prerendered",
  time_budget: "20 minutes",
  topic: "Ohm's Law",
};

type AppState = {
  hydrated: boolean;
  studentId: string;
  profile: LearnerProfile;
  setProfile: (next: LearnerProfile) => void;
  lessonId: string;
  setLessonId: (id: string) => void;
  documentId: string | null;
  setDocumentId: (id: string | null) => void;
  lessonPlan: LessonPlan | null;
  setLessonPlan: (plan: LessonPlan | null) => void;
  studyPlan: StudyPlan | null;
  setStudyPlan: (plan: StudyPlan | null) => void;
  conversationUrl: string;
  setConversationUrl: (url: string) => void;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [profile, setProfile] = useState<LearnerProfile>(DEFAULT_PROFILE);
  const [lessonId, setLessonId] = useState("");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [conversationUrl, setConversationUrl] = useState("");

  useEffect(() => {
    setStudentId(getOrCreateStudentId());
    const saved = window.sessionStorage.getItem("ai_teacher_state");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.profile) setProfile(parsed.profile);
        if (parsed.lessonId) setLessonId(parsed.lessonId);
        if (parsed.documentId) setDocumentId(parsed.documentId);
        if (parsed.lessonPlan) setLessonPlan(parsed.lessonPlan);
        if (parsed.studyPlan) setStudyPlan(parsed.studyPlan);
        if (parsed.conversationUrl) setConversationUrl(parsed.conversationUrl);
      } catch {
        /* ignore corrupt session */
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !studentId) return;
    window.sessionStorage.setItem(
      "ai_teacher_state",
      JSON.stringify({
        profile,
        lessonId,
        documentId,
        lessonPlan,
        studyPlan,
        conversationUrl,
      }),
    );
  }, [hydrated, studentId, profile, lessonId, documentId, lessonPlan, studyPlan, conversationUrl]);

  const value = useMemo(
    () => ({
      hydrated,
      studentId,
      profile,
      setProfile,
      lessonId,
      setLessonId,
      documentId,
      setDocumentId,
      lessonPlan,
      setLessonPlan,
      studyPlan,
      setStudyPlan,
      conversationUrl,
      setConversationUrl,
    }),
    [hydrated, studentId, profile, lessonId, documentId, lessonPlan, studyPlan, conversationUrl],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
