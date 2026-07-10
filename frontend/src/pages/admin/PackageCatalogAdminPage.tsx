import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import AdminBreadcrumb from "../../components/common/AdminBreadcrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import SpinnerLoader from "../../components/common/SpinnerLoader";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import Badge from "../../components/ui/badge/Badge";
import {
  createPackageActivityCategory,
  createPackageTypeDefinition,
  deletePackageActivityCategory,
  deletePackageTypeDefinition,
  fetchPackageCatalog,
} from "../../api/catalog";
import { getApiToken } from "../../lib/clerkToken";
import { useTranslation } from "../../i18n/useTranslation";
import { confirmAction, showError, showSuccess } from "../../lib/swal";
import { useTipSWR } from "../../lib/swr";
import {
  activityKindsFromCatalog,
  categoryLabelForKind,
  mergePackageCatalog,
} from "../../features/documents/eventPackageTypes";
import type { PackageTypeDefinitionRecord } from "../../features/documents/types";

type Tab = "categories" | "types";

const THEME_OPTIONS = [
  { value: "operatory", label: "Operatory" },
  { value: "pbo", label: "PBO" },
  { value: "iec", label: "IEC" },
];

export default function PackageCatalogAdminPage() {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [tab, setTab] = useState<Tab>("categories");
  const [saving, setSaving] = useState(false);

  const [categoryCode, setCategoryCode] = useState("");
  const [categoryLabel, setCategoryLabel] = useState("");
  const [categorySort, setCategorySort] = useState("10");

  const [activityKind, setActivityKind] = useState("cours");
  const [typeCode, setTypeCode] = useState("");
  const [typeLabel, setTypeLabel] = useState("");
  const [typeTitle, setTypeTitle] = useState("");
  const [typeDescription, setTypeDescription] = useState("");
  const [preparationTheme, setPreparationTheme] = useState("operatory");
  const [durationDays, setDurationDays] = useState("3");

  const { data, isLoading, mutate } = useTipSWR(
    ["package-catalog"] as const,
    async (token) => {
      try {
        return await fetchPackageCatalog(token);
      } catch {
        return { categories: [], types: {} };
      }
    },
  );

  const categories = data?.categories ?? [];
  const catalog = useMemo(() => mergePackageCatalog(data ?? {}), [data]);
  const customTypes = useMemo(
    () =>
      Object.values(catalog)
        .flat()
        .filter((item) => item.is_custom) as PackageTypeDefinitionRecord[],
    [catalog],
  );

  const activityKinds = useMemo(
    () => (categories.length ? categories.map((item) => item.code) : activityKindsFromCatalog(catalog)),
    [categories, catalog],
  );

  useEffect(() => {
    if (categories.length && !categories.some((item) => item.code === activityKind)) {
      setActivityKind(categories[0]?.code ?? "cours");
    }
  }, [categories, activityKind]);

  const handleCreateCategory = async () => {
    if (!categoryCode.trim() || !categoryLabel.trim()) {
      await showError(t("common.error"), t("documents.categoryFormRequired"));
      return;
    }
    setSaving(true);
    try {
      const token = await getApiToken(getToken);
      await createPackageActivityCategory(token, {
        code: categoryCode.trim(),
        label: categoryLabel.trim(),
        sort_order: Number(categorySort) || 0,
      });
      await showSuccess(t("documents.categoryCreated"));
      setCategoryCode("");
      setCategoryLabel("");
      await mutate();
    } catch (err) {
      await showError(t("common.error"), err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (code: string) => {
    const confirmed = await confirmAction({
      title: t("documents.categoryDeleteTitle"),
      text: t("documents.categoryDeleteConfirm"),
      confirmText: t("common.delete"),
    });
    if (!confirmed.isConfirmed) return;
    try {
      const token = await getApiToken(getToken);
      await deletePackageActivityCategory(token, code);
      await showSuccess(t("documents.categoryDeleted"));
      await mutate();
    } catch (err) {
      await showError(t("common.error"), err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleCreateType = async () => {
    if (!typeCode.trim() || !typeLabel.trim() || !typeTitle.trim()) {
      await showError(t("common.error"), t("documents.typeFormRequired"));
      return;
    }
    setSaving(true);
    try {
      const token = await getApiToken(getToken);
      await createPackageTypeDefinition(token, {
        code: typeCode.trim(),
        label: typeLabel.trim(),
        activity_kind: activityKind,
        activity_label: categoryLabelForKind(categories, activityKind, t),
        title: typeTitle.trim(),
        description: typeDescription.trim() || undefined,
        preparation_theme: preparationTheme,
        duration_days: Number(durationDays) || 3,
      });
      await showSuccess(t("documents.typeCreated"));
      setTypeCode("");
      setTypeLabel("");
      setTypeTitle("");
      setTypeDescription("");
      await mutate();
    } catch (err) {
      await showError(t("common.error"), err instanceof Error ? err.message : t("documents.typeCreateFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteType = async (code: string) => {
    const confirmed = await confirmAction({
      title: t("documents.typeDeleteTitle"),
      text: t("documents.typeDeleteConfirm"),
      confirmText: t("common.delete"),
    });
    if (!confirmed.isConfirmed) return;
    try {
      const token = await getApiToken(getToken);
      await deletePackageTypeDefinition(token, code);
      await showSuccess(t("documents.typeDeleted"));
      await mutate();
    } catch (err) {
      await showError(t("common.error"), err instanceof Error ? err.message : t("common.error"));
    }
  };

  const typesByCategory = useMemo(() => {
    const grouped: Record<string, PackageTypeDefinitionRecord[]> = {};
    for (const kind of activityKinds) {
      grouped[kind] = (catalog[kind] ?? []).filter((item) => item.is_custom) as PackageTypeDefinitionRecord[];
    }
    return grouped;
  }, [activityKinds, catalog]);

  const loading = isLoading && !data;

  return (
    <>
      <PageMeta title={t("documents.catalogAdminTitle")} description={t("documents.catalogAdminDesc")} />
      <AdminBreadcrumb
        pageTitle={t("documents.catalogAdminTitle")}
        crumbs={[
          { label: t("nav.admin"), to: "/dashboard" },
          { label: t("nav.referentiels"), to: "/admin/referentiels" },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            {t("documents.catalogAdminTitle")}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("documents.catalogAdminDesc")}</p>
        </div>
        <Link to="/documents/templates">
          <Button size="sm" variant="outline">
            {t("documents.backToTemplates")}
          </Button>
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("categories")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "categories" ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          {t("documents.catalogTabCategories")}
        </button>
        <button
          type="button"
          onClick={() => setTab("types")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "types" ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          {t("documents.catalogTabTypes")}
        </button>
      </div>

      {loading ? (
        <SpinnerLoader message={t("common.loading")} />
      ) : tab === "categories" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <ComponentCard title={t("documents.categoryAddTitle")} desc={t("documents.categoryAddDesc")}>
            <div className="space-y-3">
              <div>
                <Label>{t("documents.categoryCode")}</Label>
                <Input value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} placeholder="atelier" />
              </div>
              <div>
                <Label>{t("documents.categoryLabel")}</Label>
                <Input value={categoryLabel} onChange={(e) => setCategoryLabel(e.target.value)} placeholder="Atelier" />
              </div>
              <div>
                <Label>{t("documents.categorySort")}</Label>
                <Input type="number" min="0" value={categorySort} onChange={(e) => setCategorySort(e.target.value)} />
              </div>
              <Button size="sm" disabled={saving} onClick={() => void handleCreateCategory()}>
                {saving ? t("common.saving") : t("documents.categoryAddButton")}
              </Button>
            </div>
          </ComponentCard>

          <ComponentCard title={t("documents.categoryListTitle")} desc={t("documents.categoryListDesc")}>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {categories.map((item) => (
                <li key={item.code} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white/90">
                      {item.label}{" "}
                      <span className="text-sm font-normal text-gray-500">({item.code})</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.is_builtin ? t("documents.categoryBuiltin") : t("documents.categoryCustom")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color={item.is_builtin ? "light" : "primary"} size="sm">
                      {item.is_builtin ? t("documents.categorySystem") : t("documents.categoryCustomBadge")}
                    </Badge>
                    {!item.is_builtin ? (
                      <Button size="sm" variant="outline" onClick={() => void handleDeleteCategory(item.code)}>
                        {t("common.delete")}
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </ComponentCard>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <ComponentCard title={t("documents.typeAddTitle")} desc={t("documents.typeAddDesc")}>
            <div className="space-y-3">
              <div>
                <Label>{t("documents.typeCategory")}</Label>
                <Select
                  value={activityKind}
                  onChange={setActivityKind}
                  options={activityKinds.map((kind) => ({
                    value: kind,
                    label: categoryLabelForKind(categories, kind, t),
                  }))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>{t("documents.typeCode")}</Label>
                  <Input value={typeCode} onChange={(e) => setTypeCode(e.target.value)} placeholder="OP_C" />
                </div>
                <div>
                  <Label>{t("documents.typeLabel")}</Label>
                  <Input value={typeLabel} onChange={(e) => setTypeLabel(e.target.value)} placeholder="Op C" />
                </div>
              </div>
              <div>
                <Label>{t("documents.typeTitleField")}</Label>
                <Input value={typeTitle} onChange={(e) => setTypeTitle(e.target.value)} />
              </div>
              <div>
                <Label>{t("documents.typeDescription")}</Label>
                <Input value={typeDescription} onChange={(e) => setTypeDescription(e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>{t("documents.typeTheme")}</Label>
                  <Select value={preparationTheme} onChange={setPreparationTheme} options={THEME_OPTIONS} />
                </div>
                <div>
                  <Label>{t("documents.typeDuration")}</Label>
                  <Input type="number" min="1" max="30" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} />
                </div>
              </div>
              <Button size="sm" disabled={saving} onClick={() => void handleCreateType()}>
                {saving ? t("common.saving") : t("documents.typeAddButton")}
              </Button>
            </div>
          </ComponentCard>

          <ComponentCard title={t("documents.typeCustomList")} desc={t("documents.typeListDesc")}>
            {customTypes.length === 0 ? (
              <p className="text-sm text-gray-500">{t("documents.typeCustomEmpty")}</p>
            ) : (
              <div className="space-y-6">
                {activityKinds.map((kind) => {
                  const items = typesByCategory[kind] ?? [];
                  if (items.length === 0) return null;
                  return (
                    <div key={kind}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {categoryLabelForKind(categories, kind, t)}
                      </p>
                      <ul className="space-y-2">
                        {items.map((item) => (
                          <li
                            key={item.code}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                                {item.label} ({item.code})
                              </p>
                              <p className="truncate text-xs text-gray-500">{item.title}</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => void handleDeleteType(item.code)}>
                              {t("common.delete")}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </ComponentCard>
        </div>
      )}
    </>
  );
}
