import type { Evenement, EvenementPayload } from "./types";
import { inferActivityKind } from "./themeOptions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function nationalEmailFromEvent(
  event: Pick<Evenement, "national_responsible_email" | "metadata_json"> & {
    responsible_email?: string | null;
  },
): string {
  const meta = event.metadata_json as Record<string, unknown> | null | undefined;
  return String(
    event.national_responsible_email
      ?? event.responsible_email
      ?? meta?.national_responsible_email
      ?? meta?.responsible_email
      ?? "",
  ).trim();
}

export function nationalPhoneFromEvent(
  event: Pick<Evenement, "national_responsible_phone" | "metadata_json"> & {
    responsible_phone?: string | null;
  },
): string {
  const meta = event.metadata_json as Record<string, unknown> | null | undefined;
  return String(
    event.national_responsible_phone
      ?? event.responsible_phone
      ?? meta?.national_responsible_phone
      ?? meta?.responsible_phone
      ?? "",
  ).trim();
}

export function validateEventFormPayload(
  form: EvenementPayload,
  t: (key: string) => string,
): string[] {
  const issues: string[] = [];
  if (!form.project_number?.trim()) issues.push(t("events.missingProject"));
  if (!form.title?.trim()) issues.push(t("events.missingTitle"));
  if (!form.organizer_responsible_user_id) issues.push(t("events.missingOrganizer"));
  if (!form.national_responsible_name?.trim() && !form.responsible_person?.trim()) {
    issues.push(t("events.missingNationalContact"));
  }
  const email = (form.national_responsible_email ?? "").trim();
  if (!email) issues.push(t("events.missingNationalEmail"));
  else if (!EMAIL_RE.test(email)) issues.push(t("events.invalidNationalEmail"));
  const phone = (form.national_responsible_phone ?? "").trim();
  if (!phone) issues.push(t("events.missingNationalPhone"));
  if (!form.country?.trim()) issues.push(t("events.missingCountry"));
  if (!form.region?.trim()) issues.push(t("events.missingRegion"));
  if (!form.city?.trim()) issues.push(t("events.missingCity"));
  const kind = inferActivityKind(form);
  if (kind !== "faculty" && !form.preparation_theme) {
    issues.push(t("events.missingTheme"));
  }
  return issues;
}

export function validateEventForGeneration(event: Evenement, t: (key: string) => string): string[] {
  return validateEventFormPayload(
    {
      project_number: event.project_number,
      title: event.title,
      event_type: event.event_type,
      preparation_theme: event.preparation_theme,
      country: event.country,
      city: event.city,
      region: event.region,
      responsible_person: event.responsible_person,
      national_responsible_name: event.national_responsible_name,
      national_responsible_email: nationalEmailFromEvent(event),
      national_responsible_phone: nationalPhoneFromEvent(event),
      organizer_responsible_user_id: event.organizer_responsible_user_id ?? null,
      teacher_ids: event.teachers?.map((x) => x.id) ?? [],
      project_status: event.project_status,
      start_date: event.start_date,
      end_date: event.end_date,
      status: event.status,
    },
    t,
  );
}
