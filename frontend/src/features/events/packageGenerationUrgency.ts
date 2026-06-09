import type { Evenement } from "./types";
import { isUpcomingEvent, todayIsoDate } from "./eventDates";
import { isEventOpen } from "./projectStatus";

/** Délai AO Alliance : le paquet documentaire doit être prêt 6 mois avant le début. */
export const PACKAGE_GENERATION_LEAD_MONTHS = 6;

export type PackageGenerationUrgency = "none" | "due" | "overdue";

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function addMonths(date: Date, months: number): Date {
  const copy = new Date(date.getTime());
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

/** Date limite : 6 mois avant le début de l'événement. */
export function packageGenerationDeadline(startDate: string | null | undefined): Date | null {
  if (!startDate) return null;
  return addMonths(parseIsoDate(startDate), -PACKAGE_GENERATION_LEAD_MONTHS);
}

export function getPackageGenerationUrgency(event: Evenement): PackageGenerationUrgency {
  if (event.status === "generated") return "none";
  if (!isUpcomingEvent(event)) return "none";
  if (!isEventOpen(event.project_status)) return "none";
  if (!event.start_date) return "none";

  const today = parseIsoDate(todayIsoDate());
  const start = parseIsoDate(event.start_date);
  const deadline = packageGenerationDeadline(event.start_date);
  if (!deadline) return "none";

  if (today < deadline) return "none";

  if (today < start) return "due";
  return "overdue";
}

export function needsPackageGenerationHighlight(event: Evenement): boolean {
  return getPackageGenerationUrgency(event) !== "none";
}
