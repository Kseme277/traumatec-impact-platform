import { apiFetch, ApiError } from "./client";
import type {
  DashboardEventStats,
  Evenement,
  EvenementFilters,
  EvenementListResponse,
  EvenementPayload,
  ImportJobProgress,
  ImportJobStart,
  ImportResult,
} from "../features/events/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";
const IMPORT_POLL_INTERVAL_MS = 500;

async function parseApiError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string | { msg?: string }[] };
    if (typeof body.detail === "string") {
      return body.detail;
    }
    if (Array.isArray(body.detail) && body.detail[0]?.msg) {
      return body.detail[0].msg;
    }
  } catch {
    if (response.status >= 500) {
      return "Erreur serveur. Consultez les logs du service events.";
    }
  }
  return fallback;
}

export async function startAnnualPlanImport(
  token: string | null,
  file: File,
): Promise<ImportJobStart> {
  const formData = new FormData();
  formData.append("file", file);

  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}/v1/imports/annual-plan`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    throw new ApiError(await parseApiError(response, "Import impossible"), response.status);
  }

  return response.json() as Promise<ImportJobStart>;
}

export async function fetchImportJobProgress(jobId: string): Promise<ImportJobProgress> {
  const response = await fetch(`${API_BASE}/v1/imports/annual-plan/jobs/${jobId}`);

  if (!response.ok) {
    throw new ApiError(await parseApiError(response, "Suivi d'import impossible"), response.status);
  }

  return response.json() as Promise<ImportJobProgress>;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function importAnnualPlan(
  getToken: () => Promise<string | null>,
  file: File,
  onProgress?: (progress: ImportJobProgress) => void,
): Promise<ImportResult> {
  onProgress?.({
    job_id: "",
    status: "pending",
    phase: "upload",
    processed: 0,
    total: 0,
    percent: 0,
    message: "Envoi du fichier…",
    filename: file.name,
    result: null,
    error: null,
  });

  const uploadToken = await getToken();
  if (!uploadToken) {
    throw new ApiError(
      "Impossible d'obtenir un jeton Clerk. Reconnectez-vous puis réessayez l'import.",
      401,
    );
  }

  let jobId: string;
  const start = await startAnnualPlanImport(uploadToken, file);
  jobId = start.job_id;

  for (;;) {
    let progress: ImportJobProgress;
    try {
      progress = await fetchImportJobProgress(jobId);
    } catch (err) {
      const fallback = await fetchImportJobProgress(jobId).catch(() => null);
      if (fallback?.status === "completed" && fallback.result) {
        return fallback.result;
      }
      throw err;
    }

    onProgress?.(progress);

    if (progress.status === "completed" && progress.result) {
      return progress.result;
    }

    if (progress.status === "failed") {
      throw new ApiError(progress.error ?? progress.message ?? "Import impossible", 500);
    }

    await wait(IMPORT_POLL_INTERVAL_MS);
  }
}

function buildQuery(filters: EvenementFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.project_status) params.set("project_status", filters.project_status);
  if (filters.event_type) params.set("event_type", filters.event_type);
  if (filters.country) params.set("country", filters.country);
  if (filters.upcoming) params.set("upcoming", "true");
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function fetchEvents(token: string | null, filters?: EvenementFilters) {
  const query = buildQuery(filters);
  const path = query ? `/v1/events/${query}` : "/v1/events/";
  return apiFetch<EvenementListResponse>(path, token);
}

export function fetchEventStats(token: string | null) {
  return apiFetch<DashboardEventStats>("/v1/events/stats", token);
}

export function fetchEvent(token: string | null, eventId: string) {
  return apiFetch<Evenement>(`/v1/events/${eventId}`, token);
}

export function createEvent(token: string | null, payload: EvenementPayload) {
  return apiFetch<Evenement>("/v1/events/", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateEvent(token: string | null, eventId: string, payload: Partial<EvenementPayload>) {
  return apiFetch<Evenement>(`/v1/events/${eventId}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function closeEvent(token: string | null, eventId: string) {
  return apiFetch<Evenement>(`/v1/events/${eventId}/close`, token, {
    method: "POST",
  });
}

export function deleteEvent(token: string | null, eventId: string) {
  return apiFetch<void>(`/v1/events/${eventId}`, token, {
    method: "DELETE",
  });
}
