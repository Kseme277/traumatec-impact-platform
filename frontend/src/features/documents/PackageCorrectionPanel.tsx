import Badge from "../../components/ui/badge/Badge";
import type { WorkflowFileReview } from "../../api/workflow";
import PackageFileCorrectionActions from "./PackageFileCorrectionActions";
import { useTranslation } from "../../i18n/useTranslation";

interface PackageCorrectionPanelProps {
  jobId: string;
  files: WorkflowFileReview[];
  onFileCorrected?: () => void;
}

function fileStatusColor(status: WorkflowFileReview["status"]) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "error" as const;
  return "warning" as const;
}

export default function PackageCorrectionPanel({
  jobId,
  files,
  onFileCorrected,
}: PackageCorrectionPanelProps) {
  const { t } = useTranslation();

  if (files.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">{t("documents.fileRemarksEmpty")}</p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">{t("documents.packageCorrectionDesc")}</p>

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
              <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t("common.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-transparent">
            {files.map((file) => {
              const displayName = file.file_path || file.template_code;
              return (
                <tr key={file.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/30">
                  <td className="px-3 py-3 align-top">
                    <p className="font-medium break-all text-gray-800 dark:text-white/90">{displayName}</p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <Badge color={fileStatusColor(file.status)} size="sm">
                      {t(`workflow.fileStatus.${file.status}`)}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <PackageFileCorrectionActions
                      jobId={jobId}
                      file={file}
                      onCorrected={onFileCorrected}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">{t("documents.packageCorrectionHint")}</p>
    </div>
  );
}
