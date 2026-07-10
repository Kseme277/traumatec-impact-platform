import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import Switch from "../../components/form/switch/Switch";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";
import Label from "../../components/form/Label";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  activatePackageBundle,
  bootstrapSystemPackages,
  deletePackageBundle,
  deleteTemplate,
  downloadPackageBundleZip,
  downloadPackageTypeZip,
  downloadTemplate,
  fetchPackageBundles,
  fetchPackageCatalog,
  fetchTemplateEditorConfig,
  fetchTemplates,
  replaceTemplateFile,
  uploadPackageZip,
} from "../../api/catalog";
import { ApiError } from "../../api/client";
import { getApiToken } from "../../lib/clerkToken";
import { useTranslation } from "../../i18n/useTranslation";
import type { PackageBundle, PackageImportProgress, PackageTemplate, TemplateEditorConfig } from "./types";
import { templateDisplayName } from "./types";
import PackageImportProgressBar from "./PackageImportProgressBar";
import {
  FALLBACK_PACKAGE_TYPES,
  activityKindsFromCatalog,
  activityTabForKind,
  allPackageTypesFromCatalog,
  canonicalPackageType,
  categoryLabelForKind,
  findPackageType,
  mergePackageCatalog,
  type ActivityKind,
} from "./eventPackageTypes";
import { documentRoleLabel } from "./documentRoleLabel";
import { themeLabel, type PreparationTheme } from "../events/types";
import { confirmAction, showError, showSuccess } from "../../lib/swal";
import { revalidateTipKeys, useTipSWR } from "../../lib/swr";
import OnlyOfficeEditor from "./OnlyOfficeEditor";
import TemplateFileFieldsPanel from "./TemplateFileFieldsPanel";
import { isOnlyofficeEditable, templateFileExtension } from "./templateFileExtension";
import { Download, Eye, Trash2 } from "lucide-react";
import TableIconButton from "../../components/common/TableIconButton";
import DocumentFileManagerTable from "./DocumentFileManagerTable";
import { filterTemplatesByPackageDuration } from "./templateDurationFilter";

interface PackageTemplatesManagerProps {
  isAdmin: boolean;
}

