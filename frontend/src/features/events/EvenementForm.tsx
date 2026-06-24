import { FormEvent, useEffect, useMemo, useState } from "react";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import MultiSelect from "../../components/form/MultiSelect";
import GeoLocationSelect from "../../components/form/GeoLocationSelect";
import Button from "../../components/ui/button/Button";
import { useTranslation } from "../../i18n/useTranslation";
import { useTipAuth } from "../../context/TipAuthContext";
import { fetchTeachers, teacherLabel } from "../../api/teachers";
import { fetchNationalContacts, nationalContactLabel } from "../../api/nationalContacts";
import { fetchUsersByRole } from "../../api/workflow";
import { getApiToken } from "../../lib/clerkToken";
import { useAuth } from "@clerk/clerk-react";
import type { Evenement, EvenementPayload, EventStatus, PreparationTheme } from "./types";
import { getProjectStatusFormOptions } from "./projectStatus";
import { inferActivityKind, themeFormOptionsForEvent } from "./themeOptions";
import { buildEventTypeOptions, matchEventTypeOption } from "./eventTypeOptions";
import { validateEventFormPayload } from "./eventGenerationReadiness";
import { confirmAction, showError } from "../../lib/swal";
import type { Utilisateur } from "../auth/types";
import type { Teacher } from "../../api/teachers";
import type { NationalContact } from "../../api/nationalContacts";

interface EvenementFormProps {
  initial?: Evenement | null;
  isSubmitting?: boolean;
  submitLabel?: string;
  onSubmit: (payload: EvenementPayload) => Promise<void>;
  onCancel?: () => void;
}

const IMPORT_LOCKED_FIELDS = new Set([
  "project_number",
  "event_type",
  "country",
  "region",
  "city",
  "start_date",
  "end_date",
  "project_status",
  "responsible_person",
]);

const emptyForm: EvenementPayload = {
  project_number: "",
  title: "",
  event_type: "",
  preparation_theme: null,
  responsible_person: "",
  national_responsible_name: "",
  national_responsible_email: "",
  national_responsible_phone: "",
  organizer_responsible_user_id: null,
  teacher_ids: [],
  project_status: "Open",
  country: "",
  city: "",
  region: "",
  start_date: "",
  end_date: "",
  status: "imported",
};

