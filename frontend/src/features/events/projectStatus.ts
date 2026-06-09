export type AoProjectStatus = "Open" | "Closed" | "Cancelled";

const FINISHED_STATUSES = new Set(["closed", "cancelled", "canceled", "cloture", "clôturé", "annule", "annulé"]);
const OPEN_STATUSES = new Set(["open", "ouvert", "en cours"]);
const CANCELLED_STATUSES = new Set(["cancelled", "canceled", "annule", "annulé"]);
const CLOSED_STATUSES = new Set(["closed", "cloture", "clôturé"]);

export function normalizeProjectStatus(value: string | null | undefined): AoProjectStatus | null {
  if (!value?.trim()) return null;
  const key = value.trim().toLowerCase();
  if (OPEN_STATUSES.has(key) || key === "open") return "Open";
  if (CANCELLED_STATUSES.has(key)) return "Cancelled";
  if (CLOSED_STATUSES.has(key) || key === "closed") return "Closed";
  if (key.includes("cancel")) return "Cancelled";
  if (key.includes("clos") || key.includes("clotur")) return "Closed";
  if (key.includes("open") || key.includes("ouvert")) return "Open";
  return null;
}

export function isEventFinished(projectStatus: string | null | undefined): boolean {
  if (!projectStatus?.trim()) return false;
  return FINISHED_STATUSES.has(projectStatus.trim().toLowerCase());
}

export function isEventOpen(projectStatus: string | null | undefined): boolean {
  return normalizeProjectStatus(projectStatus) === "Open";
}

export function isEventCancelled(projectStatus: string | null | undefined): boolean {
  return normalizeProjectStatus(projectStatus) === "Cancelled";
}

export function projectStatusLabel(
  projectStatus: string | null | undefined,
  t?: (key: string) => string,
): string {
  const normalized = normalizeProjectStatus(projectStatus);
  if (t) {
    if (normalized === "Open") return t("events.statusOpen");
    if (normalized === "Closed") return t("events.statusClosed");
    if (normalized === "Cancelled") return t("events.statusCancelled");
    return projectStatus?.trim() || t("common.notDefined");
  }
  if (normalized === "Open") return "Ouvert";
  if (normalized === "Closed") return "Terminé";
  if (normalized === "Cancelled") return "Annulé";
  return projectStatus?.trim() || "Non défini";
}

export function projectStatusColor(
  projectStatus: string | null | undefined,
): "primary" | "success" | "warning" | "error" | "info" | "light" {
  const normalized = normalizeProjectStatus(projectStatus);
  if (normalized === "Open") return "warning";
  if (normalized === "Closed") return "success";
  if (normalized === "Cancelled") return "error";
  return "light";
}

export type CalendarChipTone = "Primary" | "Success" | "Danger" | "Warning";

export function calendarChipToneForProjectStatus(
  projectStatus: string | null | undefined,
): CalendarChipTone {
  const normalized = normalizeProjectStatus(projectStatus);
  if (normalized === "Closed") return "Success";
  if (normalized === "Cancelled") return "Danger";
  if (normalized === "Open") return "Primary";
  return "Warning";
}

/** @deprecated Use calendarChipToneForProjectStatus + eventContent renderer */
export function calendarClassForProjectStatus(projectStatus: string | null | undefined): string {
  const normalized = normalizeProjectStatus(projectStatus);
  if (normalized === "Closed") return "!bg-success-500 !border-success-500";
  if (normalized === "Cancelled") return "!bg-gray-400 !border-gray-400 line-through";
  if (normalized === "Open") return "!bg-brand-500 !border-brand-500";
  return "!bg-blue-light-500 !border-blue-light-500";
}

export function getProjectStatusFilterOptions(t: (key: string) => string) {
  return [
    { value: "", label: t("events.filterAllStatuses") },
    { value: "Open", label: t("events.statusOpen") },
    { value: "Closed", label: t("events.statusClosedFull") },
    { value: "Cancelled", label: t("events.statusCancelled") },
  ];
}

export function getProjectStatusFormOptions(t: (key: string) => string) {
  return [
    { value: "Open", label: t("events.statusOpenFull") },
    { value: "Closed", label: t("events.statusClosedFull") },
    { value: "Cancelled", label: t("events.statusCancelledFull") },
  ];
}

/** @deprecated Use getProjectStatusFilterOptions(t) */
export const projectStatusFilterOptions = [
  { value: "", label: "Tous les statuts" },
  { value: "Open", label: "Ouvert" },
  { value: "Closed", label: "Terminé (Closed)" },
  { value: "Cancelled", label: "Annulé" },
];

/** @deprecated Use getProjectStatusFormOptions(t) */
export const projectStatusFormOptions = [
  { value: "Open", label: "Ouvert (Open)" },
  { value: "Closed", label: "Terminé (Closed)" },
  { value: "Cancelled", label: "Annulé (Cancelled)" },
];
