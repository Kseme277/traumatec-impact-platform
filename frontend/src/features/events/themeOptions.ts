import type { Evenement, PreparationTheme } from "./types";

export type ActivityKind = "cours" | "seminaire" | "faculty";

export interface ThemeFormOption {
  value: string;
  label: string;
  packageType?: string;
}

function eventDays(start: string | null | undefined, end: string | null | undefined): number {
  if (!start) return 1;
  const startD = new Date(`${start}T12:00:00`);
  const endD = new Date(`${(end || start)}T12:00:00`);
  if (Number.isNaN(startD.getTime()) || Number.isNaN(endD.getTime())) return 1;
  return Math.max(1, Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1);
}

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function inferActivityKind(event: {
  event_type?: string | null;
  title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}): ActivityKind {
  const text = norm(`${event.event_type ?? ""} ${event.title ?? ""}`);
  const activity = norm(event.event_type);
  const days = eventDays(event.start_date, event.end_date);

  if (
    activity.includes("faculty")
    || text.includes("faculty education training")
    || text.includes("faculty education")
    || text.includes("faculty training")
    || text.includes("formation faculty")
    || /\bfet\b/.test(text)
  ) {
    return "faculty";
  }
  if (
    activity.includes("seminar")
    || activity.includes("seminaire")
    || text.includes("seminaire")
    || text.includes("séminaire")
    || text.includes("seminar")
  ) {
    return "seminaire";
  }
  if (activity.includes("course") || activity.includes("cours") || text.includes("cours")) {
    return "cours";
  }
  return days <= 1 ? "seminaire" : "cours";
}

/** Options thème/paquet adaptées au format AO (cours, séminaire, faculty). */
export function themeFormOptionsForEvent(
  event: {
    event_type?: string | null;
    title?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  },
  t: (key: string) => string,
): ThemeFormOption[] {
  const kind = inferActivityKind(event);
  const base = [{ value: "", label: t("events.chooseTheme") }];

  if (kind === "faculty") {
    return [
      ...base,
      { value: "", label: t("packages.facultyOnly"), packageType: "FET" },
    ];
  }

  if (kind === "seminaire") {
    return [
      ...base,
      { value: "operatory", label: t("packages.themeOperatorySeminar"), packageType: "OP_S" },
      { value: "pbo", label: t("packages.themePboSeminar"), packageType: "PBO_S" },
      { value: "iec", label: t("packages.themeIecSeminar"), packageType: "IEC_S" },
    ];
  }

  return [
    ...base,
    { value: "operatory", label: t("packages.themeOperatoryCourse"), packageType: "OP_C" },
    { value: "pbo", label: t("packages.themePboCourse"), packageType: "ORP_C" },
    { value: "operatory-nonop", label: t("packages.themeNonopCourse"), packageType: "NONOP_C" },
  ];
}

/** @deprecated Utiliser themeFormOptionsForEvent */
export const themeFormOptions = [
  { value: "", label: "— Non défini —" },
  { value: "operatory", label: "Operatory" },
  { value: "pbo", label: "PBO" },
  { value: "iec", label: "IEC" },
];

export const themeRequiredOptions = [
  { value: "operatory", label: "Operatory (CHI)" },
  { value: "pbo", label: "PBO" },
  { value: "iec", label: "IEC" },
];

export function isPreparationTheme(value: string): value is PreparationTheme {
  return value === "operatory" || value === "pbo" || value === "iec";
}

export function suggestPreparationTheme(
  event: Pick<Evenement, "preparation_theme" | "event_type" | "title" | "inferred_package">,
): PreparationTheme | "" {
  if (event.preparation_theme && isPreparationTheme(event.preparation_theme)) {
    return event.preparation_theme;
  }

  const text = `${event.event_type ?? ""} ${event.title ?? ""}`.toLowerCase();
  if (
    text.includes("iec")
    || text.includes("information education communication")
    || text.includes("éducation et communication")
  ) {
    return "iec";
  }
  if (text.includes("orp") || text.includes("pbo") || text.includes("operating room")) {
    return "pbo";
  }
  if (
    text.includes("operatory")
    || text.includes("op c")
    || text.includes("cmf")
    || text.includes("fracture")
    || text.includes("traumatologie")
  ) {
    return "operatory";
  }

  const fromInference = event.inferred_package?.preparation_theme;
  if (fromInference && isPreparationTheme(fromInference)) {
    return fromInference;
  }
  const suggested = event.inferred_package?.package_candidates?.find((c) => c.suggested);
  if (suggested?.preparation_theme && isPreparationTheme(suggested.preparation_theme)) {
    return suggested.preparation_theme;
  }
  return "";
}

export function packageTypeLabel(code: string, t: (key: string) => string): string {
  const key = `packages.types.${code}`;
  const translated = t(key);
  return translated !== key ? translated : code;
}