export default function PackageTemplatesManager({ isAdmin }: PackageTemplatesManagerProps) {
  const { t, localeTag } = useTranslation();
  const { getToken } = useAuth();
  const [searchParams] = useSearchParams();
  const zipInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const [activityTab, setActivityTab] = useState<ActivityKind>("cours");
  const [selectedType, setSelectedType] = useState("OP_C");
  const [openedTemplateId, setOpenedTemplateId] = useState<string | null>(null);
  const [editorConfig, setEditorConfig] = useState<TemplateEditorConfig | null>(null);
  const [editorNote, setEditorNote] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<PackageImportProgress | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isEditorLoading, setIsEditorLoading] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [importUseAi, setImportUseAi] = useState(false);

  const {
    data: catalogData,
    isLoading: catalogLoading,
    error: catalogError,
    mutate: mutateCatalog,
  } = useTipSWR(["package-catalog"] as const, async (token) => {
    try {
      return await fetchPackageCatalog(token);
    } catch {
      return { categories: [], types: {} };
    }
  });

  const {
    data: bundlesData,
    isLoading: bundlesLoading,
    error: bundlesError,
    mutate: mutateBundles,
  } = useTipSWR(["package-bundles"] as const, (token) => fetchPackageBundles(token));

  const catalog = useMemo(
    () => (catalogData ? mergePackageCatalog(catalogData) : FALLBACK_PACKAGE_TYPES),
    [catalogData],
  );
  const categories = catalogData?.categories ?? [];
  const bundles = bundlesData ?? [];

  const typesInTab = catalog[activityTab] ?? [];
  const activityKinds = useMemo(
    () => (categories.length ? categories.map((item) => item.code) : activityKindsFromCatalog(catalog)),
    [categories, catalog],
  );

  useEffect(() => {
    const rawType = searchParams.get("type") ?? searchParams.get("package_type");
    if (!rawType) return;
    const code = rawType.toUpperCase().replace(/-/g, "_");
    const allTypes = allPackageTypesFromCatalog(catalog);
    const match = allTypes.find((item) => item.code === code);
    if (!match) return;
    setActivityTab(activityTabForKind(match.activity_kind));
    setSelectedType(match.code);
  }, [searchParams, catalog]);

  useEffect(() => {
    if (activityKinds.length && !activityKinds.includes(activityTab)) {
      setActivityTab(activityKinds[0] ?? "cours");
    }
  }, [activityKinds, activityTab]);

  useEffect(() => {
    if (!typesInTab.some((item) => item.code === selectedType)) {
      setSelectedType(typesInTab[0]?.code ?? "OP_C");
    }
  }, [activityTab, typesInTab, selectedType]);

  const closeEditor = useCallback(() => {
    setOpenedTemplateId(null);
    setEditorConfig(null);
    setEditorNote(null);
  }, []);

  const typeBundles = useMemo(
    () => bundles.filter((b) => canonicalPackageType(b.package_type) === selectedType),
    [bundles, selectedType],
  );
  const activeBundle = typeBundles.find((b) => b.is_active) ?? null;

  const {
    data: templatesData,
    isLoading: templatesLoading,
    error: templatesError,
    mutate: mutateTemplates,
  } = useTipSWR(
    ["package-templates", selectedType, activeBundle?.id ?? null] as const,
    async (token) => {
      try {
        return await fetchTemplates(
          token,
          activeBundle ? { bundleId: activeBundle.id } : { packageType: selectedType },
        );
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
          return [];
        }
        throw err;
      }
    },
  );

  const templates = templatesData ?? [];

  useEffect(() => {
    setOpenedTemplateId((prev) => {
      if (prev && templates.some((row) => row.id === prev)) return prev;
      return null;
    });
  }, [templates]);

  const typeInfo = findPackageType(catalog, selectedType);
  const visibleTemplates = useMemo(
    () => filterTemplatesByPackageDuration(templates, typeInfo?.duration_days ?? 3),
    [templates, typeInfo?.duration_days],
  );
  const templateById = useMemo(
    () => new Map(visibleTemplates.map((tmpl) => [tmpl.id, tmpl])),
    [visibleTemplates],
  );
  const fileManagerRows = useMemo(
    () =>
      visibleTemplates.map((tmpl) => ({
        id: tmpl.id,
        name: templateDisplayName(tmpl),
        filePath: tmpl.file_path,
        subtitle: documentRoleLabel(tmpl.document_type, t),
        category: documentRoleLabel(tmpl.document_type, t),
        modifiedAt: tmpl.created_at,
        isActive: tmpl.id === openedTemplateId,
      })),
    [visibleTemplates, openedTemplateId, t],
  );

  const isLoading = (catalogLoading && !catalogData) || (bundlesLoading && !bundlesData);
  const isTemplatesLoading = templatesLoading && !templatesData;
  const loadError = (() => {
    const err = catalogError ?? bundlesError ?? templatesError;
    if (!err) return null;
    if (err instanceof ApiError) return err.message;
    if (err instanceof TypeError) return t("documents.catalogUnavailable");
    if (err instanceof DOMException && err.name === "AbortError") return t("documents.catalogTimeout");
    return t("documents.loadTemplatesFailed");
  })();

  const refreshAll = useCallback(async () => {
    await Promise.all([mutateCatalog(), mutateBundles(), mutateTemplates()]);
  }, [mutateBundles, mutateCatalog, mutateTemplates]);

  const openedTemplate = templates.find((row) => row.id === openedTemplateId) ?? null;
  const isEditorOpen = openedTemplateId !== null;

  const openTemplate = useCallback(
    async (template: PackageTemplate) => {
      if (!isOnlyofficeEditable(template.file_path)) {
        await showError(
          t("common.error"),
          t("documents.onlyofficeUnsupportedFormat"),
        );
        return;
      }

      setOpenedTemplateId(template.id);
      setEditorConfig(null);
      setEditorNote(null);
      setIsEditorLoading(true);

      const mode = isAdmin ? "edit" : "view";
      try {
        const token = await getApiToken(getToken);
        const config = await fetchTemplateEditorConfig(token, template.id, mode);
        setEditorConfig(config);
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : t("documents.editorLoadFailed");
        setEditorNote(message);
      } finally {
        setIsEditorLoading(false);
      }
    },
    [getToken, isAdmin, t],
  );

  const handleUploadZip = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      await showError(t("common.error"), t("documents.packageZipOnly"));
      return;
    }
    setIsUploading(true);
    setUploadProgress(null);
    try {
      const token = await getApiToken(getToken);
      const result = await uploadPackageZip(token, file, {
        packageType: selectedType,
        activate: true,
        useAi: importUseAi,
        onProgress: setUploadProgress,
      });
      await showSuccess(t("documents.packageUploadDone"), result.message);
      await revalidateTipKeys("package-bundles", "package-templates");
    } catch (err) {
      await showError(t("common.error"), err instanceof ApiError ? err.message : t("documents.packageUploadFailed"));
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (zipInputRef.current) zipInputRef.current.value = "";
    }
  };

  const handleActivate = async (bundle: PackageBundle) => {
    setBusyId(bundle.id);
    try {
      const token = await getApiToken(getToken);
      await activatePackageBundle(token, bundle.id);
      await showSuccess(t("documents.packageActivated"), bundle.label);
      await revalidateTipKeys("package-bundles", "package-templates");
    } catch (err) {
      await showError(t("common.error"), err instanceof ApiError ? err.message : t("documents.packageActivateFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteBundle = async (bundle: PackageBundle) => {
    const confirmed = await confirmAction({
      title: t("documents.deleteBundleTitle"),
      text: `${bundle.package_type} v${bundle.version}`,
      confirmText: t("common.delete"),
      icon: "warning",
    });
    if (!confirmed.isConfirmed) return;
    setBusyId(bundle.id);
    try {
      const token = await getApiToken(getToken);
      await deletePackageBundle(token, bundle.id);
      await showSuccess(t("documents.bundleDeleted"), bundle.label);
      await revalidateTipKeys("package-bundles", "package-templates");
    } catch (err) {
      await showError(t("common.error"), err instanceof ApiError ? err.message : t("documents.bundleDeleteFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteTemplate = async (template: PackageTemplate) => {
    const confirmed = await confirmAction({
      title: t("documents.deleteFileTitle"),
      text: templateDisplayName(template),
      confirmText: t("common.delete"),
      icon: "warning",
    });
    if (!confirmed.isConfirmed) return;
    setBusyId(template.id);
    try {
      const token = await getApiToken(getToken);
      await deleteTemplate(token, template.id);
      await showSuccess(t("documents.fileDeleted"), templateDisplayName(template));
      if (openedTemplateId === template.id) {
        setOpenedTemplateId(null);
        setEditorConfig(null);
      }
      await mutateTemplates();
    } catch (err) {
      await showError(t("common.error"), err instanceof ApiError ? err.message : t("documents.fileDeleteFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const handleReplaceFile = async (file: File) => {
    if (!openedTemplate) return;
    setBusyId(openedTemplate.id);
    try {
      const result = await replaceTemplateFile(getToken, openedTemplate.id, file);
      await showSuccess(t("documents.templateUpdated"), result.message);
      await mutateTemplates();
      await openTemplate(result.template);
    } catch (err) {
      await showError(t("common.error"), err instanceof ApiError ? err.message : t("documents.replaceFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const handleDownloadFile = async (template: PackageTemplate) => {
    setBusyId(template.id);
    try {
      const { blob, filename } = await downloadTemplate(getToken, template.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      await showError(t("common.error"), err instanceof ApiError ? err.message : t("documents.downloadFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const handleDownloadBundleZip = async () => {
    setIsDownloadingZip(true);
    try {
      if (activeBundle) {
        await downloadPackageBundleZip(
          getToken,
          activeBundle.id,
          `${activeBundle.package_type}_v${activeBundle.version}.zip`,
        );
      } else {
        await downloadPackageTypeZip(
          getToken,
          selectedType,
          `${selectedType}.zip`,
        );
      }
    } catch (err) {
      await showError(t("common.error"), err instanceof ApiError ? err.message : t("documents.bundleZipFailed"));
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleBootstrap = async () => {
    setIsBootstrapping(true);
    try {
      const token = await getApiToken(getToken);
      const result = await bootstrapSystemPackages(token, true);
      await showSuccess(t("documents.bootstrapDone"), result.message);
      await revalidateTipKeys("package-bundles", "package-templates");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof DOMException && err.name === "AbortError"
            ? t("documents.bootstrapTimeout")
            : t("documents.bootstrapFailed");
      await showError(t("common.error"), message);
    } finally {
      setIsBootstrapping(false);
    }
  };

  const handleDocumentSaved = useCallback(async () => {
    if (!openedTemplateId) return;
    try {
      const data = await mutateTemplates();
      const refreshed = data?.find((row) => row.id === openedTemplateId);
      if (refreshed) await openTemplate(refreshed);
    } catch {
      /* le rechargement échoue silencieusement — l'éditeur reste ouvert */
    }
  }, [mutateTemplates, openTemplate, openedTemplateId]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4 dark:border-brand-500/20 dark:bg-brand-500/5">
        <p className="text-sm text-gray-700 dark:text-gray-200">{t("documents.eventTypeHelp")}</p>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t("documents.eventVsPackageHelp")}</p>
      </div>

      {isAdmin ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t("documents.catalogAdminHint")}</p>
          <Link to="/admin/referentiels/types-paquets">
            <Button size="sm" variant="outline">{t("documents.manageCatalog")}</Button>
          </Link>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {activityKinds.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setActivityTab(kind)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activityTab === kind
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {categoryLabelForKind(categories, kind, t)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {typesInTab.map((item) => (
          <button
            key={item.code}
            type="button"
            onClick={() => setSelectedType(item.code)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              selectedType === item.code
                ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {typeInfo && (
        <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gray-800 dark:text-white/90">{typeInfo.title}</h3>
            <Badge color="primary" size="sm">{typeInfo.activity_label}</Badge>
            <Badge color="light" size="sm">{themeLabel(typeInfo.preparation_theme as PreparationTheme)}</Badge>
            <Badge color="info" size="sm">
              {typeInfo.duration_days} {typeInfo.duration_days > 1 ? t("documents.days") : t("documents.day")}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{typeInfo.description}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {isAdmin && (
          <>
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip"
              aria-label={t("documents.addPackageVersion")}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUploadZip(file);
              }}
            />
            <Button size="sm" disabled={isUploading} onClick={() => zipInputRef.current?.click()}>
              {isUploading ? t("common.importing") : t("documents.addPackageVersion")}
            </Button>
            <div className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800">
              <Switch
                checked={importUseAi}
                disabled={isUploading}
                aria-label={t("documents.importUseAi")}
                onChange={setImportUseAi}
              />
              <div>
                <p className="text-xs font-medium text-gray-800 dark:text-white/90">{t("documents.importUseAi")}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{t("documents.importUseAiHint")}</p>
              </div>
            </div>
          </>
        )}
        <Link to="/documents/generation">
          <Button size="sm" variant="outline">{t("documents.goToGeneration")}</Button>
        </Link>
        <Button size="sm" variant="outline" disabled={isLoading} onClick={() => void refreshAll()}>
          {t("common.refresh")}
        </Button>
        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            disabled={isBootstrapping}
            onClick={() => void handleBootstrap()}
          >
            {isBootstrapping ? t("common.importing") : t("documents.bootstrapPackages")}
          </Button>
        )}
      </div>

      {uploadProgress && <PackageImportProgressBar progress={uploadProgress} />}

      {loadError ? (
        <p className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
          {loadError}
        </p>
      ) : null}

      {isLoading || isBootstrapping ? (
        <p className="text-sm text-gray-500">
          {isBootstrapping ? t("documents.bootstrapInProgress") : t("common.loading")}
        </p>
      ) : (
        <>
          <div>
            <Label>{t("documents.packageVersionsForType")}</Label>
            {typeBundles.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">{t("documents.legacyPackageHint")}</p>
            ) : (
              <div className="mt-2 overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableCell isHeader className="px-3 py-2 text-xs">{t("common.version")}</TableCell>
                      <TableCell isHeader className="px-3 py-2 text-xs">{t("common.file")}</TableCell>
                      <TableCell isHeader className="px-3 py-2 text-xs">{t("common.date")}</TableCell>
                      <TableCell isHeader className="px-3 py-2 text-xs">{t("common.status")}</TableCell>
                      {isAdmin && (
                        <TableCell isHeader className="px-3 py-2 text-xs text-right">{t("common.actions")}</TableCell>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {typeBundles.map((bundle) => (
                      <TableRow key={bundle.id}>
                        <TableCell className="px-3 py-2 font-medium">v{bundle.version}</TableCell>
                        <TableCell className="px-3 py-2 text-sm text-gray-500">
                          {bundle.file_count} {t("documents.files")} · {bundle.source_zip_name ?? "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-xs text-gray-500">
                          {new Date(bundle.created_at).toLocaleString(localeTag)}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <Badge color={bundle.is_active ? "success" : "light"} size="sm">
                            {bundle.is_active ? t("documents.packageActive") : t("documents.packageInactive")}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="px-3 py-2 text-right space-x-2">
                            {!bundle.is_active && (
                              <button
                                type="button"
                                className="text-xs font-medium text-brand-500 hover:underline"
                                disabled={busyId === bundle.id}
                                onClick={() => void handleActivate(bundle)}
                              >
                                {t("documents.activatePackage")}
                              </button>
                            )}
                            {!bundle.is_active && (
                              <button
                                type="button"
                                className="text-xs font-medium text-error-500 hover:underline"
                                disabled={busyId === bundle.id}
                                onClick={() => void handleDeleteBundle(bundle)}
                              >
                                {t("common.delete")}
                              </button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {isTemplatesLoading ? (
            <p className="text-sm text-gray-500">{t("documents.loadingTemplates")}</p>
          ) : visibleTemplates.length === 0 ? (
            <p className="text-sm text-gray-500">{t("documents.noTemplatesAdmin")}</p>
          ) : (
            <div
              className={
                isEditorOpen
                  ? "grid grid-cols-1 gap-6 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]"
                  : "w-full"
              }
            >
              <div className={isEditorOpen ? "max-h-[min(55vh,520px)] overflow-auto" : undefined}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {activeBundle
                      ? `${t("documents.filesInVersion")} v${activeBundle.version}`
                      : t("documents.filesSystemPackage")}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isDownloadingZip || visibleTemplates.length === 0}
                    onClick={() => void handleDownloadBundleZip()}
                  >
                    {isDownloadingZip ? t("common.downloading") : t("documents.downloadBundleZip")}
                  </Button>
                </div>
                <DocumentFileManagerTable
                    rows={fileManagerRows}
                    renderActions={(row) => {
                      const tmpl = templateById.get(row.id);
                      if (!tmpl) return null;
                      const editable = isOnlyofficeEditable(tmpl.file_path);
                      return (
                        <>
                          {editable ? (
                            <TableIconButton
                              label={isAdmin ? t("documents.openAndEdit") : t("documents.openFile")}
                              disabled={busyId === tmpl.id}
                              onClick={() => void openTemplate(tmpl)}
                            >
                              <Eye className="size-4.5" />
                            </TableIconButton>
                          ) : null}
                          <TableIconButton
                            label={t("common.download")}
                            disabled={busyId === tmpl.id}
                            onClick={() => void handleDownloadFile(tmpl)}
                          >
                            <Download className="size-4.5" />
                          </TableIconButton>
                          {isAdmin ? (
                            <TableIconButton
                              label={t("common.delete")}
                              variant="danger"
                              disabled={busyId === tmpl.id}
                              onClick={() => void handleDeleteTemplate(tmpl)}
                            >
                              <Trash2 className="size-4.5" />
                            </TableIconButton>
                          ) : null}
                        </>
                      );
                    }}
                  />
              </div>

              {isEditorOpen && openedTemplate ? (
                <div className="rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="border-b border-gray-100 p-4 dark:border-gray-800">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold">{openedTemplate.name}</h4>
                        <p className="mt-1 text-xs text-gray-500">
                          {documentRoleLabel(openedTemplate.document_type, t)} · {templateFileExtension(openedTemplate.file_path)}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={closeEditor}>
                        {t("documents.closeEditor")}
                      </Button>
                    </div>
                    {isAdmin && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => replaceInputRef.current?.click()}>
                          {t("documents.replaceFile")}
                        </Button>
                        <input
                          ref={replaceInputRef}
                          type="file"
                          aria-label={t("documents.replaceFile")}
                          className="hidden"
                          accept=".doc,.docx,.odt,.xlsx,.xls,.ods"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleReplaceFile(file);
                            e.target.value = "";
                          }}
                        />
                      </div>
                    )}
                    <p className="mt-2 text-xs text-gray-500">{t("documents.editorSaveHint")}</p>
                    <TemplateFileFieldsPanel template={openedTemplate} />
                  </div>
                  <div className="min-h-[400px] p-3">
                    {editorNote ? (
                      <p className="text-sm text-error-500">{editorNote}</p>
                    ) : isEditorLoading ? (
                      <p className="text-sm text-gray-500">{t("documents.onlyofficeLoading")}</p>
                    ) : (
                      <OnlyOfficeEditor
                        editorConfig={editorConfig}
                        className="min-h-[380px]"
                        onDocumentSaved={() => void handleDocumentSaved()}
                      />
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}

