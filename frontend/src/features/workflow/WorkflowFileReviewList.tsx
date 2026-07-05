import { useAuth } from "@clerk/clerk-react";
import { useCallback, useEffect, useState } from "react";
import { Check, Download, Eye, X } from "lucide-react";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import TableIconButton from "../../components/common/TableIconButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import OnlyOfficeEditor, { type OnlyOfficeEditorConfig } from "../documents/OnlyOfficeEditor";
import {
  downloadPackageFile,
  fetchPackageFileEditorConfig,
  fetchPackageFileRevision,
  reviewFile,
  saveFileComment,
} from "../../api/workflow";
import type { WorkflowFileReview, WorkflowState } from "../../api/workflow";
import { getApiToken } from "../../lib/clerkToken";
import { ApiError } from "../../api/client";
import { confirmAction, showError, showSuccess } from "../../lib/swal";
import { useTranslation } from "../../i18n/useTranslation";
import { DocumentFileNameCell } from "../documents/documentFilePresentation";

interface WorkflowFileReviewListProps {
  jobId: string;
  files: WorkflowFileReview[];
  canReview: boolean;
  onUpdated: (state: WorkflowState) => void;
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
  const [savingRemark, setSavingRemark] = useState<string | null>(null);
  const [localFiles, setLocalFiles] = useState(files);

  const syncRemarksFromFiles = useCallback((fileList: WorkflowFileReview[]) => {
    setRemarks((prev) => {
      const next = { ...prev };
      for (const file of fileList) {
        next[file.template_code] = file.comment ?? "";
      }
      return next;
    });
  }, []);

  useEffect(() => {
    setLocalFiles(files);
    syncRemarksFromFiles(files);
  }, [files, syncRemarksFromFiles]);

  const reviewedCount = localFiles.filter((f) => f.status !== "pending").length;
  const approvedCount = localFiles.filter((f) => f.status === "approved").length;
  const rejectedCount = localFiles.filter((f) => f.status === "rejected").length;

