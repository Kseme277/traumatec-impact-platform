import { apiFetch } from "./client";

export interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TeacherListResponse {
  items: Teacher[];
  total: number;
}

export function fetchTeachers(token: string | null, options?: { q?: string; activeOnly?: boolean }) {
  const params = new URLSearchParams({ active_only: String(options?.activeOnly ?? true) });
  if (options?.q) params.set("q", options.q);
  return apiFetch<TeacherListResponse>(`/v1/teachers/?${params}`, token);
}

export interface TeacherPayload {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  is_active?: boolean;
}

export function createTeacher(token: string | null, payload: TeacherPayload) {
  return apiFetch<Teacher>("/v1/teachers/", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTeacher(token: string | null, id: string, payload: Partial<TeacherPayload>) {
  return apiFetch<Teacher>(`/v1/teachers/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export interface TeacherSyncResult {
  processed: number;
  teachers_created: number;
  event_links_created: number;
}

export function syncTeachersFromParticipants(token: string | null) {
  return apiFetch<TeacherSyncResult>("/v1/teachers/sync-from-participants", token, {
    method: "POST",
  });
}

export function teacherLabel(teacher: Teacher): string {
  const name = `${teacher.first_name} ${teacher.last_name}`.trim();
  if (teacher.email) return `${name} — ${teacher.email}`;
  return name;
}
