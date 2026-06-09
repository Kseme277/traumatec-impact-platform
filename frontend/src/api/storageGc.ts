import { apiFetch } from "./client";

export interface StorageGcInventory {
  jobs_with_zip: number;
  jobs_eligible: number;
  jobs_purged_history: number;
  retention_days?: number;
  cutoff?: string;
}

export interface StorageGcStats {
  retention_days?: number;
  cutoff?: string;
  jobs_with_zip?: number;
  jobs_eligible?: number;
  jobs_scanned?: number;
  jobs_purged?: number;
  objects_deleted?: number;
  errors?: number;
  forced?: boolean;
  purge_all?: boolean;
  skipped?: boolean;
  reason?: string;
  last_run_at?: string;
}

export interface StorageGcConfig {
  enabled: boolean;
  retention_days: number;
  last_run_at: string | null;
  last_stats: StorageGcStats | null;
  inventory: StorageGcInventory;
}

export interface StorageGcRunResult {
  message: string;
  stats: StorageGcStats;
}

export interface GenerationStatusCount {
  status: string;
  count: number;
}

export interface GenerationMonthCount {
  month: string;
  jobs: number;
  certificates: number;
}

export interface GenerationEventTop {
  event_id: string;
  event_title: string;
  project_number: string;
  jobs: number;
  certificates: number;
}

export interface StorageGcAnalytics {
  total_jobs: number;
  total_certificates: number;
  success_rate: number;
  by_status: GenerationStatusCount[];
  by_month: GenerationMonthCount[];
  top_events: GenerationEventTop[];
  inventory: StorageGcInventory;
}

export function fetchStorageGcAnalytics(token: string | null) {
  return apiFetch<StorageGcAnalytics>("/v1/generations/admin/storage-gc/analytics", token);
}

export function fetchStorageGcConfig(token: string | null) {
  return apiFetch<StorageGcConfig>("/v1/generations/admin/storage-gc/config", token);
}

export function updateStorageGcConfig(
  token: string | null,
  payload: { enabled?: boolean; retention_days?: number },
) {
  return apiFetch<StorageGcConfig>("/v1/generations/admin/storage-gc/config", token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function runStorageGc(token: string | null, options?: { purgeAll?: boolean }) {
  const query = options?.purgeAll ? "?purge_all=true" : "";
  return apiFetch<StorageGcRunResult>(`/v1/generations/admin/storage-gc/run${query}`, token, {
    method: "POST",
  });
}