  const loadPreview = useCallback(
    async (fileReviewId: string) => {
      setActiveCode(fileReviewId);
      setEditorConfig(null);
      setPreviewUnavailable(false);
      setEditorLoading(true);
      try {
        const token = await getApiToken(getToken);
        const file = localFiles.find((item) => item.id === fileReviewId);
        const code = file?.template_code ?? fileReviewId;
        const config = await fetchPackageFileEditorConfig(token, jobId, fileReviewId);
        const revision = await fetchPackageFileRevision(token, jobId, code);
        setEditorConfig({ ...config, file_revision: revision.revision });
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
    if (localFiles.length === 0) {
      setActiveCode(null);
      setEditorConfig(null);
      setPreviewUnavailable(false);
    }
  }, [localFiles.length]);

  async function handleDownload(fileReviewId: string) {
    try {
      const token = await getApiToken(getToken);
      await downloadPackageFile(token, jobId, fileReviewId);
    } catch (err) {
      showError(
        t("common.error"),
        err instanceof ApiError ? err.message : t("common.unknownError"),
      );
    }
  }

  async function handleSaveRemark(fileReviewId: string, templateCode: string) {
    const comment = (remarks[templateCode] ?? "").trim();
    const saved = localFiles.find((f) => f.id === fileReviewId)?.comment?.trim() ?? "";
    if (comment === saved) return;

    setSavingRemark(fileReviewId);
    try {
      const token = await getApiToken(getToken);
      const state = await saveFileComment(token, jobId, fileReviewId, comment || null);
      setLocalFiles(state.files);
      syncRemarksFromFiles(state.files);
      onUpdated(state);
      void showSuccess(t("workflow.remarkSaved"));
    } catch (err) {
      showError(
        t("common.error"),
        err instanceof ApiError ? err.message : t("common.unknownError"),
      );
    } finally {
      setSavingRemark(null);
    }
  }

  async function handleReview(fileReviewId: string, templateCode: string, status: "approved" | "rejected") {
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
    setSubmitting(fileReviewId);
    try {
      const token = await getApiToken(getToken);
      const state = await reviewFile(token, jobId, fileReviewId, status, comment || null);
      setLocalFiles(state.files);
      syncRemarksFromFiles(state.files);
      onUpdated(state);
      void showSuccess(status === "approved" ? t("workflow.fileApproved") : t("workflow.fileRejected"));
    } catch (err) {
      showError(
        t("common.error"),
        err instanceof ApiError ? err.message : t("common.unknownError"),
      );
    } finally {
      setSubmitting(null);
    }
  }

  if (localFiles.length === 0) {
    return <p className="text-sm text-gray-500">{t("workflow.noFiles")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/40">
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
            {t("workflow.filesTitle")}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">{t("workflow.selectFileHint")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge color="light" size="sm">
            {reviewedCount}/{localFiles.length} {t("workflow.filesReviewed")}
          </Badge>
          {approvedCount > 0 ? (
            <Badge color="success" size="sm">
              {approvedCount} {t("workflow.fileStatus.approved").toLowerCase()}
            </Badge>
          ) : null}
          {rejectedCount > 0 ? (
            <Badge color="error" size="sm">
              {rejectedCount} {t("workflow.fileStatus.rejected").toLowerCase()}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="-mx-4 overflow-hidden sm:-mx-6">
        <div className="overflow-x-auto px-4 sm:px-6">
          <Table className="min-w-[960px] table-fixed w-full">
            <colgroup>
              <col />
              <col className="w-[110px]" />
              <col className="w-[240px]" />
              <col className="w-[180px]" />
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
                <TableCell
                  isHeader
                  className="px-4 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {t("workflow.filesTable.actions")}
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {localFiles.map((file) => {
                const displayName = file.file_path || file.template_code;
                const isActive = activeCode === file.id;
                const savedRemark = file.comment?.trim() ?? "";
                const draftRemark = remarks[file.template_code] ?? savedRemark;
                return (
                  <TableRow
                    key={file.id}
                    className={
                      isActive
                        ? "bg-brand-50/50 dark:bg-brand-500/5"
                        : "hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    }
                  >
                    <TableCell className="px-4 py-3.5 align-top text-start">
                      <DocumentFileNameCell
                        name={displayName}
                        filePath={file.file_path || `${file.template_code}.doc`}
                        subtitle={file.template_code}
                      />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 align-top text-start">
                      <Badge color={fileStatusColor(file.status)} size="sm">
                        {t(`workflow.fileStatus.${file.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 align-top text-start">
                      {canReview ? (
                        <div className="space-y-2">
                          <textarea
                            className="w-full rounded-lg border border-gray-200 bg-white p-2 text-xs dark:border-gray-700 dark:bg-gray-900"
                            rows={2}
                            placeholder={t("workflow.remarkPlaceholder")}
                            value={draftRemark}
                            onChange={(e) =>
                              setRemarks((prev) => ({
                                ...prev,
                                [file.template_code]: e.target.value,
                              }))
                            }
                            onBlur={() => void handleSaveRemark(file.id, file.template_code)}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              savingRemark === file.id || draftRemark.trim() === savedRemark
                            }
                            onClick={() => void handleSaveRemark(file.id, file.template_code)}
                          >
                            {savingRemark === file.id
                              ? t("common.saving")
                              : t("workflow.saveRemark")}
                          </Button>
                        </div>
                      ) : savedRemark ? (
                        <p className="line-clamp-3 text-xs text-gray-700 dark:text-gray-300">
                          {savedRemark}
                        </p>
                      ) : (
                        <p className="text-xs italic text-gray-400">{t("workflow.noRemarkYet")}</p>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 align-top text-end">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <TableIconButton
                          label={t("workflow.viewFile")}
                          onClick={() => void loadPreview(file.id)}
                        >
                          <Eye className="size-4.5" />
                        </TableIconButton>
                        <TableIconButton
                          label={t("common.download")}
                          onClick={() => void handleDownload(file.id)}
                        >
                          <Download className="size-4.5" />
                        </TableIconButton>
                        {canReview ? (
                          <>
                            <TableIconButton
                              label={t("workflow.validateFile")}
                              variant="success"
                              disabled={submitting === file.id}
                              onClick={() =>
                                void handleReview(file.id, file.template_code, "approved")
                              }
                            >
                              <Check className="size-4.5" />
                            </TableIconButton>
                            <TableIconButton
                              label={t("workflow.rejectFile")}
                              variant="danger"
                              disabled={submitting === file.id}
                              onClick={() =>
                                void handleReview(file.id, file.template_code, "rejected")
                              }
                            >
                              <X className="size-4.5" />
                            </TableIconButton>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {activeCode && editorLoading && !editorConfig ? (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-white/95 dark:bg-gray-900/95">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("documents.onlyofficeLoading")}</p>
        </div>
      ) : null}

      {activeCode && editorConfig ? (
        <OnlyOfficeEditor
          editorConfig={editorConfig}
          autoFullscreen
          onClose={() => {
            setActiveCode(null);
            setEditorConfig(null);
            setPreviewUnavailable(false);
          }}
        />
      ) : null}

      {activeCode && !editorLoading && previewUnavailable ? (
        <div className="fixed inset-0 z-[100000] flex flex-col items-center justify-center gap-4 bg-white p-6 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-300">{t("workflow.previewUnavailable")}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void handleDownload(activeCode)}>
              {t("common.download")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setActiveCode(null);
                setPreviewUnavailable(false);
              }}
            >
              {t("documents.closeEditor")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
