/** Filtre les fichiers paquet selon la durée (1j = uniquement Jour 1). */

const DAY_FILE_RE = /jour\s*[_\s]*(\d)/i;

export function templateDayIndex(filename: string): number | null {
  const match = DAY_FILE_RE.exec(filename);
  return match ? Number.parseInt(match[1], 10) : null;
}

export function filterTemplatesByPackageDuration<T extends { name: string }>(
  templates: T[],
  maxDays: number,
): T[] {
  if (maxDays >= 3) {
    return templates;
  }
  return templates.filter((tpl) => {
    const day = templateDayIndex(tpl.name);
    return day === null || day <= maxDays;
  });
}
