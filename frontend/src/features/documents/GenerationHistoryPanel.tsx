import { useCallback, useState } from "react";
import { Link } from "react-router";
import { Download, ExternalLink, FileArchive, MessageSquareText, ScrollText } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import Button from "../../components/ui/button/Button";
import GenerationLogPanel from "./GenerationLogPanel";
import PackageFileRemarksPanel from "./PackageFileRemarksPanel";
import WorkflowStatusStepper from "./WorkflowStatusStepper";
import type { GenerationJob } from "./types";
import { workflowQueueLink } from "./workflowStatusVisual";
import { useTranslation } from "../../i18n/useTranslation";
import { fetchWorkflowState, type WorkflowState } from "../../api/workflow";
import { getApiToken } from "../../lib/clerkToken";
import { getCentralRejectComment } from "./workflowRemarks";

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
  const { getToken } = useAuth();
  const { t, localeTag } = useTranslation();
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [remarksJobId, setRemarksJobId] = useState<string | null>(null);
  const [remarksByJob, setRemarksByJob] = useState<Record<string, WorkflowState | null>>({});
  const [remarksLoading, setRemarksLoading] = useState<string | null>(null);

  const loadRemarks = useCallback(
    async (job: GenerationJob) => {
      if (remarksByJob[job.id]) {
        setRemarksJobId(remarksJobId === job.id ? null : job.id);
        return;
      }
      setRemarksLoading(job.id);
      try {
        const token = await getApiToken(getToken);
        const state = await fetchWorkflowState(token, job.id);
        setRemarksByJob((prev) => ({ ...prev, [job.id]: state }));
        setRemarksJobId(job.id);
      } catch {
        setRemarksByJob((prev) => ({ ...prev, [job.id]: null }));
      } finally {
        setRemarksLoading(null);
      }
    },
    [getToken, remarksByJob, remarksJobId],
  );

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
        const remarksOpen = remarksJobId === job.id;
        const remarksState = remarksByJob[job.id];
        const centralRemark = remarksState ? getCentralRejectComment(remarksState.history) : null;
        const isApproved = job.workflow_status === "approved";
        const isRejected =
          job.workflow_status === "procedure_rejected" || job.workflow_status === "validator_rejected";

        return (
          <article
            key={job.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs transition dark:border-gray-800 dark:bg-white/[0.02]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
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
                {isApproved && job.status === "completed" && job.zip_available !== false && onDownload ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => onDownload(job)}>
                    <Download className="mr-1.5 size-4" />
                    {t("documents.downloadValidatedPackage")}
                  </Button>
                ) : null}
                {isApproved && job.status === "completed" && job.zip_available === false ? (
                  <span className="text-xs text-gray-400">{t("documents.zipExpiredShort")}</span>
                ) : null}
                {isRejected && job.status === "completed" ? (
                  <Link to={`/documents/generation?event=${job.event_id}`}>
                    <Button type="button" size="sm" variant="outline">
                      {t("events.packageRegenerateLink")}
                    </Button>
                  </Link>
                ) : null}
                {job.status === "completed" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={remarksLoading === job.id}
                    onClick={() => void loadRemarks(job)}
                  >
                    <MessageSquareText className="mr-1.5 size-4" />
                    {remarksOpen ? t("documents.hideRemarks") : t("documents.viewRemarks")}
                  </Button>
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
                <WorkflowStatusStepper status={job.workflow_status} compact />
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

            {remarksOpen && remarksState ? (
              <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                <PackageFileRemarksPanel
                  files={remarksState.files}
                  workflowStatus={job.workflow_status}
                  centralRemark={centralRemark}
                />
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
