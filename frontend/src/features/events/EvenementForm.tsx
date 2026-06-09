import { FormEvent, useEffect, useMemo, useState } from "react";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import Button from "../../components/ui/button/Button";
import { useTranslation } from "../../i18n/useTranslation";
import type { Evenement, EvenementPayload, EventStatus, PreparationTheme } from "./types";
import { getProjectStatusFormOptions } from "./projectStatus";
import { themeFormOptions } from "./themeOptions";

interface EvenementFormProps {
  initial?: Evenement | null;
  isSubmitting?: boolean;
  submitLabel?: string;
  onSubmit: (payload: EvenementPayload) => Promise<void>;
  onCancel?: () => void;
}

const emptyForm: EvenementPayload = {
  project_number: "",
  title: "",
  event_type: "",
  preparation_theme: null,
  responsible_person: "",
  responsible_email: "",
  responsible_phone: "",
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
  const [form, setForm] = useState<EvenementPayload>(emptyForm);

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

  useEffect(() => {
    if (initial) {
      setForm({
        project_number: initial.project_number,
        title: initial.title,
        event_type: initial.event_type ?? "",
        preparation_theme: initial.preparation_theme,
        responsible_person: initial.responsible_person ?? "",
        responsible_email:
          (initial.metadata_json?.responsible_email as string | undefined) ?? "",
        responsible_phone:
          (initial.metadata_json?.responsible_phone as string | undefined) ?? "",
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({
      ...form,
      event_type: form.event_type || null,
      responsible_person: form.responsible_person || null,
      responsible_email: form.responsible_email || null,
      responsible_phone: form.responsible_phone || null,
      project_status: form.project_status || "Open",
      country: form.country || null,
      city: form.city || null,
      region: form.region || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      preparation_theme: (form.preparation_theme as PreparationTheme | null) || null,
      status: form.status as EventStatus,
    });
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
          />
        </div>
        <div>
          <Label>{t("events.activityType")}</Label>
          <Input
            value={form.event_type ?? ""}
            onChange={(e) => setForm({ ...form, event_type: e.target.value })}
            placeholder="Course, Faculty Education…"
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <Label>{t("events.responsible")}</Label>
          <Input
            value={form.responsible_person ?? ""}
            onChange={(e) => setForm({ ...form, responsible_person: e.target.value })}
            placeholder={t("events.responsiblePlaceholder")}
          />
        </div>
        <div>
          <Label>{t("events.responsibleEmail")}</Label>
          <Input
            type="email"
            value={form.responsible_email ?? ""}
            onChange={(e) => setForm({ ...form, responsible_email: e.target.value })}
            placeholder="responsable@exemple.org"
          />
        </div>
        <div>
          <Label>{t("events.responsiblePhone")}</Label>
          <Input
            value={form.responsible_phone ?? ""}
            onChange={(e) => setForm({ ...form, responsible_phone: e.target.value })}
            placeholder="+221 77 000 00 00"
          />
        </div>
        <div>
          <Label>{t("events.status")}</Label>
          <Select
            options={projectStatusOptions}
            defaultValue={form.project_status ?? "Open"}
            onChange={(value) => setForm({ ...form, project_status: value })}
          />
        </div>
        <div>
          <Label>{t("events.theme")}</Label>
          <Select
            placeholder={t("events.chooseTheme")}
            options={themeFormOptions}
            value={form.preparation_theme ?? ""}
            onChange={(value) =>
              setForm({
                ...form,
                preparation_theme: (value || null) as PreparationTheme | null,
              })
            }
          />
        </div>
        <div>
          <Label>{t("events.tipStatus")}</Label>
          <Select
            options={statusOptions}
            defaultValue={form.status ?? "imported"}
            onChange={(value) => setForm({ ...form, status: value as EventStatus })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <Label>{t("events.city")}</Label>
          <Input
            value={form.city ?? ""}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="Zurich"
          />
        </div>
        <div>
          <Label>{t("events.country")}</Label>
          <Input
            value={form.country ?? ""}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            placeholder="Suisse"
          />
        </div>
        <div>
          <Label>{t("events.region")}</Label>
          <Input
            value={form.region ?? ""}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
            placeholder="Europe"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <Label>{t("events.startDate")}</Label>
          <Input
            type="date"
            value={form.start_date ?? ""}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          />
        </div>
        <div>
          <Label>{t("events.endDate")}</Label>
          <Input
            type="date"
            value={form.end_date ?? ""}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
          />
        </div>
      </div>

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
