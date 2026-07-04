import Badge from "../../components/ui/badge/Badge";
import { useTranslation } from "../../i18n/useTranslation";
import type { WorkflowFileReview } from "../../api/workflow";

interface WorkflowFileReviewProgressProps {
  files: WorkflowFileReview[];
}

export function useFileReviewSummary(files: WorkflowFileReview[]) {
  const approved = files.filter((f) => f.status === "approved").length;
  const rejected = files.filter((f) => f.status === "rejected").length;
  const pending = files.filter((f) => f.status === "pending").length;
  const total = files.length;
  const allReviewed = total > 0 && pending === 0;
  const allApproved = allReviewed && rejected === 0;
  return { approved, rejected, pending, total, allReviewed, allApproved };
}

export default function WorkflowFileReviewProgress({ files }: WorkflowFileReviewProgressProps) {
  const { t } = useTranslation();
  const { approved, rejected, pending, total, allApproved } = useFileReviewSummary(files);

  if (total === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
          {t("workflow.fileReviewProgress")}
        </p>
        <p className="text-xs text-gray-500">
          {approved + rejected}/{total} {t("workflow.filesReviewed")}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {pending > 0 ? (
          <Badge color="warning" size="sm">
            {pending} {t("workflow.fileStatus.pending").toLowerCase()}
          </Badge>
        ) : null}
        {approved > 0 ? (
          <Badge color="success" size="sm">
            {approved} {t("workflow.fileStatus.approved").toLowerCase()}
          </Badge>
        ) : null}
        {rejected > 0 ? (
          <Badge color="error" size="sm">
            {rejected} {t("workflow.fileStatus.rejected").toLowerCase()}
          </Badge>
        ) : null}
      </div>
      {!allApproved ? (
        <p className="mt-2 text-xs text-gray-500">{t("workflow.fileReviewRequired")}</p>
      ) : (
        <p className="mt-2 text-xs text-success-600 dark:text-success-500">
          {t("workflow.fileReviewComplete")}
        </p>
      )}
    </div>
  );
}
