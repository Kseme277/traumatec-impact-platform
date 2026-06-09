import { useAuth } from "@clerk/clerk-react";
import { Play, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminBreadcrumb from "../../components/common/AdminBreadcrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import Switch from "../../components/form/switch/Switch";
import Button from "../../components/ui/button/Button";
import Select from "../../components/form/Select";
import {
  fetchStorageGcAnalytics,
  fetchStorageGcConfig,
  runStorageGc,
  updateStorageGcConfig,
  type StorageGcAnalytics,
  type StorageGcConfig,
  type StorageGcStats,
} from "../../api/storageGc";
import StorageGcCharts from "../../features/admin/StorageGcCharts";
import { ApiError } from "../../api/client";
import { useTranslation } from "../../i18n/useTranslation";
import { confirmAction, showError, showSuccess } from "../../lib/swal";

const RETENTION_OPTIONS = [7, 14, 30, 60, 90];

export default function ParametresStockagePage() {
  const { getToken } = useAuth();
  const { t, localeTag } = useTranslation();
  const [config, setConfig] = useState<StorageGcConfig | null>(null);
  const [analytics, setAnalytics] = useState<StorageGcAnalytics | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [retentionDays, setRetentionDays] = useState(14);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const retentionOptions = useMemo(
    () =>
      RETENTION_OPTIONS.map((days) => ({
        value: String(days),
        label: `${days} ${t("storageGc.days")}`,
      })),
    [t],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const [cfg, stats] = await Promise.all([
        fetchStorageGcConfig(token),
        fetchStorageGcAnalytics(token),
      ]);
      setConfig(cfg);
      setAnalytics(stats);
      setEnabled(cfg.enabled);
      setRetentionDays(cfg.retention_days);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t("storageGc.loadFailed");
      await showError(t("common.error"), message);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = await getToken();
      const cfg = await updateStorageGcConfig(token, {
        enabled,
        retention_days: retentionDays,
      });
      setConfig(cfg);
      await showSuccess(t("storageGc.saved"), t("storageGc.savedDesc"));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t("storageGc.saveFailed");
      await showError(t("common.error"), message);
    } finally {
      setIsSaving(false);
    }
  };

  const buildRunMessage = (stats: StorageGcStats) => {
    const purged = stats?.jobs_purged ?? 0;
    const withZip = stats?.jobs_with_zip ?? config?.inventory.jobs_with_zip ?? 0;
    const eligible = stats?.jobs_eligible ?? 0;

    if (purged > 0) {
      return t("storageGc.runDoneDesc")
        .replace("{jobs}", String(purged))
        .replace("{objects}", String(stats?.objects_deleted ?? 0));
    }
    if (withZip > 0 && eligible === 0) {
      return t("storageGc.runDoneNothingEligible")
        .replace("{count}", String(withZip))
        .replace("{days}", String(retentionDays));
    }
    return t("storageGc.runDoneNothing");
  };

  const handleRun = async (purgeAll = false) => {
    if (purgeAll) {
      const confirmed = await confirmAction({
        title: t("storageGc.purgeAllTitle"),
        text: t("storageGc.purgeAllDesc"),
        confirmText: t("storageGc.purgeAllConfirm"),
        cancelText: t("common.cancel"),
        icon: "warning",
      });
      if (!confirmed.isConfirmed) return;
    }

    setIsRunning(true);
    try {
      const token = await getToken();
      const result = await runStorageGc(token, { purgeAll });
      await showSuccess(t("storageGc.runDone"), buildRunMessage(result.stats));
      await load();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t("storageGc.runFailed");
      await showError(t("common.error"), message);
    } finally {
      setIsRunning(false);
    }
  };

  const lastRun = config?.last_run_at
    ? new Date(config.last_run_at).toLocaleString(localeTag)
    : t("storageGc.never");

  return (
    <>
      <PageMeta title={`${t("storageGc.title")} | TIP`} description={t("storageGc.desc")} />
      <AdminBreadcrumb
        pageTitle={t("storageGc.title")}
        crumbs={[{ label: t("nav.admin"), to: "/admin/utilisateurs" }]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <ComponentCard title={t("storageGc.configTitle")} desc={t("storageGc.configDesc")}>
          {isLoading ? (
            <p className="text-sm text-gray-500">{t("common.loading")}</p>
          ) : (
            <div className="space-y-5">
              <Switch label={t("storageGc.enabled")} checked={enabled} onChange={setEnabled} />
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("storageGc.retentionDays")}
                </label>
                <Select
                  value={String(retentionDays)}
                  options={retentionOptions}
                  onChange={(value) => setRetentionDays(Number(value))}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button size="sm" onClick={() => void handleSave()} disabled={isSaving}>
                  {isSaving ? t("common.saving") : t("common.save")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  startIcon={<Play className="size-4" />}
                  onClick={() => void handleRun(false)}
                  disabled={isRunning}
                >
                  {isRunning ? t("storageGc.running") : t("storageGc.runNow")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="!text-error-600 !border-error-300 hover:!bg-error-50 dark:!text-error-400 dark:!border-error-500/40"
                  onClick={() => void handleRun(true)}
                  disabled={isRunning || (config?.inventory.jobs_with_zip ?? 0) === 0}
                >
                  {t("storageGc.purgeAll")}
                </Button>
              </div>
            </div>
          )}
        </ComponentCard>

        <ComponentCard title={t("storageGc.inventoryTitle")} desc={t("storageGc.inventoryDesc")}>
          {isLoading ? (
            <p className="text-sm text-gray-500">{t("common.loading")}</p>
          ) : (
            <ul className="list-inside list-disc space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <li>
                <span className="font-medium">{config?.inventory.jobs_with_zip ?? 0}</span> —{" "}
                {t("storageGc.zipAvailable")}
              </li>
              <li>
                <span className="font-medium">{config?.inventory.jobs_eligible ?? 0}</span> —{" "}
                {t("storageGc.zipEligible")}
              </li>
              <li>
                <span className="font-medium">{config?.inventory.jobs_purged_history ?? 0}</span> —{" "}
                {t("storageGc.zipPurgedHistory")}
              </li>
            </ul>
          )}
          {config && config.inventory.jobs_eligible === 0 && config.inventory.jobs_with_zip > 0 && (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{t("storageGc.noEligibleHint")}</p>
          )}
        </ComponentCard>

        <ComponentCard title={t("storageGc.statsTitle")} desc={t("storageGc.statsDesc")}>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <p>
              <span className="font-medium">{t("storageGc.lastRun")} :</span> {lastRun}
            </p>
            {config?.last_stats ? (
              <ul className="list-inside list-disc space-y-1">
                <li>
                  {config.last_stats.jobs_purged ?? 0} {t("storageGc.statJobsSuffix")}
                </li>
                <li>
                  {config.last_stats.objects_deleted ?? 0} {t("storageGc.statObjectsSuffix")}
                </li>
                <li>
                  {t("storageGc.statRetentionPrefix")} {config.last_stats.retention_days ?? retentionDays}{" "}
                  {t("storageGc.days")}
                </li>
              </ul>
            ) : (
              <p className="flex items-center gap-2 text-gray-500">
                <Trash2 className="size-4" />
                {t("storageGc.noStats")}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("storageGc.hint")}</p>
          </div>
        </ComponentCard>
      </div>

      {!isLoading && analytics && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("storageGc.chartsSectionTitle")}
          </h2>
          <StorageGcCharts analytics={analytics} />
        </div>
      )}
    </>
  );
}
