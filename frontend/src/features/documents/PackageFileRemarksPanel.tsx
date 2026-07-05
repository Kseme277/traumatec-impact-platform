import Badge from "../../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import type { WorkflowFileReview } from "../../api/workflow";
import { workflowStatusLabel, type WorkflowStatus } from "../auth/types";
import { isWorkflowRejected } from "./eventPackageLock";
import PackageFileCorrectionActions from "./PackageFileCorrectionActions";
import { useTranslation } from "../../i18n/useTranslation";

interface PackageFileRemarksPanelProps {
  files: WorkflowFileReview[];
  workflowStatus?: string | null;
  centralRemark?: string | null;
  jobId?: string | null;
  canEdit?: boolean;
  onFileCorrected?: () => void;
}

function fileStatusColor(status: WorkflowFileReview["status"]) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "error" as const;
  return "warning" as const;
}

export default function PackageFileRemarksPanel({
  files,
  workflowStatus,
  centralRemark,
  jobId,
  canEdit = false,
  onFileCorrected,
}: PackageFileRemarksPanelProps) {
  const { t } = useTranslation();

  if (files.length === 0 && !centralRemark) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">{t("documents.fileRemarksEmpty")}</p>
    );
  }

  const withRemarks = files.filter((file) => file.comment?.trim());
  const reviewed = files.filter((file) => file.status !== "pending").length;
  const rejectedCount = files.filter((file) => file.status === "rejected").length;
  const workflowRejected = isWorkflowRejected(
    (workflowStatus ?? null) as WorkflowStatus | null,
  );
  const showEditActions = Boolean(jobId && rejectedCount > 0 && (canEdit || workflowRejected));

  return (
    <div className="space-y-3">
      {centralRemark ? (
        <div className="rounded-xl border border-error-200 bg-error-50/60 p-4 dark:border-error-500/30 dark:bg-error-500/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-error-700 dark:text-error-300">
            {t("workflow.centralRemark")}
          </p>
          <p className="mt-2 text-sm text-error-800 dark:text-error-200">{centralRemark}</p>
        </div>
      ) : null}

      {showEditActions && rejectedCount > 0 ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {t("documents.packageCorrectionTitle")}
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            {t("documents.packageCorrectionDesc")}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          {reviewed}/{files.length} {t("workflow.filesReviewed")}
          {workflowStatus && workflowStatus !== "generated"
            ? ` · ${workflowStatusLabel(workflowStatus as WorkflowStatus, t)}`
            : null}
        </p>
      </div>

      <div className="-mx-4 overflow-hidden sm:-mx-6">
        <div className="overflow-x-auto px-4 sm:px-6">
          <Table className={`min-w-[720px] table-fixed w-full ${showEditActions ? "min-w-[920px]" : ""}`}>
            <colgroup>
              <col />
              <col className="w-[110px]" />
              <col className={showEditActions ? "w-[220px]" : "w-[280px]"} />
              {!showEditActions ? null : <col className="w-[320px]" />}
            </colgroup>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {t("workflow.filesTable.document")}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {t("workflow.filesTable.status")}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {t("workflow.filesTable.remark")}
                </TableCell>
                {showEditActions ? (
                  <TableCell
                    isHeader
                    className="px-4 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    {t("common.actions")}
                  </TableCell>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {files.map((file) => {
                const displayName = file.file_path || file.template_code;
                const remark = file.comment?.trim();
                const canEditFile = showEditActions && file.status === "rejected";
                return (
                  <TableRow key={file.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <TableCell className="px-4 py-3.5 text-start">
                      <p
                        className="truncate font-medium text-gray-800 dark:text-white/90"
                        title={displayName}
                      >
                        {displayName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-400">{file.template_code}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start">
                      <Badge color={fileStatusColor(file.status)} size="sm">
                        {t(`workflow.fileStatus.${file.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start">
                      {remark ? (
                        <p className="line-clamp-3 text-xs text-gray-700 dark:text-gray-300">{remark}</p>
                      ) : (
                        <p className="text-xs italic text-gray-400">{t("workflow.noRemarkYet")}</p>
                      )}
                    </TableCell>
                    {showEditActions ? (
                      <TableCell className="px-4 py-3.5 text-end align-top">
                        {canEditFile && jobId ? (
                          <PackageFileCorrectionActions
                            jobId={jobId}
                            file={file}
                            onCorrected={onFileCorrected}
                          />
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {withRemarks.length === 0 ? (
        <p className="text-xs text-gray-500">{t("documents.fileRemarksNoComments")}</p>
      ) : null}
    </div>
  );
}
