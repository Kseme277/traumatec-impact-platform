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
      code: "OP_S",
      label: "Op S",
      activity_kind: "seminaire",
      activity_label: "Séminaire",
      title: "Séminaire opératoire — Op S (1 jour)",
      description: "Séminaire en bloc opératoire, format court (1 journée).",
      preparation_theme: "operatory",
      duration_days: 1,
    },
    {
      code: "PBO_S",
      label: "PBO S",
      activity_kind: "seminaire",
      activity_label: "Séminaire",
      title: "Séminaire PBO — PBO S (1 jour)",
      description: "Séminaire salle opératoire PBO, format court (1 journée).",
      preparation_theme: "pbo",
      duration_days: 1,
    },
    {
      code: "IEC_S",
      label: "IEC S",
      activity_kind: "seminaire",
      activity_label: "Séminaire",
      title: "Séminaire IEC — IEC S (1 jour)",
      description: "Séminaire IEC (éducation continue), format court (1 journée).",
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
      title: "Faculty Education Training — FET (2 jours)",
      description: "Formation Faculty Education Training (paquet documentaire 2 jours).",
      preparation_theme: "operatory",
      duration_days: 2,
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
    const legacyHidden = new Set(["ORP_S"]);
    result[kind] = [
      ...apiItems.filter((item) => !legacyHidden.has(item.code)),
      ...fallbackItems.filter((item) => !seen.has(item.code)),
    ];
  }
  return result;
}

/** Mappe les codes legacy (ORP_S) vers le type canonique affiché (PBO_S). */
export function canonicalPackageType(code: string): string {
  return code === "ORP_S" ? "PBO_S" : code;
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

/** Tous les types de paquet du catalogue (API + fallback). */
export function allPackageTypesFromCatalog(catalog: EventPackageTypeCatalog): EventPackageType[] {
  return ACTIVITY_KINDS.flatMap((kind) => catalog[kind] ?? []);
}

/** Code paquet canonique pour filtrage (ORP_S → PBO_S). */
export function eventPackageTypeCode(event: {
  inferred_package?: { package_type?: string } | null;
}): string {
  const raw = event.inferred_package?.package_type;
  return raw ? canonicalPackageType(raw) : "";
}

/** Options filtre « type » : tous les paquets catalogue, pas seulement activity_label. */
export function packageTypeFilterOptions(
  catalog: EventPackageTypeCatalog,
  t: (key: string) => string,
): Array<{ value: string; label: string }> {
  return allPackageTypesFromCatalog(catalog)
    .map((item) => {
      const name = t(`packages.types.${item.code}`);
      const label = name !== `packages.types.${item.code}` ? name : item.label;
      return {
        value: item.code,
        label: `${label} (${item.code})`,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}
