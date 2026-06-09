import type { Evenement, PreparationTheme } from "./types";

/** Options pour formulaires (valeur vide = non défini). */
export const themeFormOptions = [
  { value: "", label: "— Non défini —" },
  { value: "operatory", label: "Operatory" },
  { value: "pbo", label: "PBO" },
  { value: "iec", label: "IEC" },
];

/** Options obligatoires (génération de paquet). */
export const themeRequiredOptions = [
  { value: "operatory", label: "Operatory (CHI)" },
  { value: "pbo", label: "PBO" },
  { value: "iec", label: "IEC" },
];

export function isPreparationTheme(value: string): value is PreparationTheme {
  return value === "operatory" || value === "pbo" || value === "iec";
}

/** Thème suggéré : fiche événement, puis titre/activité, puis inférence paquet (IA). */
export function suggestPreparationTheme(event: Pick<Evenement, "preparation_theme" | "event_type" | "title" | "inferred_package">): PreparationTheme | "" {
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
  if (
    text.includes("nonop")
    || text.includes("non-op")
    || text.includes("non op")
    || text.includes("cours non")
  ) {
    return "operatory";
  }
  if (text.includes("orp") || text.includes("pbo") || text.includes("operating room")) {
    return "pbo";
  }
  if (
    text.includes("operatory")
    || text.includes("op c")
    || text.includes("cmf")
    || text.includes("fracture")
  ) {
    return "operatory";
  }

  const fromInference = event.inferred_package?.preparation_theme;
  if (fromInference && isPreparationTheme(fromInference)) {
    return fromInference;
  }
  return "";
}
