import { useAuth } from "@clerk/clerk-react";
import { Download, Play, Search } from "lucide-react";
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
const EVENTS_PAGE_SIZE = 15;

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
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsPage, setEventsPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
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

  const eventsTotalPages = Math.max(1, Math.ceil(eventsTotal / EVENTS_PAGE_SIZE));
  const eventsRangeStart = eventsTotal === 0 ? 0 : (eventsPage - 1) * EVENTS_PAGE_SIZE + 1;
  const eventsRangeEnd = Math.min(eventsPage * EVENTS_PAGE_SIZE, eventsTotal);

  const loadConfigAndExports = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const [cfg, files] = await Promise.all([fetchAuditConfig(token), fetchAuditExports(token)]);
      setConfig(cfg);
      setExports(files);
    } catch (err) {
      await showError("Audit", err instanceof ApiError ? err.message : "Chargement impossible");
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  const loadEvents = useCallback(async () => {
    setIsEventsLoading(true);
    try {
      const token = await getToken();
      const response = await fetchAuditEvents(token, {
        q: appliedQuery || undefined,
        page: eventsPage,
        page_size: EVENTS_PAGE_SIZE,
      });
      setEvents(response.items);
      setEventsTotal(response.total);
    } catch (err) {
      await showError(t("audit.eventsTitle"), err instanceof ApiError ? err.message : "Chargement impossible");
    } finally {
      setIsEventsLoading(false);
    }
  }, [appliedQuery, eventsPage, getToken, t]);

  useEffect(() => {
    void loadConfigAndExports();
  }, [loadConfigAndExports]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const handleSearch = () => {
    setEventsPage(1);
    setAppliedQuery(searchQuery.trim());
  };

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
      await loadConfigAndExports();
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
        <ComponentCard title={t("audit.eventsTitle")} desc={t("audit.eventsDesc")}>
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="min-w-[220px] flex-1">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("audit.searchPlaceholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
            </div>
            <Button size="sm" variant="outline" onClick={() => handleSearch()}>
              <Search className="mr-2 size-4" />
              {t("common.search")}
            </Button>
          </div>

          {isEventsLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("common.loading")}</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("audit.noEvents")}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-theme-xs uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
                      <th className="px-3 py-2">{t("audit.created")}</th>
                      <th className="px-3 py-2">{t("audit.actor")}</th>
                      <th className="px-3 py-2">{t("audit.actionLabel")}</th>
                      <th className="px-3 py-2">{t("audit.entityLabel")}</th>
                      <th className="px-3 py-2">{t("audit.details")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {events.map((event) => (
                      <tr key={event.id}>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-300">
                          {formatDate(event.created_at)}
                        </td>
                        <td className="px-3 py-2 text-gray-800 dark:text-white/90">
                          <p className="font-medium">
                            {event.actor_name ?? (event.actor_id ? `#${event.actor_id}` : "—")}
                          </p>
                          {event.actor_email && (
                            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                              {event.actor_email}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-theme-xs text-gray-800 dark:text-white/90">
                          {(() => {
                            const key = `audit.actions.${event.action.replace(/\./g, "_")}`;
                            const label = t(key);
                            return label !== key ? label : event.action;
                          })()}
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                          {event.entity_type ?? "—"}
                          {event.entity_id ? ` #${event.entity_id}` : ""}
                        </td>
                        <td className="max-w-xs truncate px-3 py-2 text-theme-xs text-gray-500 dark:text-gray-400">
                          {event.payload ? JSON.stringify(event.payload) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <DataTablePagination
                page={eventsPage}
                totalPages={eventsTotalPages}
                totalItems={eventsTotal}
                rangeStart={eventsRangeStart}
                rangeEnd={eventsRangeEnd}
                onPageChange={setEventsPage}
              />
            </>
          )}
        </ComponentCard>
      </div>
    </>
  );
}
