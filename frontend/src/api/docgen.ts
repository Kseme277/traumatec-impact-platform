import { ApiError } from "./client";
import { getApiToken } from "../lib/clerkToken";
import type { GenerationJob, GenerationStart } from "../features/documents/types";
import type { useAuth } from "@clerk/clerk-react";

type GetTokenFn = ReturnType<typeof useAuth>["getToken"];

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";
const POLL_INTERVAL_MS = 800;

export function startPackageGeneration(token: string | null, eventId: string) {
  return fetchJson<GenerationStart>(`/v1/generations/events/${eventId}`, token, {
    method: "POST",
  });
}

export function fetchGenerationJob(token: string | null, jobId: string) {
  return fetchJson<GenerationJob>(`/v1/generations/${jobId}`, token);
}

export function fetchGenerationHistory(token: string | null, eventId: string) {
  return fetchJson<GenerationJob[]>(`/v1/generations/events/${eventId}/history`, token);
}

async function fetchJson<T>(path: string, token: string | null, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!response.ok) {
    let detail = "Une erreur est survenue";
    try {
      const body = (await response.json()) as { detail?: string };
      detail = body.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, response.status);
  }

  return response.json() as Promise<T>;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function fetchJobWithRefresh(
  getToken: GetTokenFn,
  jobId: string,
): Promise<{ job: GenerationJob; token: string }> {
  let token = await getApiToken(getToken);
  if (!token) {
    throw new ApiError("Session expirée. Reconnectez-vous.", 401);
  }

  try {
    const job = await fetchGenerationJob(token, jobId);
    return { job, token };
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) {
      throw err;
    }
    token = await getApiToken(getToken);
    if (!token) {
      throw new ApiError("Session expirée. Reconnectez-vous.", 401);
    }
    const job = await fetchGenerationJob(token, jobId);
    return { job, token };
  }
}

export async function runPackageGeneration(
  getToken: GetTokenFn,
  eventId: string,
  onProgress?: (job: GenerationJob) => void,
): Promise<GenerationJob> {
  let token = await getApiToken(getToken);
  if (!token) {
    throw new ApiError("Session expirée. Reconnectez-vous.", 401);
  }

  let start: GenerationStart;
  try {
    start = await startPackageGeneration(token, eventId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      token = await getApiToken(getToken);
      if (!token) {
        throw new ApiError("Session expirée. Reconnectez-vous.", 401);
      }
      start = await startPackageGeneration(token, eventId);
    } else {
      throw err;
    }
  }

  let { job } = await fetchJobWithRefresh(getToken, start.job_id);
  onProgress?.(job);

  while (job.status === "queued" || job.status === "running") {
    await wait(POLL_INTERVAL_MS);
    ({ job } = await fetchJobWithRefresh(getToken, start.job_id));
    onProgress?.(job);
  }

  return job;
}

export async function downloadGenerationZip(
  token: string | null,
  jobId: string,
  filename: string,
): Promise<void> {
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}/v1/generations/${jobId}/download`, { headers });

  if (!response.ok) {
    let detail = "Téléchargement impossible";
    try {
      const body = (await response.json()) as { detail?: string };
      detail = body.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, response.status);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename || "paquet.zip";
  anchor.click();
  URL.revokeObjectURL(url);
}
