import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { ArrowRight, History } from "lucide-react";
import Badge from "../../components/ui/badge/Badge";
import { fetchWorkflowQueue, type WorkflowQueueItem } from "../../api/workflow";
import { getApiToken } from "../../lib/clerkToken";
import { workflowStatusLabel } from "../auth/types";
import { workflowStatusBadgeColor } from "../documents/workflowStatusVisual";
import { formatWorkflowPackageTitle } from "../workflow/workflowPackageTitle";
import { useTranslation } from "../../i18n/useTranslation";
import type { WorkflowStatus } from "../documents/types";

interface RecentWorkflowHistoryPanelProps {
  role: "controle" | "validateur";
  limit?: number;
}

export default function RecentWorkflowHistoryPanel({
  role,
  limit = 8,
}: RecentWorkflowHistoryPanelProps) {
  const { getToken } = useAuth();
  const { t, localeTag } = useTranslation();
  const [items, setItems] = useState<WorkflowQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const token = await getApiToken(getToken);
        const rows = await fetchWorkflowQueue(token, role, limit, "history");
        setItems(rows);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken, limit, role]);

  const queuePath = role === "validateur" ? "/workflow/validation" : "/workflow/controle";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("dashboard.recentWorkflowHistory")}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("dashboard.recentWorkflowHistoryDesc")}
          </p>
        </div>
        <Link
          to={`${queuePath}?scope=history`}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          {t("dashboard.viewAllHistory")}
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center dark:border-gray-700">
          <History className="mx-auto size-9 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{t("dashboard.noWorkflowHistory")}</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={`${queuePath}/${item.id}`}
                className="-mx-2 flex flex-wrap items-center justify-between gap-3 rounded-lg px-2 py-3.5 transition hover:bg-gray-50/80 dark:hover:bg-white/[0.03]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                    {formatWorkflowPackageTitle(item.project_number, item.event_title)}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {item.completed_at
                      ? new Date(item.completed_at).toLocaleString(localeTag)
                      : item.phase_due_at
                        ? `${t("workflow.deadline")}: ${new Date(item.phase_due_at).toLocaleString(localeTag)}`
                        : ""}
                  </p>
                </div>
                <Badge
                  color={workflowStatusBadgeColor(item.workflow_status as WorkflowStatus)}
                  size="sm"
                >
                  {workflowStatusLabel(item.workflow_status as WorkflowStatus, t)}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

}
