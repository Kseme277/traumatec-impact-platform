/** Types d'activité AO (alignés sur l'import Excel et package_types). */
export const EVENT_TYPE_OPTIONS = [
  { value: "Course", label: "Course (Cours)" },
  { value: "Seminar", label: "Seminar (Séminaire)" },
  { value: "Faculty Education Training", label: "Faculty Education Training (FET)" },
  { value: "Workshop", label: "Workshop" },
  { value: "Symposium", label: "Symposium" },
] as const;

export function buildEventTypeOptions(current?: string | null): { value: string; label: string }[] {
  const base = EVENT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
  const normalized = (current ?? "").trim();
  if (!normalized) return [{ value: "", label: "—" }, ...base];
  const exists = base.some(
    (o) => o.value.toLowerCase() === normalized.toLowerCase() || o.label.toLowerCase().includes(normalized.toLowerCase()),
  );
  if (exists) return [{ value: "", label: "—" }, ...base];
  return [{ value: "", label: "—" }, { value: normalized, label: normalized }, ...base];
}

export function matchEventTypeOption(value: string | null | undefined): string {
  if (!value) return "";
  return value.trim();
}
