import { apiFetch } from "./client";
import type { RoleUtilisateur, Utilisateur, WorkflowStatus } from "../features/auth/types";

export interface WorkflowFileReview {
  id: string;
  generation_job_id: string;
  template_id: string | null;
  template_code: string;
  file_path: string | null;
  status: "pending" | "approved" | "rejected";
  comment: string | null;
  reviewed_by_id: number | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface WorkflowStep {
  id: string;
  generation_job_id: string;
  step: string;
  action: string;
  actor_id: number | null;
  actor_name: string | null;
  comment: string | null;
  created_at: string;
}

export interface WorkflowState {
  job_id: string;
  event_id: string;
  event_title: string | null;
  project_number: string | null;
  status: string;
  workflow_status: WorkflowStatus;
  assigned_reviewer_id: number | null;
  assigned_validator_id: number | null;
  requested_by_id: number;
  zip_filename: string | null;
  files: WorkflowFileReview[];
  history: WorkflowStep[];
  phase_started_at?: string | null;
  phase_due_at?: string | null;
  is_overdue?: boolean;
}

export interface WorkflowQueueItem {
  id: string;
  event_id: string;
  workflow_status: WorkflowStatus;
  status: string;
  zip_filename: string | null;
  created_at: string;
  completed_at: string | null;
  requested_by_id: number;
  assigned_reviewer_id: number | null;
  event_title: string | null;
  project_number: string | null;
  phase_started_at?: string | null;
  phase_due_at?: string | null;
  is_overdue?: boolean;
  organizer_responsible_user_id?: number | null;
}

export interface WorkflowStats {
  generated: number;
  submitted: number;
  under_procedure_review: number;
  procedure_rejected: number;
  procedure_approved: number;
  under_final_validation: number;
  validator_rejected: number;
  approved: number;
  assigned_to_me: number;
  overdue: number;
}

export function fetchWorkflowStats(
  token: string | null,
  role: RoleUtilisateur | "admin" | "support" | "controle" | "validateur",
) {
  return apiFetch<WorkflowStats>(`/v1/workflow/stats?role=${role}`, token);
}

export function fetchWorkflowQueue(token: string | null, role: string, limit = 50, queueScope = "pending") {
  return apiFetch<WorkflowQueueItem[]>(
    `/v1/workflow/queue?role=${role}&limit=${limit}&queue_scope=${queueScope}`,
    token,
  );
}

export function fetchWorkflowState(token: string | null, jobId: string) {
  return apiFetch<WorkflowState>(`/v1/generations/${jobId}/workflow`, token);
}

export function submitPackage(token: string | null, jobId: string, reviewerId: number) {
  return apiFetch<{ workflow: WorkflowState; message?: string }>(`/v1/generations/${jobId}/submit`, token, {
    method: "POST",
    body: JSON.stringify({ reviewer_id: reviewerId }),
  });
}

export function assignReviewer(token: string | null, jobId: string, reviewerId?: number) {
  return apiFetch<WorkflowState>(`/v1/generations/${jobId}/assign-reviewer`, token, {
    method: "POST",
    body: JSON.stringify({ reviewer_id: reviewerId ?? null }),
  });
}

export function reviewFile(
  token: string | null,
  jobId: string,
  templateCode: string,
  status: "approved" | "rejected",
  comment?: string,
) {
  return apiFetch<WorkflowState>(
    `/v1/generations/${jobId}/files/${encodeURIComponent(templateCode)}/review`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ status, comment: comment ?? null }),
    },
  );
}

export function saveFileComment(
  token: string | null,
  jobId: string,
  templateCode: string,
  comment: string | null,
) {
  return apiFetch<WorkflowState>(
    `/v1/generations/${jobId}/files/${encodeURIComponent(templateCode)}/comment`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ comment }),
    },
  );
}

export function completeProcedure(token: string | null, jobId: string, validatorId: number) {
  return apiFetch<WorkflowState>(`/v1/generations/${jobId}/procedure/complete`, token, {
    method: "POST",
    body: JSON.stringify({ validator_id: validatorId }),
  });
}

export function rejectProcedure(token: string | null, jobId: string, comment: string) {
  return apiFetch<WorkflowState>(`/v1/generations/${jobId}/procedure/reject`, token, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
}

export function approveValidator(token: string | null, jobId: string) {
  return apiFetch<WorkflowState>(`/v1/generations/${jobId}/validator/approve`, token, { method: "POST" });
}

export function rejectValidator(token: string | null, jobId: string, comment: string) {
  return apiFetch<WorkflowState>(`/v1/generations/${jobId}/validator/reject`, token, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
}

export function fetchDeliveryMailto(token: string | null, jobId: string) {
  return apiFetch<{ mailto_url: string; recipient_email: string; subject: string }>(
    `/v1/generations/${jobId}/delivery-mailto`,
    token,
  );
}

export interface PackageFileEditorConfig {
  document_server_url: string;
  config: Record<string, unknown>;
}

export function fetchPackageFileEditorConfig(
  token: string | null,
  jobId: string,
  templateCode: string,
  mode: "view" | "edit" = "view",
) {
  const query = mode === "edit" ? "?mode=edit" : "";
  return apiFetch<PackageFileEditorConfig>(
    `/v1/generations/${jobId}/files/${encodeURIComponent(templateCode)}/editor-config${query}`,
    token,
  );
}

export async function downloadPackageFile(
  token: string | null,
  jobId: string,
  templateCode: string,
) {
  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(
    `${API_BASE}/v1/generations/${jobId}/files/${encodeURIComponent(templateCode)}/download`,
    { headers },
  );
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
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? templateCode;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function fetchUsersDirectory(token: string | null) {
  return apiFetch<Utilisateur[]>("/v1/notifications/directory", token);
}

export function fetchUsersByRole(token: string | null, role: RoleUtilisateur) {
  return apiFetch<Utilisateur[]>(`/v1/users/by-role/${role}`, token);
}
