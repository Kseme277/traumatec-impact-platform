export function formatWorkflowPackageTitle(
  projectNumber: string | null | undefined,
  eventTitle: string | null | undefined,
): string {
  const project = (projectNumber ?? "").trim();
  const title = (eventTitle ?? "").trim();
  if (project && title) return `${project} — ${title}`;
  return project || title;
}
