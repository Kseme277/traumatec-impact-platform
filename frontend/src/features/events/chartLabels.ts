/** Libellés propres pour les graphiques ApexCharts (évite NaN / clés vides). */

export function sanitizeChartLabel(value: string | null | undefined, fallback = "Non renseigné"): string {
  if (value == null) return fallback;
  const label = String(value).trim();
  if (!label || label.toLowerCase() === "nan" || label === "undefined") {
    return fallback;
  }
  return label;
}

export function chartEntries(
  data: Record<string, number>,
  fallbackLabel = "Non renseigné",
): { categories: string[]; values: number[] } {
  const entries = Object.entries(data)
    .map(([key, count]) => [sanitizeChartLabel(key, fallbackLabel), count] as const)
    .filter(([, count]) => Number.isFinite(count) && count > 0)
    .sort((a, b) => b[1] - a[1]);

  return {
    categories: entries.map(([label]) => label),
    values: entries.map(([, count]) => count),
  };
}

export function truncateLabel(label: string, maxLength = 32): string {
  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength - 1)}…`;
}
