import { useAuth } from "@clerk/clerk-react";
import { useCallback, useEffect, useState } from "react";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import OnlyOfficeEditor, { type OnlyOfficeEditorConfig } from "../documents/OnlyOfficeEditor";
import {
  downloadPackageFile,
  fetchPackageFileEditorConfig,
  reviewFile,
} from "../../api/workflow";
import type { WorkflowFileReview } from "../../api/workflow";
import { getApiToken } from "../../lib/clerkToken";
import { ApiError } from "../../api/client";
import { confirmAction, showError, showSuccess } from "../../lib/swal";
import { useTranslation } from "../../i18n/useTranslation";

interface WorkflowFileReviewListProps {
  jobId: string;
  files: WorkflowFileReview[];
  canReview: boolean;
  onUpdated: () => void;
}

function fileStatusColor(status: WorkflowFileReview["status"]) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "error" as const;
  return "warning" as const;
}

export default function WorkflowFileReviewList({
  jobId,
  files,
  canReview,
  onUpdated,
}: WorkflowFileReviewListProps) {
  const { getToken } = useAuth();
  const { t } = useTranslation();
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [editorConfig, setEditorConfig] = useState<OnlyOfficeEditorConfig | null>(null);
  const [editorLoading, setEditorLoading] = useState(false);
  const [previewUnavailable, setPreviewUnavailable] = useState(false);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const reviewedCount = files.filter((f) => f.status !== "pending").length;

  const loadPreview = useCallback(
    async (templateCode: string) => {
      setActiveCode(templateCode);
      setEditorConfig(null);
      setPreviewUnavailable(false);
      setEditorLoading(true);
      try {
        const token = await getApiToken(getToken);
        const config = await fetchPackageFileEditorConfig(token, jobId, templateCode);
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

  useEffect(() => {
    if (files.length === 0) {
      setActiveCode(null);
      setEditorConfig(null);
      return;
    }
    if (!activeCode || !files.some((f) => f.template_code === activeCode)) {
      const first = files[0];
      setRemarks((prev) => ({
        ...prev,
        [first.template_code]: prev[first.template_code] ?? first.comment ?? "",
      }));
      void loadPreview(first.template_code);
    }
  }, [files, activeCode, loadPreview]);

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

  async function handleReview(templateCode: string, status: "approved" | "rejected") {
    const comment = (remarks[templateCode] ?? "").trim();
    if (status === "rejected" && !comment) {
      showError(t("common.error"), t("workflow.remarkRequired"));
      return;
    }
    const confirmed = await confirmAction({
      title: status === "approved" ? t("confirm.approveFileTitle") : t("confirm.rejectFileTitle"),
      confirmText: t("confirm.proceed"),
      cancelText: t("common.cancel"),
      icon: status === "approved" ? "question" : "warning",
    });
    if (!confirmed.isConfirmed) return;
    setSubmitting(templateCode);
    try {
      const token = await getApiToken(getToken);
      await reviewFile(token, jobId, templateCode, status, comment || undefined);
      showSuccess(status === "approved" ? t("workflow.fileApproved") : t("workflow.fileRejected"));
      onUpdated();
    } catch (err) {
      showError(
        t("common.error"),
        err instanceof ApiError ? err.message : t("common.unknownError"),
      );
    } finally {
      setSubmitting(null);
    }
  }

  function selectFile(file: WorkflowFileReview) {
    void loadPreview(file.template_code);
    setRemarks((prev) => ({
      ...prev,
      [file.template_code]: prev[file.template_code] ?? file.comment ?? "",
    }));
  }

  if (files.length === 0) {
    return <p className="text-sm text-gray-500">{t("workflow.noFiles")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {t("workflow.filesTitle")}
        </p>
        <p className="text-xs text-gray-500">
          {reviewedCount}/{files.length} {t("workflow.filesReviewed")}
        </p>
      </div>

      <ul className="space-y-2">
        {files.map((file) => {
          const isActive = activeCode === file.template_code;
          const displayName = file.file_path || file.template_code;
          return (
            <li
              key={file.id}
              className={`rounded-xl border transition-colors ${
                isActive
                  ? "border-brand-500 bg-brand-50/40 dark:border-brand-500/60 dark:bg-brand-500/5"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 p-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => selectFile(file)}
                >
                  <p className="text-sm font-medium break-all">{displayName}</p>
                  {file.comment ? (
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      {t("workflow.remark")} : {file.comment}
                    </p>
                  ) : null}
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color={fileStatusColor(file.status)} size="sm">
                    {t(`workflow.fileStatus.${file.status}`)}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void loadPreview(file.template_code)}
                  >
                    {t("workflow.viewFile")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void handleDownload(file.template_code)}>
                    {t("common.download")}
                  </Button>
                </div>
              </div>

              {isActive && canReview ? (
                <div className="space-y-2 border-t border-gray-200 px-3 pb-3 pt-3 dark:border-gray-800">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {t("workflow.remarkFor")} {displayName}
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    rows={2}
                    placeholder={t("workflow.remarkPlaceholder")}
                    value={remarks[file.template_code] ?? ""}
                    onChange={(e) =>
                      setRemarks((prev) => ({ ...prev, [file.template_code]: e.target.value }))
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={submitting === file.template_code}
                      onClick={() => void handleReview(file.template_code, "approved")}
                    >
                      {t("workflow.validateFile")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={submitting === file.template_code}
                      onClick={() => void handleReview(file.template_code, "rejected")}
                    >
                      {t("workflow.rejectFile")}
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {activeCode ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between border-b border-gray-200 p-3 dark:border-gray-800">
            <p className="text-sm font-medium break-all">{activeCode}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setActiveCode(null);
                setEditorConfig(null);
                setPreviewUnavailable(false);
              }}
            >
              {t("documents.closeEditor")}
            </Button>
          </div>
          <div className="min-h-[280px] p-2">
            {editorLoading ? (
              <p className="p-4 text-sm text-gray-500">{t("documents.onlyofficeLoading")}</p>
            ) : editorConfig ? (
              <OnlyOfficeEditor
                editorConfig={editorConfig}
                className="min-h-[480px]"
                autoFullscreen
                onClose={() => {
                  setActiveCode(null);
                  setEditorConfig(null);
                  setPreviewUnavailable(false);
                }}
              />
            ) : previewUnavailable ? (
              <div className="space-y-3 p-4">
                <p className="text-sm text-gray-500">{t("workflow.previewUnavailable")}</p>
                <Button size="sm" onClick={() => void handleDownload(activeCode)}>
                  {t("common.download")}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
