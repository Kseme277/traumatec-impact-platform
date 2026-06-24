import { useState } from "react";
import { Link } from "react-router";
import { Download, ExternalLink, FileArchive, ScrollText } from "lucide-react";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import GenerationLogPanel from "./GenerationLogPanel";
import WorkflowStatusStepper from "./WorkflowStatusStepper";
import type { GenerationJob } from "./types";
import { jobStatusColor, jobStatusLabel } from "./types";
import { workflowStatusLabel } from "../auth/types";
import { workflowQueueLink, workflowStatusBadgeColor } from "./workflowStatusVisual";
import { useTranslation } from "../../i18n/useTranslation";

interface GenerationHistoryPanelProps {
  jobs: GenerationJob[];
  loading?: boolean;
  emptyMessage?: string;
  onDownload?: (job: GenerationJob) => void;
  eventId?: string;
}

export default function GenerationHistoryPanel({
  jobs,
  loading = false,
  emptyMessage,
  onDownload,
  eventId,
}: GenerationHistoryPanelProps) {
  const { t, localeTag } = useTranslation();
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500 dark:text-gray-400">
        {t("common.loading")}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 px-6 py-10 text-center dark:border-gray-700">
        <FileArchive className="mx-auto size-10 text-gray-300 dark:text-gray-600" />
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {emptyMessage ?? t("documents.noGeneration")}
        </p>
        {eventId ? (
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{t("documents.historyEmptyHint")}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => {
        const workflowLink = job.workflow_status ? workflowQueueLink(job.workflow_status) : null;
        const expanded = expandedJobId === job.id;

        return (
          <article
            key={job.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs transition dark:border-gray-800 dark:bg-white/[0.02]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color={jobStatusColor(job.status)} size="sm">
                    {jobStatusLabel(job.status, t)}
                  </Badge>
                  {job.workflow_status ? (
                    <Badge color={workflowStatusBadgeColor(job.workflow_status)} size="sm">
                      {workflowStatusLabel(job.workflow_status, t)}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                  {new Date(job.created_at).toLocaleString(localeTag)}
                  {job.completed_at ? (
                    <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
                      → {new Date(job.completed_at).toLocaleTimeString(localeTag)}
                    </span>
                  ) : null}
                </p>
                {job.zip_filename ? (
                  <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400" title={job.zip_filename}>
                    {job.zip_filename}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {job.status === "completed" && job.zip_available !== false && onDownload ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => onDownload(job)}>
                    <Download className="mr-1.5 size-4" />
                    ZIP
                  </Button>
                ) : null}
                {job.status === "completed" && job.zip_available === false ? (
                  <span className="text-xs text-gray-400">{t("documents.zipExpiredShort")}</span>
                ) : null}
                {(job.logs?.length ?? 0) > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setExpandedJobId(expanded ? null : job.id)}
                  >
                    <ScrollText className="mr-1.5 size-4" />
                    {expanded ? t("documents.hideLogs") : t("documents.viewLogs")}
                  </Button>
                ) : null}
                {workflowLink ? (
                  <Link to={`${workflowLink}?job=${job.id}`}>
                    <Button type="button" size="sm" variant="outline">
                      <ExternalLink className="mr-1.5 size-4" />
                      {t("documents.openWorkflow")}
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>

            {job.workflow_status ? (
              <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {t("documents.validationProgress")}
                </p>
                <WorkflowStatusStepper status={job.workflow_status} />
              </div>
            ) : job.status === "completed" ? (
              <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t("documents.notSubmittedYet")}</p>
                <Link
                  to={`/documents/generation?event=${job.event_id}`}
                  className="mt-1 inline-block text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  {t("documents.submitFromGeneration")}
                </Link>
              </div>
            ) : null}

            {expanded && (job.logs?.length ?? 0) > 0 ? (
              <div className="mt-4">
                <GenerationLogPanel logs={job.logs ?? []} maxHeightClass="max-h-48" />
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
