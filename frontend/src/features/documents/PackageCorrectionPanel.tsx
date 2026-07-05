import { useAuth } from "@clerk/clerk-react";
import { useCallback, useState } from "react";
import { Download, Pencil } from "lucide-react";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import OnlyOfficeEditor, { type OnlyOfficeEditorConfig } from "../documents/OnlyOfficeEditor";
import { downloadPackageFile, fetchPackageFileEditorConfig } from "../../api/workflow";
import type { WorkflowFileReview } from "../../api/workflow";
import { getApiToken } from "../../lib/clerkToken";
import { ApiError } from "../../api/client";
import { showError, showSuccess } from "../../lib/swal";
import { useTranslation } from "../../i18n/useTranslation";

interface PackageCorrectionPanelProps {
  jobId: string;
  files: WorkflowFileReview[];
}

function fileStatusColor(status: WorkflowFileReview["status"]) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "error" as const;
  return "warning" as const;
}

export default function PackageCorrectionPanel({ jobId, files }: PackageCorrectionPanelProps) {
  const { getToken } = useAuth();
  const { t } = useTranslation();
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [editorConfig, setEditorConfig] = useState<OnlyOfficeEditorConfig | null>(null);
  const [editorLoading, setEditorLoading] = useState(false);
  const [previewUnavailable, setPreviewUnavailable] = useState(false);

  const loadEditor = useCallback(
    async (templateCode: string) => {
      setActiveCode(templateCode);
      setEditorConfig(null);
      setPreviewUnavailable(false);
      setEditorLoading(true);
      try {
        const token = await getApiToken(getToken);
        const config = await fetchPackageFileEditorConfig(token, jobId, templateCode, "edit");
        setEditorConfig(config);
      } catch (err) {
        setEditorConfig(null);
        if (err instanceof ApiError && err.status === 422) {
          setPreviewUnavailable(true);
        } else {
          showError(
            t("common.error"),
            err instanceof ApiError ? err.message : t("common.unknownError"),
          );
        }
      } finally {
        setEditorLoading(false);
      }
    },
    [getToken, jobId, t],
  );

  async function handleDownload(templateCode: string) {
    try {
      const token = await getApiToken(getToken);
      await downloadPackageFile(token, jobId, templateCode);
    } catch (err) {
      showError(
        t("common.error"),
        err instanceof ApiError ? err.message : t("common.unknownError"),
      );
    }
  }

  async function handleSaved() {
    if (!activeCode) return;
    await showSuccess(t("documents.packageFileSaved"), t("documents.packageFileSavedDesc"));
    await loadEditor(activeCode);
  }

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
              const isActive = activeCode === file.template_code;
              return (
                <tr
                  key={file.id}
                  className={isActive ? "bg-brand-50/40 dark:bg-brand-500/10" : "hover:bg-gray-50/80 dark:hover:bg-gray-900/30"}
                >
                  <td className="px-3 py-3 align-top">
                    <p className="font-medium break-all text-gray-800 dark:text-white/90">{displayName}</p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <Badge color={fileStatusColor(file.status)} size="sm">
                      {t(`workflow.fileStatus.${file.status}`)}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant={isActive ? "primary" : "outline"}
                        onClick={() => void loadEditor(file.template_code)}
                      >
                        <Pencil className="mr-1.5 size-4" />
                        {t("documents.openAndEdit")}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void handleDownload(file.template_code)}>
                        <Download className="mr-1.5 size-4" />
                        {t("documents.downloadZip")}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeCode ? (
        <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
          <p className="mb-3 text-sm font-medium text-gray-800 dark:text-white/90">
            {t("documents.editingFile")} : {activeCode}
          </p>
          {editorLoading ? (
            <p className="text-sm text-gray-500">{t("documents.onlyofficeLoading")}</p>
          ) : previewUnavailable ? (
            <p className="text-sm text-warning-600 dark:text-warning-400">
              {t("documents.onlyofficeUnsupportedFormat")}
            </p>
          ) : editorConfig ? (
            <OnlyOfficeEditor
              editorConfig={editorConfig}
              manualSave
              onDocumentSaved={() => void handleSaved()}
              autoFullscreen
              onClose={() => {
                setActiveCode(null);
                setEditorConfig(null);
              }}
            />
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">{t("documents.packageCorrectionHint")}</p>
      )}
    </div>
  );
}
