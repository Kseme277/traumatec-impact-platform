import { apiFetch } from "./client";

export interface AuditLog {
  id: string;
  actor_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditExportFile {
  id: string;
  storage_key: string;
  period_start: string;
  period_end: string;
  record_count: number;
  file_size_bytes: number;
  created_at: string;
}

export interface AuditExportConfig {
  interval_hours: number;
  enabled: boolean;
  last_run_at: string | null;
  updated_at: string;
}

export function fetchAuditEvents(token: string | null, query?: string) {
  const q = query?.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
  return apiFetch<AuditLog[]>(`/v1/audit/events${q}`, token);
}

export function fetchAuditExports(token: string | null) {
  return apiFetch<AuditExportFile[]>("/v1/audit/exports", token);
}

export function fetchAuditConfig(token: string | null) {
  return apiFetch<AuditExportConfig>("/v1/audit/config", token);
}

export function updateAuditConfig(
  token: string | null,
  payload: { interval_hours: number; enabled: boolean },
) {
  return apiFetch<AuditExportConfig>("/v1/audit/config", token, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function runAuditExport(token: string | null) {
  return apiFetch<AuditExportFile>("/v1/audit/exports/run", token, { method: "POST" });
}

export async function downloadAuditExport(token: string | null, exportId: string, filename: string) {
  const response = await fetch(`/api/v1/audit/exports/${exportId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error("Téléchargement impossible");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
