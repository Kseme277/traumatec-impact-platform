import Badge from "../../components/ui/badge/Badge";
import type { WorkflowFileReview } from "../../api/workflow";
import { workflowStatusLabel, type WorkflowStatus } from "../auth/types";
import { useTranslation } from "../../i18n/useTranslation";

interface PackageFileRemarksPanelProps {
  files: WorkflowFileReview[];
  workflowStatus?: string | null;
  centralRemark?: string | null;
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
}: PackageFileRemarksPanelProps) {
  const { t } = useTranslation();

  if (files.length === 0 && !centralRemark) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">{t("documents.fileRemarksEmpty")}</p>
    );
  }

  const withRemarks = files.filter((file) => file.comment?.trim());
  const reviewed = files.filter((file) => file.status !== "pending").length;

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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          {reviewed}/{files.length} {t("workflow.filesReviewed")}
          {workflowStatus && workflowStatus !== "generated"
            ? ` · ${workflowStatusLabel(workflowStatus as WorkflowStatus, t)}`
            : null}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900/60">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t("workflow.filesTable.document")}
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t("workflow.filesTable.status")}
              </th>
              <th className="min-w-[200px] px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t("workflow.filesTable.remark")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-transparent">
            {files.map((file) => {
              const displayName = file.file_path || file.template_code;
              const remark = file.comment?.trim();
              return (
                <tr key={file.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/30">
                  <td className="px-3 py-3 align-top">
                    <p className="font-medium break-all text-gray-800 dark:text-white/90">{displayName}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{file.template_code}</p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <Badge color={fileStatusColor(file.status)} size="sm">
                      {t(`workflow.fileStatus.${file.status}`)}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 align-top">
                    {remark ? (
                      <p className="rounded-lg bg-gray-50 px-2 py-1.5 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                        {remark}
                      </p>
                    ) : (
                      <p className="text-xs italic text-gray-400">{t("workflow.noRemarkYet")}</p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {withRemarks.length === 0 ? (
        <p className="text-xs text-gray-500">{t("documents.fileRemarksNoComments")}</p>
      ) : null}
    </div>
  );
}
