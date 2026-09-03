"use client";

export function getOrCreateStudentId(): string {
  if (typeof window === "undefined") return "";
  const key = "ai_teacher_student_id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}
