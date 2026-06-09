/** Types d'événement AO Alliance — cours, séminaire, faculty (format paquet). */

export type ActivityKind = "cours" | "seminaire" | "faculty";

export interface EventPackageType {
  code: string;
  label: string;
  activity_kind: ActivityKind;
  activity_label: string;
  title: string;
  description: string;
  preparation_theme: string;
  duration_days: number;
}

export type EventPackageTypeCatalog = Record<ActivityKind, EventPackageType[]>;

export const ACTIVITY_KINDS: ActivityKind[] = ["cours", "seminaire", "faculty"];

export const FALLBACK_PACKAGE_TYPES: EventPackageTypeCatalog = {
  cours: [
    {
      code: "ORP_C",
      label: "ORP C",
      activity_kind: "cours",
      activity_label: "Cours",
      title: "Cours ORP — PBO (3 jours)",
      description: "Cours AO Alliance PBO sur plusieurs jours.",
      preparation_theme: "pbo",
      duration_days: 3,
    },
    {
      code: "OP_C",
      label: "Op C",
      activity_kind: "cours",
      activity_label: "Cours",
      title: "Cours opératoire — Op C",
      description: "Cours en bloc opératoire (fractures).",
      preparation_theme: "operatory",
      duration_days: 3,
    },
    {
      code: "NONOP_C",
      label: "NonOp C",
      activity_kind: "cours",
      activity_label: "Cours",
      title: "Cours non opératoire — NonOp C",
      description: "Cours hors bloc (traitement non opératoire).",
      preparation_theme: "operatory",
      duration_days: 3,
    },
  ],
  seminaire: [
    {
      code: "ORP_S",
      label: "ORP S",
      activity_kind: "seminaire",
      activity_label: "Séminaire",
      title: "Séminaire ORP — PBO (1 jour)",
      description: "Séminaire salle opératoire PBO, format court.",
      preparation_theme: "pbo",
      duration_days: 1,
    },
    {
      code: "IEC_S",
      label: "IEC S",
      activity_kind: "seminaire",
      activity_label: "Séminaire",
      title: "Séminaire IEC — IEC S",
      description: "Séminaire IEC (éducation continue).",
      preparation_theme: "iec",
      duration_days: 1,
    },
  ],
  faculty: [
    {
      code: "FET",
      label: "Faculty ET",
      activity_kind: "faculty",
      activity_label: "Faculty Education Training",
      title: "Faculty Education Training — FET",
      description: "Formation Faculty Education Training (paquet documentaire 3 jours).",
      preparation_theme: "operatory",
      duration_days: 3,
    },
  ],
};

/** Fusionne le catalogue API avec le fallback (types récents toujours visibles). */
export function mergePackageCatalog(api: Partial<EventPackageTypeCatalog>): EventPackageTypeCatalog {
  const result = {} as EventPackageTypeCatalog;
  for (const kind of ACTIVITY_KINDS) {
    const apiItems = api[kind] ?? [];
    const fallbackItems = FALLBACK_PACKAGE_TYPES[kind] ?? [];
    const seen = new Set(apiItems.map((item) => item.code));
    result[kind] = [
      ...apiItems,
      ...fallbackItems.filter((item) => !seen.has(item.code)),
    ];
  }
  return result;
}

export function findPackageType(
  catalog: EventPackageTypeCatalog,
  code: string,
): EventPackageType | undefined {
  for (const group of Object.values(catalog)) {
    const found = group.find((t) => t.code === code);
    if (found) return found;
  }
  return undefined;
}

export function activityTabForKind(kind: string): ActivityKind {
  if (kind === "seminaire") return "seminaire";
  if (kind === "faculty") return "faculty";
  return "cours";
}