export default function EvenementForm({
  initial = null,
  isSubmitting = false,
  submitLabel,
  onSubmit,
  onCancel,
}: EvenementFormProps) {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const { hasRole } = useTipAuth();
  const isAdmin = hasRole("administrateur");
  const [form, setForm] = useState<EvenementPayload>(emptyForm);
  const [themeChoice, setThemeChoice] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [nationalContacts, setNationalContacts] = useState<NationalContact[]>([]);
  const [supportUsers, setSupportUsers] = useState<Utilisateur[]>([]);
  const [nationalContactId, setNationalContactId] = useState("");

  const fieldLocked = (field: string) => !isAdmin && IMPORT_LOCKED_FIELDS.has(field);

  const statusOptions = useMemo(
    () => [
      { value: "imported", label: t("events.tipImported") },
      { value: "in_progress", label: t("events.tipInProgress") },
      { value: "ready", label: t("events.tipReady") },
      { value: "generated", label: t("events.tipGenerated") },
      { value: "error", label: t("events.tipError") },
    ],
    [t],
  );

  const projectStatusOptions = useMemo(() => getProjectStatusFormOptions(t), [t]);
  const activityKind = useMemo(
    () => inferActivityKind(form),
    [form.event_type, form.title, form.start_date, form.end_date],
  );
  const themeOptions = useMemo(
    () => themeFormOptionsForEvent(form, t),
    [form.event_type, form.title, form.start_date, form.end_date, t],
  );

  const eventTypeOptions = useMemo(
    () => buildEventTypeOptions(form.event_type ?? initial?.event_type),
    [form.event_type, initial?.event_type],
  );

  const organizerOptions = useMemo(
    () => [
      { value: "", label: "— Choisir un responsable organisation —" },
      ...supportUsers.map((u) => ({
        value: String(u.id),
        label: `${u.prenom} ${u.nom} (${u.email})`,
      })),
    ],
    [supportUsers],
  );

  const nationalOptions = useMemo(
    () => [
      { value: "", label: "— Choisir un responsable national —" },
      ...nationalContacts.map((c) => ({
        value: c.id,
        label: nationalContactLabel(c),
      })),
    ],
    [nationalContacts],
  );

  const teacherSelectOptions = useMemo(
    () =>
      teachers.map((teacher) => ({
        value: teacher.id,
        text: `${teacherLabel(teacher)}${teacher.phone ? ` · ${teacher.phone}` : ""}`,
      })),
    [teachers],
  );

  useEffect(() => {
    void (async () => {
      try {
        const token = await getApiToken(getToken);
        const [teacherRes, users, nationals] = await Promise.all([
          fetchTeachers(token),
          fetchUsersByRole(token, "support_administratif"),
          fetchNationalContacts(token),
        ]);
        setTeachers(teacherRes.items);
        setSupportUsers(users);
        setNationalContacts(nationals.items);
      } catch {
        setTeachers([]);
        setSupportUsers([]);
        setNationalContacts([]);
      }
    })();
  }, [getToken]);

  useEffect(() => {
    if (initial) {
      const override = initial.metadata_json?.package_type_override;
      setThemeChoice(
        override === "NONOP_C" ? "operatory-nonop" : (initial.preparation_theme ?? ""),
      );
      const nationalName =
        initial.national_responsible_name ?? initial.responsible_person ?? "";
      const nationalEmail =
        initial.national_responsible_email ??
        (initial.metadata_json?.responsible_email as string | undefined) ??
        "";
      const nationalPhone =
        initial.national_responsible_phone ??
        (initial.metadata_json?.responsible_phone as string | undefined) ??
        "";

      setForm({
        project_number: initial.project_number,
        title: initial.title,
        event_type: matchEventTypeOption(initial.event_type),
        preparation_theme: initial.preparation_theme,
        responsible_person: initial.responsible_person ?? "",
        national_responsible_name: nationalName,
        national_responsible_email: nationalEmail,
        national_responsible_phone: nationalPhone,
        organizer_responsible_user_id: initial.organizer_responsible_user_id ?? null,
        teacher_ids: (initial.teachers ?? []).map((teacher) => teacher.id),
        project_status: initial.project_status ?? "Open",
        country: initial.country ?? "",
        city: initial.city ?? "",
        region: initial.region ?? "",
        start_date: initial.start_date ?? "",
        end_date: initial.end_date ?? "",
        status: initial.status,
      });
    }
  }, [initial]);

  useEffect(() => {
    if (!nationalContacts.length) return;
    const name = form.national_responsible_name?.trim().toLowerCase();
    const email = form.national_responsible_email?.trim().toLowerCase();
    const match = nationalContacts.find((c) => {
      if (email && c.email?.toLowerCase() === email) return true;
      return name && c.full_name.trim().toLowerCase() === name;
    });
    setNationalContactId(match?.id ?? "");
  }, [nationalContacts, form.national_responsible_name, form.national_responsible_email]);

  function applyNationalContact(contactId: string) {
    setNationalContactId(contactId);
    if (!contactId) return;
    const contact = nationalContacts.find((c) => c.id === contactId);
    if (!contact) return;
    setForm({
      ...form,
      national_responsible_name: contact.full_name,
      national_responsible_email: contact.email ?? "",
      national_responsible_phone: contact.phone ?? "",
    });
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const isNonop = themeChoice === "operatory-nonop";
    const payload: EvenementPayload = {
      ...form,
      event_type: form.event_type || null,
      responsible_person: form.responsible_person || form.national_responsible_name || null,
      national_responsible_name: form.national_responsible_name || null,
      national_responsible_email: form.national_responsible_email || null,
      national_responsible_phone: form.national_responsible_phone || null,
      organizer_responsible_user_id: form.organizer_responsible_user_id ?? null,
      teacher_ids: form.teacher_ids ?? [],
      project_status: form.project_status || "Open",
      country: form.country || null,
      city: form.city || null,
      region: form.region || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      preparation_theme: activityKind === "faculty"
        ? null
        : ((isNonop ? "operatory" : form.preparation_theme) as PreparationTheme | null) || null,
      package_type_override: isNonop ? "NONOP_C" : null,
      status: form.status as EventStatus,
    };

    const issues = validateEventFormPayload(payload, t);
    if (issues.length > 0) {
      await showError(t("common.required"), issues.join("\n"));
      return;
    }

    const confirmed = await confirmAction({
      title: initial ? t("confirm.saveEventTitle") : t("confirm.createEventTitle"),
      text: initial ? t("confirm.saveEventText") : t("confirm.createEventText"),
      confirmText: t("confirm.proceed"),
      cancelText: t("common.cancel"),
    });
    if (!confirmed.isConfirmed) return;

    await onSubmit(payload);
  };

  const resolvedSubmitLabel = submitLabel ?? t("common.save");

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <Label>
            {t("events.project")} <span className="text-error-500">*</span>
          </Label>
          <Input
            value={form.project_number}
            onChange={(e) => setForm({ ...form, project_number: e.target.value })}
            placeholder="2026-001"
            disabled={fieldLocked("project_number")}
          />
        </div>
        <div>
          <Label>{t("events.activityType")}</Label>
          <Select
            options={eventTypeOptions}
            value={form.event_type ?? ""}
            onChange={(value) => setForm({ ...form, event_type: value })}
            disabled={fieldLocked("event_type")}
            placeholder="— Choisir un type —"
          />
        </div>
      </div>

      <div>
        <Label>
          {t("events.eventTitle")} <span className="text-error-500">*</span>
        </Label>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder={t("events.titlePlaceholder")}
        />
      </div>

      <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
        <p className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("events.nationalResponsibleSection")}
        </p>
        <div className="space-y-4">
          <div>
            <Label>
              {t("events.nationalContactLabel")} <span className="text-error-500">*</span>
            </Label>
            <Select
              options={nationalOptions}
              value={nationalContactId}
              onChange={applyNationalContact}
              placeholder="— Choisir dans le référentiel —"
            />
            {nationalContacts.length === 0 ? (
              <p className="mt-1 text-xs text-gray-500">
                Aucun contact national en base — l&apos;admin peut en créer via l&apos;API.
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label>
                {t("events.responsible")} <span className="text-error-500">*</span>
              </Label>
              <Input
                value={form.national_responsible_name ?? ""}
                onChange={(e) =>
                  setForm({ ...form, national_responsible_name: e.target.value, responsible_person: e.target.value })
                }
                placeholder={t("events.responsiblePlaceholder")}
              />
            </div>
            <div>
              <Label>
                {t("events.responsibleEmail")} <span className="text-error-500">*</span>
              </Label>
              <Input
                type="email"
                value={form.national_responsible_email ?? ""}
                onChange={(e) => setForm({ ...form, national_responsible_email: e.target.value })}
                placeholder="responsable@exemple.org"
              />
            </div>
            <div>
              <Label>
                {t("events.responsiblePhone")} <span className="text-error-500">*</span>
              </Label>
              <Input
                type="tel"
                value={form.national_responsible_phone ?? ""}
                onChange={(e) => setForm({ ...form, national_responsible_phone: e.target.value })}
                placeholder="+221 77 000 00 00"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <Label>
            {t("events.organizerResponsible")} <span className="text-error-500">*</span>
          </Label>
          <Select
            options={organizerOptions}
            value={form.organizer_responsible_user_id ? String(form.organizer_responsible_user_id) : ""}
            onChange={(value) =>
              setForm({
                ...form,
                organizer_responsible_user_id: value ? Number(value) : null,
              })
            }
            placeholder="— Choisir un utilisateur support —"
          />
        </div>
        <div>
          <Label>{t("events.status")}</Label>
          <Select
            options={projectStatusOptions}
            value={form.project_status ?? "Open"}
            onChange={(value) => setForm({ ...form, project_status: value })}
            disabled={fieldLocked("project_status")}
          />
        </div>
        {activityKind === "faculty" ? (
          <div>
            <Label>{t("events.theme")}</Label>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t("events.facultyNoTheme")}</p>
          </div>
        ) : (
          <div>
            <Label>{t("events.theme")}</Label>
            <Select
              placeholder={t("events.chooseTheme")}
              options={themeOptions}
              value={themeChoice}
              onChange={(value) => {
                setThemeChoice(value);
                if (value === "operatory-nonop") {
                  setForm({ ...form, preparation_theme: "operatory" });
                  return;
                }
                setForm({
                  ...form,
                  preparation_theme: (value || null) as PreparationTheme | null,
                });
              }}
            />
          </div>
        )}
        <div>
          <Label>{t("events.tipStatus")}</Label>
          <Select
            options={statusOptions}
            value={form.status ?? "imported"}
            onChange={(value) => setForm({ ...form, status: value as EventStatus })}
          />
        </div>
      </div>

      <GeoLocationSelect
        country={form.country ?? ""}
        region={form.region ?? ""}
        city={form.city ?? ""}
        disabled={fieldLocked("country")}
        onChange={({ country, region, city }) => setForm({ ...form, country, region, city })}
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <Label>{t("events.startDate")}</Label>
          <Input
            type="date"
            value={form.start_date ?? ""}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            disabled={fieldLocked("start_date")}
          />
        </div>
        <div>
          <Label>{t("events.endDate")}</Label>
          <Input
            type="date"
            value={form.end_date ?? ""}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            disabled={fieldLocked("end_date")}
          />
        </div>
      </div>

      <div>
        <MultiSelect
          label={t("events.teachersOptional")}
          placeholder="— Sélectionner un ou plusieurs enseignants —"
          options={teacherSelectOptions}
          value={form.teacher_ids ?? []}
          onChange={(ids) => setForm({ ...form, teacher_ids: ids })}
        />
        {teachers.length === 0 ? (
          <p className="mt-1 text-xs text-gray-500">Référentiel enseignants vide — contactez un administrateur.</p>
        ) : null}
      </div>

      {!isAdmin ? (
        <p className="text-xs text-gray-500">
          Les champs importés (projet, type, lieu, dates, statut projet) sont en lecture seule pour le support administratif.
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6 dark:border-gray-800">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
        )}
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? t("common.saving") : resolvedSubmitLabel}
        </Button>
      </div>
    </form>
  );
}
