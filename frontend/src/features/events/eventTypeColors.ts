import type { CalendarChipTone } from "./projectStatus";

const TYPE_TONE_MAP: Record<string, CalendarChipTone> = {
  activity: "Primary",
  activité: "Primary",
  activite: "Primary",
  seminar: "Primary",
  séminaire: "Primary",
  seminaire: "Primary",
  course: "Success",
  cours: "Success",
  training: "Success",
  formation: "Success",
  meeting: "Warning",
  réunion: "Warning",
  reunion: "Warning",
  workshop: "Warning",
  atelier: "Warning",
  congress: "Danger",
  conférence: "Danger",
  conference: "Danger",
  symposium: "Danger",
};

const FALLBACK_TONES: CalendarChipTone[] = ["Primary", "Success", "Warning", "Danger"];

function hashLabel(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash + value.charCodeAt(i) * (i + 1)) % FALLBACK_TONES.length;
  }
  return hash;
}

/** Couleur calendrier selon le type d'événement (Activity). */
export function calendarChipToneForEventType(
  eventType: string | null | undefined,
): CalendarChipTone {
  if (!eventType?.trim()) return "Warning";
  const key = eventType.trim().toLowerCase();
  if (TYPE_TONE_MAP[key]) return TYPE_TONE_MAP[key];

  for (const [needle, tone] of Object.entries(TYPE_TONE_MAP)) {
    if (key.includes(needle)) return tone;
  }

  return FALLBACK_TONES[hashLabel(key)] ?? "Primary";
}

export function eventTypeCalendarLegend(): Array<{ type: string; tone: CalendarChipTone }> {
  return [
    { type: "Seminar / Activity", tone: "Primary" },
    { type: "Course / Training", tone: "Success" },
    { type: "Meeting / Workshop", tone: "Warning" },
    { type: "Congress / Conference", tone: "Danger" },
  ];
}
