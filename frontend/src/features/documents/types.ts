export interface ParcoursStep {
  step: number;
  code: string;
  name: string;
  template_id: string;
  file_format: string;
}

export interface PackageTemplate {
  id: string;
  code: string;
  name: string;
  document_type: string;
  file_path: string;
  version: number;
  placeholders: Record<string, unknown> | null;
  preparation_themes: string[] | null;
  is_active: boolean;
  created_at: string;
}

export interface TemplateUploadResult {
  template: PackageTemplate;
  message: string;
}

export interface TemplateEditorConfig {
  document_server_url: string;
  config: Record<string, unknown>;
}

export interface Parcours {
  code: string;
  name: string;
  preparation_theme: string;
  package_type?: string | null;
  event_type_label?: string | null;
  activity_kind?: string | null;
  activity_label?: string | null;
  file_count?: number;
  seminar_count: number;
  steps: ParcoursStep[];
}

export interface PackageBundle {
  id: string;
  package_type: string;
  version: number;
  label: string;
  source_zip_name: string | null;
  file_count: number;
  analysis_json: Record<string, unknown> | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface PackageUploadResult {
  bundle: PackageBundle;
  message: string;
  analysis: {
    package_type: string;
    event_type_label: string;
    activity_kind?: string;
    preparation_theme: string;
    confidence: number;
    replacement_model?: Record<string, unknown>;
  };
}

export type PackageImportJobStatus = "pending" | "analyzing" | "saving" | "completed" | "failed";

export interface PackageImportJobStart {
  job_id: string;
  filename: string;
}

export interface PackageImportProgress {
  job_id: string;
  status: PackageImportJobStatus;
  phase: string;
  processed: number;
  total: number;
  percent: number;
  message: string;
  filename: string;
  current_file: string | null;
  use_ai: boolean;
  result: PackageUploadResult | null;
  error: string | null;
}

export type GenerationJobStatus = "queued" | "running" | "completed" | "failed";

export type WorkflowStatus =
  | "generated"
  | "submitted"
  | "under_procedure_review"
  | "procedure_rejected"
  | "procedure_approved"
  | "under_final_validation"
  | "validator_rejected"
  | "approved";

export interface GenerationLogEntry {
  at: string;
  level: string;
  message: string;
}

export interface GenerationJob {
  id: string;
  event_id: string;
  status: GenerationJobStatus;
  workflow_status?: WorkflowStatus;
  zip_filename: string | null;
  zip_available?: boolean;
  certificate_count: number;
  error_message: string | null;
  logs?: GenerationLogEntry[];
  created_at: string;
  completed_at: string | null;
}

export interface GenerationStart {
  job_id: string;
  status: string;
  message: string;
}

export function jobStatusLabel(status: GenerationJobStatus, t?: (key: string) => string): string {
  const keys: Record<GenerationJobStatus, string> = {
    queued: "documents.jobQueued",
    running: "documents.jobRunningStatus",
    completed: "documents.jobCompleted",
    failed: "documents.jobFailed",
  };
  if (t) return t(keys[status]) ?? status;
  const labels: Record<GenerationJobStatus, string> = {
    queued: "En file",
    running: "En cours",
    completed: "Terminé",
    failed: "Échec",
  };
  return labels[status] ?? status;
}

export function jobStatusColor(status: GenerationJobStatus): "success" | "warning" | "error" | "info" {
  if (status === "completed") return "success";
  if (status === "failed") return "error";
  if (status === "running") return "warning";
  return "info";
}
