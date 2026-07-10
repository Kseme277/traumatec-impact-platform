/** Types d'événement — cours, séminaire, faculty (format paquet). */

export type ActivityKind = string;

export const DEFAULT_ACTIVITY_KINDS: ActivityKind[] = ["cours", "seminaire", "faculty"];

/** @deprecated use DEFAULT_ACTIVITY_KINDS */
export const ACTIVITY_KINDS = DEFAULT_ACTIVITY_KINDS;

export interface PackageActivityCategory {
  code: string;
  label: string;
  sort_order: number;
  is_custom: boolean;
  is_builtin: boolean;
}

export interface EventPackageType {
  code: string;
  label: string;
  activity_kind: ActivityKind;
  activity_label: string;
  title: string;
  description: string;
  preparation_theme: string;
  duration_days: number;
  is_custom?: boolean;
  sort_order?: number;
}

export type EventPackageTypeCatalog = Record<string, EventPackageType[]>;

export interface PackageCatalogApiResponse {
  categories: PackageActivityCategory[];
  types: Partial<EventPackageTypeCatalog>;
}

export const FALLBACK_PACKAGE_TYPES: EventPackageTypeCatalog = {
  cours: [
    {
      code: "ORP_C",
      label: "ORP C",
      activity_kind: "cours",
      activity_label: "Cours",
      title: "Cours ORP — PBO (3 jours)",
      description: "Cours PBO sur plusieurs jours.",
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
export function mergePackageCatalog(
  api: Partial<EventPackageTypeCatalog> | PackageCatalogApiResponse,
): EventPackageTypeCatalog {
  const types =
    "types" in api && api.types ? api.types : (api as Partial<EventPackageTypeCatalog>);
  const apiCategoryCodes =
    "categories" in api && api.categories ? api.categories.map((item) => item.code) : [];
  const kindSet = new Set<string>([
    ...DEFAULT_ACTIVITY_KINDS,
    ...apiCategoryCodes,
    ...Object.keys(types ?? {}),
  ]);

  const result = {} as EventPackageTypeCatalog;
  for (const kind of kindSet) {
    const apiItems = types?.[kind] ?? [];
    const fallbackItems = FALLBACK_PACKAGE_TYPES[kind as keyof typeof FALLBACK_PACKAGE_TYPES] ?? [];
    const seen = new Set(apiItems.map((item) => item.code));
    const legacyHidden = new Set(["ORP_S"]);
    result[kind] = [
      ...apiItems.filter((item) => !legacyHidden.has(item.code)),
      ...fallbackItems.filter((item) => !seen.has(item.code)),
    ];
  }
  return result;
}

export function activityKindsFromCatalog(
  catalog: EventPackageTypeCatalog | PackageCatalogApiResponse,
): ActivityKind[] {
  if ("categories" in catalog && catalog.categories?.length) {
    return [...catalog.categories]
      .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label))
      .map((item) => item.code);
  }
  return activityKindsFromTypes(catalog as EventPackageTypeCatalog);
}

export function activityKindsFromTypes(catalog: EventPackageTypeCatalog): ActivityKind[] {
  const ordered = DEFAULT_ACTIVITY_KINDS.filter((kind) => (catalog[kind]?.length ?? 0) > 0);
  const extra = Object.keys(catalog).filter((kind) => !DEFAULT_ACTIVITY_KINDS.includes(kind));
  return [...ordered, ...extra.sort()];
}

export function categoryLabelForKind(
  categories: Array<{ code: string; label: string }>,
  kind: string,
  t: (key: string) => string,
): string {
  const match = categories.find((item) => item.code === kind);
  if (match) return match.label;
  if (kind === "cours") return t("documents.activityCours");
  if (kind === "seminaire") return t("documents.activitySeminaire");
  if (kind === "faculty") return t("documents.activityFaculty");
  return kind;
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
  return Object.values(catalog).flatMap((items) => items ?? []);
}

/** Code paquet canonique pour filtrage (ORP_S → PBO_S). */
export function eventPackageTypeCode(event: {
  inferred_package?: { package_type?: string } | null;
  preparation_theme?: string | null;
}): string {
  const raw = event.inferred_package?.package_type;
  return raw ? canonicalPackageType(raw) : "";
}

/** Filtre type de paquet : code inféré, sinon thème catalogue. */
export function eventMatchesPackageType(
  event: {
    inferred_package?: { package_type?: string; preparation_theme?: string } | null;
    preparation_theme?: string | null;
  },
  packageTypeCode: string,
  catalog: EventPackageTypeCatalog,
): boolean {
  if (!packageTypeCode) return true;
  const code = eventPackageTypeCode(event);
  if (code && code === packageTypeCode) return true;
  const pkg = findPackageType(catalog, packageTypeCode);
  if (!pkg) return code === packageTypeCode;
  const theme = (event.inferred_package?.preparation_theme || event.preparation_theme || "")
    .trim()
    .toLowerCase();
  return Boolean(theme) && theme === pkg.preparation_theme;
}

/** Thème TIP associé à un code paquet (pour filtre API). */
export function preparationThemeForPackageType(
  packageTypeCode: string,
  catalog: EventPackageTypeCatalog,
): string | undefined {
  if (!packageTypeCode) return undefined;
  return findPackageType(catalog, packageTypeCode)?.preparation_theme;
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
