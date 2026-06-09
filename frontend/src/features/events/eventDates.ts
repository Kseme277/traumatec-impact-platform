import type { DashboardEventStats, Evenement, EventStatus } from "./types";
import { calendarChipToneForEventType } from "./eventTypeColors";

export type CalendarEntry = DashboardEventStats["calendar"][number];

/** Date du jour en ISO (fuseau local). */
export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getCurrentCalendarYear(): number {
  return new Date().getFullYear();
}

export function formatEventDate(value: string | null | undefined): string {
  if (!value) return "—";
  const iso = value.slice(0, 10);
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export function formatEventDateRange(event: Pick<Evenement, "start_date" | "end_date">): string {
  const start = formatEventDate(event.start_date);
  const end = formatEventDate(event.end_date);
  if (start === "—" && end === "—") return "Dates non renseignées";
  if (start === end || end === "—") return start;
  if (start === "—") return end;
  return `${start} → ${end}`;
}

export function formatDateRangeFr(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  return formatEventDateRange({ start_date: start ?? null, end_date: end ?? null });
}

function isoDateOnly(value: string): string {
  return value.slice(0, 10);
}

export function eventOverlapsYear(start: string, end: string, year: number): boolean {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  return isoDateOnly(start) <= yearEnd && isoDateOnly(end) >= yearStart;
}

export function filterCalendarForYear<T extends { start: string; end: string }>(
  items: T[],
  year: number,
): T[] {
  return items.filter((item) => eventOverlapsYear(item.start, item.end, year));
}

/** Événements dont la date de début tombe dans [rangeStart, rangeEnd[ (ISO). */
export function filterCalendarStartingInRange<T extends { start: string }>(
  items: T[],
  rangeStart: string,
  rangeEnd: string,
): T[] {
  return items.filter((item) => {
    const start = isoDateOnly(item.start);
    return start >= rangeStart && start < rangeEnd;
  });
}

/** Bornes du mois visible (end = premier jour du mois suivant, pour filtres [start, end[). */
export function getMonthBounds(anchor: Date): { start: string; end: string } {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const next = new Date(y, m + 1, 1);
  const end = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;
  return { start, end };
}

export function toCalendarMonthEvent(item: CalendarEntry) {
  const start = isoDateOnly(item.start);
  return {
    id: item.id,
    title: item.title?.trim() || item.project_number,
    start,
    allDay: true,
    extendedProps: {
      calendar: calendarChipToneForEventType(item.event_type),
      subtitle: item.project_number,
      eventType: item.event_type,
    },
  };
}

/** Événement pas encore terminé (date fin ou début >= aujourd'hui). */
export function isUpcomingEvent(event: Pick<Evenement, "start_date" | "end_date">): boolean {
  const ref = event.end_date?.slice(0, 10) || event.start_date?.slice(0, 10);
  if (!ref) return false;
  return ref >= todayIsoDate();
}

const GENERATABLE_STATUSES: EventStatus[] = ["imported", "in_progress", "ready"];

export function isGeneratableEvent(event: Evenement): boolean {
  return GENERATABLE_STATUSES.includes(event.status) && isUpcomingEvent(event);
}

/** Texte libre pour filtrer la liste (n°, titre, ville, pays, type). */
export function eventMatchesSearch(event: Evenement, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    event.project_number,
    event.title,
    event.event_type,
    event.city,
    event.country,
    event.inferred_package?.package_type,
    event.inferred_package?.activity_label,
    event.inferred_package?.package_label,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}
