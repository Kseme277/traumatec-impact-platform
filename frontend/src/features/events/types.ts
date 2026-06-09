export type EventStatus = "imported" | "in_progress" | "ready" | "generated" | "error";
export type PreparationTheme = "operatory" | "pbo" | "iec";

export interface InferredEventPackage {
  package_type: string;
  package_label: string;
  activity_kind: string;
  activity_label: string;
  preparation_theme: PreparationTheme | null;
  duration_days: number;
  expected_package_days: number;
  classifier?: "rules" | "nvidia" | string;
  confidence?: number | null;
}

export interface Evenement {
  id: string;
  project_number: string;
  title: string;
  event_type: string | null;
  preparation_theme: PreparationTheme | null;
  country: string | null;
  city: string | null;
  region: string | null;
  responsible_person: string | null;
  project_status: string | null;
  cost_center?: string | null;
  participants_expected?: number | null;
  participants_real?: number | null;
  amount_chf?: number | string | null;
  payments_done_chf?: number | string | null;
  percent_paid?: number | string | null;
  balance_to_pay_chf?: number | string | null;
  start_date: string | null;
  end_date: string | null;
  status: EventStatus;
  metadata_json?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  inferred_package?: InferredEventPackage | null;
}

export interface EvenementPayload {
  project_number: string;
  title: string;
  event_type?: string | null;
  preparation_theme?: PreparationTheme | null;
  country?: string | null;
  city?: string | null;
  region?: string | null;
  responsible_person?: string | null;
  responsible_email?: string | null;
  responsible_phone?: string | null;
  project_status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: EventStatus;
}

export interface EvenementListResponse {
  items: Evenement[];
  total: number;
}

export type EventSortField =
  | "start_date"
  | "title"
  | "project_number"
  | "country"
  | "city"
  | "amount_chf"
  | "project_status"
  | "responsible_person"
  | "created_at";

export type EventSortDir = "asc" | "desc";

export interface EvenementFilters {
  q?: string;
  status?: EventStatus | "";
  project_status?: string;
  event_type?: string;
  country?: string;
  sort_by?: EventSortField;
  sort_dir?: EventSortDir;
  /** Uniquement événements dont la date de fin (ou début) n'est pas passée */
  upcoming?: boolean;
}

export interface ImportResult {
  import_id: string;
  filename: string;
  year: number;
  imported_count: number;
  skipped_count: number;
  errors: string[];
}

export type ImportJobStatus = "pending" | "parsing" | "importing" | "completed" | "failed";

export interface ImportJobStart {
  job_id: string;
  filename: string;
}

export interface ImportJobProgress {
  job_id: string;
  status: ImportJobStatus;
  phase: string;
  processed: number;
  total: number;
  percent: number;
  message: string;
  filename: string;
  result: ImportResult | null;
  error: string | null;
}

export interface DashboardFinancialStats {
  total_amount_chf: number;
  total_payments_chf: number;
  total_balance_chf: number;
  events_with_amount: number;
  avg_percent_paid: number | null;
}

export interface DashboardParticipantsStats {
  expected_total: number;
  real_total: number;
  events_with_participants: number;
}

export interface DashboardEventStats {
  total: number;
  active: number;
  closed: number;
  open_count?: number;
  closed_count?: number;
  cancelled_count?: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  by_country: Record<string, number>;
  by_project_status?: Record<string, number>;
  by_region?: Record<string, number>;
  financial?: DashboardFinancialStats;
  participants?: DashboardParticipantsStats;
  calendar: Array<{
    id: string;
    title: string;
    project_number: string;
    event_type: string | null;
    start: string;
    end: string;
    status: EventStatus;
    responsible_person: string | null;
    city: string | null;
    country: string | null;
    region: string | null;
    project_status: string | null;
  }>;
  calendar_year: number;
}

export function statusLabel(status: EventStatus, t?: (key: string) => string): string {
  const keys: Record<EventStatus, string> = {
    imported: "events.tipImported",
    in_progress: "events.tipInProgress",
    ready: "events.tipReady",
    generated: "events.tipGenerated",
    error: "events.tipError",
  };
  if (t) return t(keys[status]);
  const labels: Record<EventStatus, string> = {
    imported: "Importé",
    in_progress: "En cours",
    ready: "Prêt",
    generated: "Clôturé",
    error: "Erreur",
  };
  return labels[status];
}

export function statusColor(status: EventStatus): "primary" | "success" | "warning" | "error" | "info" | "light" {
  const colors: Record<EventStatus, "primary" | "success" | "warning" | "error" | "info" | "light"> = {
    imported: "info",
    in_progress: "warning",
    ready: "primary",
    generated: "success",
    error: "error",
  };
  return colors[status];
}

export function themeLabel(theme: PreparationTheme | null): string {
  if (!theme) return "—";
  const labels: Record<PreparationTheme, string> = {
    operatory: "Operatory",
    pbo: "PBO",
    iec: "IEC",
  };
  return labels[theme];
}
