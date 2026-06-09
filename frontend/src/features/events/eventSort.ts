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

export const DEFAULT_EVENT_SORT: EventSortField = "start_date";
export const DEFAULT_EVENT_SORT_DIR: EventSortDir = "desc";

export function nextSortDir(currentField: EventSortField, field: EventSortField, currentDir: EventSortDir): EventSortDir {
  if (currentField !== field) {
    return field === "start_date" || field === "amount_chf" || field === "created_at" ? "desc" : "asc";
  }
  return currentDir === "asc" ? "desc" : "asc";
}

export function sortOptionValue(field: EventSortField, dir: EventSortDir): string {
  return `${field}:${dir}`;
}

export function parseSortOption(value: string): { field: EventSortField; dir: EventSortDir } {
  const [field, dir] = value.split(":") as [EventSortField, EventSortDir];
  const safeField: EventSortField = [
    "start_date",
    "title",
    "project_number",
    "country",
    "city",
    "amount_chf",
    "project_status",
    "responsible_person",
    "created_at",
  ].includes(field)
    ? field
    : DEFAULT_EVENT_SORT;
  const safeDir: EventSortDir = dir === "asc" ? "asc" : "desc";
  return { field: safeField, dir: safeDir };
}

export function buildSortSelectOptions(t: (key: string) => string): { value: string; label: string }[] {
  return [
    { value: sortOptionValue("start_date", "desc"), label: t("events.sortStartDateDesc") },
    { value: sortOptionValue("start_date", "asc"), label: t("events.sortStartDateAsc") },
    { value: sortOptionValue("title", "asc"), label: t("events.sortTitleAsc") },
    { value: sortOptionValue("title", "desc"), label: t("events.sortTitleDesc") },
    { value: sortOptionValue("project_number", "asc"), label: t("events.sortProjectAsc") },
    { value: sortOptionValue("project_number", "desc"), label: t("events.sortProjectDesc") },
    { value: sortOptionValue("country", "asc"), label: t("events.sortCountryAsc") },
    { value: sortOptionValue("amount_chf", "desc"), label: t("events.sortBudgetDesc") },
    { value: sortOptionValue("amount_chf", "asc"), label: t("events.sortBudgetAsc") },
    { value: sortOptionValue("project_status", "asc"), label: t("events.sortStatusAsc") },
    { value: sortOptionValue("responsible_person", "asc"), label: t("events.sortResponsibleAsc") },
  ];
}
