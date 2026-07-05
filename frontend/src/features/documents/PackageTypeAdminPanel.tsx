import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import Badge from "../../components/ui/badge/Badge";
import {
  createPackageTypeDefinition,
  deletePackageTypeDefinition,
  fetchCustomPackageTypes,
} from "../../api/catalog";
import { getApiToken } from "../../lib/clerkToken";
import { useTranslation } from "../../i18n/useTranslation";
import { confirmAction, showError, showSuccess } from "../../lib/swal";
import { ACTIVITY_KINDS, type ActivityKind } from "./eventPackageTypes";
import type { PackageTypeDefinitionRecord } from "./types";

interface PackageTypeAdminPanelProps {
  onChanged: () => void;
}

const THEME_OPTIONS = [
  { value: "operatory", label: "Operatory" },
  { value: "pbo", label: "PBO" },
  { value: "iec", label: "IEC" },
];

export default function PackageTypeAdminPanel({ onChanged }: PackageTypeAdminPanelProps) {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [customTypes, setCustomTypes] = useState<PackageTypeDefinitionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activityKind, setActivityKind] = useState<ActivityKind>("cours");
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [preparationTheme, setPreparationTheme] = useState("operatory");
  const [durationDays, setDurationDays] = useState("3");

  const loadCustom = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getApiToken(getToken);
      setCustomTypes(await fetchCustomPackageTypes(token));
    } catch {
      setCustomTypes([]);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadCustom();
  }, [loadCustom]);

  const resetForm = () => {
    setCode("");
    setLabel("");
    setTitle("");
    setDescription("");
    setPreparationTheme("operatory");
    setDurationDays("3");
  };

  const handleCreate = async () => {
    if (!code.trim() || !label.trim() || !title.trim()) {
      await showError(t("common.error"), t("documents.typeFormRequired"));
      return;
    }
    setIsSaving(true);
    try {
      const token = await getApiToken(getToken);
      await createPackageTypeDefinition(token, {
        code: code.trim(),
        label: label.trim(),
        activity_kind: activityKind,
        activity_label:
          activityKind === "cours"
            ? t("documents.activityCours")
            : activityKind === "seminaire"
              ? t("documents.activitySeminaire")
              : t("documents.activityFaculty"),
        title: title.trim(),
        description: description.trim() || undefined,
        preparation_theme: preparationTheme,
        duration_days: Number(durationDays) || 3,
      });
      await showSuccess(t("documents.typeCreated"));
      resetForm();
      await loadCustom();
      onChanged();
    } catch (err) {
      await showError(t("common.error"), err instanceof Error ? err.message : t("documents.typeCreateFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (typeCode: string) => {
    const confirmed = await confirmAction({
      title: t("documents.typeDeleteTitle"),
      text: t("documents.typeDeleteConfirm"),
      confirmText: t("common.delete"),
    });
    if (!confirmed) return;

    try {
      const token = await getApiToken(getToken);
      await deletePackageTypeDefinition(token, typeCode);
      await showSuccess(t("documents.typeDeleted"));
      await loadCustom();
      onChanged();
    } catch (err) {
      await showError(t("common.error"), err instanceof Error ? err.message : t("common.error"));
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">{t("documents.typeAdminTitle")}</h4>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("documents.typeAdminDesc")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <div>
            <Label>{t("documents.typeCategory")}</Label>
            <Select
              value={activityKind}
              onChange={(value) => setActivityKind(value as ActivityKind)}
              options={ACTIVITY_KINDS.map((kind) => ({
                value: kind,
                label:
                  kind === "cours"
                    ? t("documents.activityCours")
                    : kind === "seminaire"
                      ? t("documents.activitySeminaire")
                      : t("documents.activityFaculty"),
              }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>{t("documents.typeCode")}</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="OP_C" />
            </div>
            <div>
              <Label>{t("documents.typeLabel")}</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Op C" />
            </div>
          </div>
          <div>
            <Label>{t("documents.typeTitleField")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("documents.typeTitlePlaceholder")} />
          </div>
          <div>
            <Label>{t("documents.typeDescription")}</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>{t("documents.typeTheme")}</Label>
              <Select
                value={preparationTheme}
                onChange={setPreparationTheme}
                options={THEME_OPTIONS}
              />
            </div>
            <div>
              <Label>{t("documents.typeDuration")}</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
              />
            </div>
          </div>
          <Button size="sm" disabled={isSaving} onClick={() => void handleCreate()}>
            {isSaving ? t("common.saving") : t("documents.typeAddButton")}
          </Button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t("documents.typeCustomList")}
          </p>
          {isLoading ? (
            <p className="text-sm text-gray-500">{t("common.loading")}</p>
          ) : customTypes.length === 0 ? (
            <p className="text-sm text-gray-500">{t("documents.typeCustomEmpty")}</p>
          ) : (
            <ul className="space-y-2">
              {customTypes.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                      {item.label}{" "}
                      <span className="font-normal text-gray-500">({item.code})</span>
                    </p>
                    <p className="truncate text-xs text-gray-500">{item.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color="light" size="sm">
                      {item.activity_kind}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => void handleDelete(item.code)}>
                      {t("common.delete")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
