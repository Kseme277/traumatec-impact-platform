import { Link } from "react-router";
import { ArrowRight, FileArchive } from "lucide-react";
import Badge from "../../components/ui/badge/Badge";
import SpinnerLoader from "../../components/common/SpinnerLoader";
import { fetchRecentGenerationJobs } from "../../api/docgen";
import { jobStatusColor, jobStatusLabel } from "../documents/types";
import { workflowStatusLabel } from "../auth/types";
import { workflowStatusBadgeColor } from "../documents/workflowStatusVisual";
import { useTranslation } from "../../i18n/useTranslation";
import type { WorkflowStatus } from "../documents/types";
import { useTipSWR } from "../../lib/swr";

interface RecentGenerationsPanelProps {
  scope?: "mine" | "platform";
  limit?: number;
}

export default function RecentGenerationsPanel({ scope = "platform", limit = 8 }: RecentGenerationsPanelProps) {
  const { t, localeTag } = useTranslation();

  const { data, isLoading } = useTipSWR(
    ["recent-generations", scope, limit] as const,
    async (token) => {
      try {
        return await fetchRecentGenerationJobs(token, limit, scope === "platform");
      } catch {
        return [];
      }
    },
  );

  const items = data ?? [];
  const loading = isLoading && !data;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("dashboard.recentPackages")}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("dashboard.recentPackagesDesc")}</p>
        </div>
        <Link
          to="/documents/generation"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          {t("dashboard.viewAllGenerations")}
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {loading ? (
        <SpinnerLoader message={t("common.loading")} />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center dark:border-gray-700">
          <FileArchive className="mx-auto size-9 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{t("dashboard.noRecentPackages")}</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={`/documents/generation?event=${item.event_id}`}
                className="flex flex-wrap items-center justify-between gap-3 py-3.5 transition hover:bg-gray-50/80 -mx-2 px-2 rounded-lg dark:hover:bg-white/[0.03]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                    {item.event_title ?? t("notifications.unknownEvent")}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {new Date(item.completed_at ?? item.created_at).toLocaleString(localeTag)}
                    {item.zip_filename ? ` · ${item.zip_filename}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge color={jobStatusColor(item.status as "queued" | "running" | "completed" | "failed")} size="sm">
                    {jobStatusLabel(item.status as "queued" | "running" | "completed" | "failed", t)}
                  </Badge>
                  {item.workflow_status ? (
                    <Badge color={workflowStatusBadgeColor(item.workflow_status as WorkflowStatus)} size="sm">
                      {workflowStatusLabel(item.workflow_status as WorkflowStatus, t)}
                    </Badge>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
