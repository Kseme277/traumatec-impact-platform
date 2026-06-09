import { useAuth } from "@clerk/clerk-react";
import { Download, Play } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AdminBreadcrumb from "../../components/common/AdminBreadcrumb";
import ComponentCard from "../../components/common/ComponentCard";
import DataTablePagination from "../../components/common/DataTablePagination";
import PageMeta from "../../components/common/PageMeta";
import Switch from "../../components/form/switch/Switch";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import {
  downloadAuditExport,
  fetchAuditConfig,
  fetchAuditEvents,
  fetchAuditExports,
  runAuditExport,
  updateAuditConfig,
  type AuditExportConfig,
  type AuditExportFile,
  type AuditLog,
} from "../../api/audit";
import { ApiError } from "../../api/client";
import { useTranslation } from "../../i18n/useTranslation";
import { usePagination } from "../../hooks/usePagination";
import { showError, showSuccess } from "../../lib/swal";

const EXPORTS_PAGE_SIZE = 5;

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AuditPage() {
  const { getToken } = useAuth();
  const { t, localeTag } = useTranslation();
  const [config, setConfig] = useState<AuditExportConfig | null>(null);
  const [exports, setExports] = useState<AuditExportFile[]>([]);
  const [events, setEvents] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const {
    paginatedItems: paginatedExports,
    page: exportsPage,
    setPage: setExportsPage,
    totalPages: exportsTotalPages,
    totalItems: exportsTotalItems,
    rangeStart: exportsRangeStart,
    rangeEnd: exportsRangeEnd,
  } = usePagination(exports, EXPORTS_PAGE_SIZE, String(exports.length));

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const [cfg, files, logs] = await Promise.all([
        fetchAuditConfig(token),
        fetchAuditExports(token),
        fetchAuditEvents(token),
      ]);
      setConfig(cfg);
      setExports(files);
      setEvents(logs);
    } catch (err) {
      await showError("Audit", err instanceof ApiError ? err.message : "Chargement impossible");
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaveConfig = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      const token = await getToken();
      const updated = await updateAuditConfig(token, {
        interval_hours: config.interval_hours,
        enabled: config.enabled,
      });
      setConfig(updated);
      await showSuccess(t("common.save"), "");
    } catch (err) {
      await showError(t("common.save"), err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunExport = async () => {
    setIsRunning(true);
    try {
      const token = await getToken();
      await runAuditExport(token);
      await showSuccess(t("audit.runNow"), "");
      await load();
    } catch (err) {
      await showError(t("audit.runNow"), err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setIsRunning(false);
    }
  };

  const handleDownload = async (file: AuditExportFile) => {
    try {
      const token = await getToken();
      const filename = file.storage_key.split("/").pop() ?? "audit.jsonl";
      await downloadAuditExport(token, file.id, filename);
    } catch {
      await showError(t("common.download"), "MinIO indisponible ou fichier absent");
    }
  };

  const formatDate = (value: string) => new Date(value).toLocaleString(localeTag);

  return (
    <>
      <PageMeta title={`${t("audit.title")} | TIP`} description={t("audit.desc")} />
      <AdminBreadcrumb
        pageTitle={t("audit.title")}
        crumbs={[{ label: t("nav.admin"), to: "/" }, { label: t("nav.audit") }]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ComponentCard title={t("audit.configTitle")} desc={t("audit.configDesc")}>
          {isLoading || !config ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("common.loading")}</p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("audit.intervalHours")}
                </label>
                <Input
                  type="number"
                  min={1}
                  max={720}
                  value={String(config.interval_hours)}
                  onChange={(e) =>
                    setConfig({ ...config, interval_hours: Number(e.target.value) || 24 })
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-800">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {config.enabled ? t("common.enabled") : t("common.disabled")}
                </span>
                <Switch
                  checked={config.enabled}
                  onChange={(checked) => setConfig({ ...config, enabled: checked })}
                  aria-label="Activer exports planifiés"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button size="sm" disabled={isSaving} onClick={() => void handleSaveConfig()}>
                  {isSaving ? t("common.loading") : t("common.save")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isRunning}
                  onClick={() => void handleRunExport()}
                >
                  <Play className="mr-2 size-4" aria-hidden />
                  {isRunning ? t("common.loading") : t("audit.runNow")}
                </Button>
              </div>
            </div>
          )}
        </ComponentCard>

        <ComponentCard title={t("audit.exportsTitle")}>
          {isLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("common.loading")}</p>
          ) : exports.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("audit.noExports")}</p>
          ) : (
            <>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginatedExports.map((file) => (
                  <li
                    key={file.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                        {file.storage_key.split("/").pop()}
                      </p>
                      <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                        {formatDate(file.period_start)} → {formatDate(file.period_end)} ·{" "}
                        {file.record_count} {t("audit.records").toLowerCase()} ·{" "}
                        {formatBytes(file.file_size_bytes)}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => void handleDownload(file)}>
                      <Download className="mr-2 size-4" aria-hidden />
                      {t("common.download")}
                    </Button>
                  </li>
                ))}
              </ul>
              <DataTablePagination
                page={exportsPage}
                totalPages={exportsTotalPages}
                totalItems={exportsTotalItems}
                rangeStart={exportsRangeStart}
                rangeEnd={exportsRangeEnd}
                onPageChange={setExportsPage}
              />
            </>
          )}
        </ComponentCard>
      </div>

      <div className="mt-6">
        <ComponentCard title={t("audit.eventsTitle")}>
          {events.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("audit.noEvents")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-theme-xs uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    <th className="px-3 py-2">{t("audit.created")}</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Entité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-300">
                        {formatDate(event.created_at)}
                      </td>
                      <td className="px-3 py-2 font-mono text-theme-xs text-gray-800 dark:text-white/90">
                        {event.action}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                        {event.entity_type ?? "—"}
                        {event.entity_id ? ` #${event.entity_id}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ComponentCard>
      </div>
    </>
  );
}
