import { apiFetch, ApiError } from "./client";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

export async function downloadParticipantImportTemplate(token: string | null): Promise<void> {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}/v1/participants/import-template`, { headers });
  if (!response.ok) {
    let detail = "Téléchargement impossible";
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "tip-import-participants-certificats.xlsx";
  anchor.click();
  URL.revokeObjectURL(url);
}

export interface Participant {
  id: string;
  event_id: string;
  full_name: string;
  last_name: string | null;
  first_name: string | null;
  hospital: string | null;
  email: string | null;
  statut: string | null;
  certificate_role: "participant" | "enseignant" | string;
  identity_key: string | null;
  row_number: number | null;
  imported_at: string;
  created_at: string;
}

export interface ParticipantListResponse {
  items: Participant[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ParticipantStats {
  total: number;
  participants: number;
  enseignants: number;
  with_email: number;
  last_imported_at: string | null;
  source_event_title: string | null;
  certificate_title_formatted: string | null;
}

export interface CertificateTitleSuggestion {
  source_event_title: string | null;
  title_suggested: string;
  title_formatted: string | null;
}

export interface ParticipantImportResult {
  imported_count: number;
  skipped_count: number;
  duplicate_in_file_count: number;
  already_in_event_count: number;
  known_from_other_events_count: number;
  enseignants_count: number;
  participants_count: number;
  source_event_title: string | null;
  warnings: string[];
}

export interface ParticipantEventHistoryItem {
  event_id: string;
  participant_id: string;
  project_number: string | null;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
  city: string | null;
  country: string | null;
  certificate_role: string;
}

export interface ParticipantDetail {
  participant: Participant;
  events_participated_count: number;
  events: ParticipantEventHistoryItem[];
}

export type CertificateRoleFilter = "all" | "participant" | "enseignant";

export interface CertificateGeneration {
  id: string;
  event_id: string;
  requested_by_id: number;
  requested_by_name: string | null;
  role_filter: CertificateRoleFilter | string;
  certificate_count: number;
  storage_key: string;
  filename: string;
  created_at: string;
}

export interface CertificateGenerationListResponse {
  items: CertificateGeneration[];
  total: number;
}

export interface CertificateEditorConfig {
  document_server_url: string;
  config: Record<string, unknown>;
}

export interface FetchParticipantsOptions {
  page?: number;
  page_size?: number;
  q?: string;
}

export function fetchParticipants(
  token: string | null,
  eventId: string,
  options: FetchParticipantsOptions = {},
) {
  const params = new URLSearchParams();
  if (options.page) params.set("page", String(options.page));
  if (options.page_size) params.set("page_size", String(options.page_size));
  if (options.q?.trim()) params.set("q", options.q.trim());
  const query = params.toString();
  const path = `/v1/participants/events/${eventId}${query ? `?${query}` : ""}`;
  return apiFetch<ParticipantListResponse>(path, token);
}

export function fetchParticipantDetail(token: string | null, participantId: string) {
  return apiFetch<ParticipantDetail>(`/v1/participants/${participantId}`, token);
}

export function fetchParticipantStats(token: string | null, eventId: string) {
  return apiFetch<ParticipantStats>(`/v1/participants/events/${eventId}/stats`, token);
}

export async function importParticipants(
  token: string | null,
  eventId: string,
  file: File,
): Promise<ParticipantImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";
  const response = await fetch(`${API_BASE}/v1/participants/events/${eventId}/import`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail =
      typeof body.detail === "string" ? body.detail : "Import participants impossible";
    throw new Error(detail);
  }
  return response.json() as Promise<ParticipantImportResult>;
}

export function fetchCertificateGenerations(token: string | null, eventId: string) {
  return apiFetch<CertificateGenerationListResponse>(
    `/v1/certificates/events/${eventId}/generations`,
    token,
  );
}

export function fetchCertificateEditorConfig(token: string | null, generationId: string) {
  return apiFetch<CertificateEditorConfig>(
    `/v1/certificates/generations/${generationId}/editor-config`,
    token,
  );
}

export function fetchCertificateTitleSuggestion(
  token: string | null,
  eventId: string,
  refresh = false,
) {
  const query = refresh ? "?refresh=true" : "";
  return apiFetch<CertificateTitleSuggestion>(
    `/v1/certificates/events/${eventId}/title-suggestion${query}`,
    token,
  );
}

export async function generateCertificates(
  token: string | null,
  eventId: string,
  roleFilter: CertificateRoleFilter = "all",
  eventTitle?: string,
): Promise<CertificateGeneration> {
  return apiFetch<CertificateGeneration>(`/v1/certificates/events/${eventId}/generate`, token, {
    method: "POST",
    body: JSON.stringify({
      role_filter: roleFilter,
      event_title: eventTitle?.trim() || null,
    }),
  });
}

export async function downloadCertificateGeneration(
  token: string | null,
  generationId: string,
  filename: string,
): Promise<void> {
  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";
  const response = await fetch(`${API_BASE}/v1/certificates/generations/${generationId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail =
      typeof body.detail === "string" ? body.detail : "Téléchargement impossible";
    throw new Error(detail);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
