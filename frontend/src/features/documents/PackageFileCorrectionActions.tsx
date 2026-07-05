import { useAuth } from "@clerk/clerk-react";
import { useRef, useState } from "react";
import { Download, Eye, Upload } from "lucide-react";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import {
  downloadPackageFile,
  fetchPackageFileEditorConfig,
  uploadPackageFileCorrection,
  type WorkflowFileReview,
} from "../../api/workflow";
import { getApiToken } from "../../lib/clerkToken";
import { ApiError } from "../../api/client";
import { showError, showSuccess } from "../../lib/swal";
import OnlyOfficeEditor, { type OnlyOfficeEditorConfig } from "./OnlyOfficeEditor";
import { useTranslation } from "../../i18n/useTranslation";

interface PackageFileCorrectionActionsProps {
  jobId: string;
  file: WorkflowFileReview;
  onCorrected?: () => void;
}

export default function PackageFileCorrectionActions({
  jobId,
  file,
  onCorrected,
}: PackageFileCorrectionActionsProps) {
  const { getToken } = useAuth();
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewConfig, setPreviewConfig] = useState<OnlyOfficeEditorConfig | null>(null);
  const [previewUnavailable, setPreviewUnavailable] = useState(false);

  async function handleDownload() {
    try {
      const token = await getApiToken(getToken);
      await downloadPackageFile(token, jobId, file.id);
    } catch (err) {
      showError(
        t("common.error"),
        err instanceof ApiError ? err.message : t("common.unknownError"),
      );
    }
  }

  async function handleUpload(selected: File | null) {
    if (!selected) return;
    setUploading(true);
    try {
      const token = await getApiToken(getToken);
      await uploadPackageFileCorrection(token, jobId, file.id, selected);
      await showSuccess(t("documents.packageFileUploaded"), t("documents.packageFileUploadedDesc"));
      onCorrected?.();
      if (previewOpen) {
        setPreviewConfig(null);
        void loadPreview();
      }
    } catch (err) {
      showError(
        t("common.error"),
        err instanceof ApiError ? err.message : t("common.unknownError"),
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function loadPreview() {
    setPreviewOpen(true);
    setPreviewConfig(null);
    setPreviewUnavailable(false);
    setPreviewLoading(true);
    try {
      const token = await getApiToken(getToken);
      const config = await fetchPackageFileEditorConfig(token, jobId, file.id, "view");
      setPreviewConfig(config);
    } catch (err) {
      setPreviewConfig(null);
      if (err instanceof ApiError && err.status === 422) {
        setPreviewUnavailable(true);
      } else {
        showError(
          t("common.error"),
          err instanceof ApiError ? err.message : t("common.unknownError"),
        );
      }
    } finally {
      setPreviewLoading(false);
    }
  }

  const revision = file.file_revision ?? 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {revision > 0 ? (
          <Badge color="success" size="sm">
            {t("documents.fileCorrectedBadge")} v{revision}
          </Badge>
        ) : null}
        <Button size="sm" variant="outline" onClick={() => void handleDownload()}>
          <Download className="mr-1.5 size-4" />
          {t("documents.downloadFile")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-1.5 size-4" />
          {uploading ? t("documents.uploadingCorrection") : t("documents.uploadCorrection")}
        </Button>
        <Button
          size="sm"
          variant={previewOpen ? "primary" : "outline"}
          onClick={() => {
            if (previewOpen) {
              setPreviewOpen(false);
              setPreviewConfig(null);
              return;
            }
            void loadPreview();
          }}
        >
          <Eye className="mr-1.5 size-4" />
          {t("documents.previewCorrectedFile")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          aria-label={t("documents.uploadCorrection")}
          accept={file.file_path?.match(/\.[^.]+$/)?.[0] ?? ".doc,.docx"}
          onChange={(event) => void handleUpload(event.target.files?.[0] ?? null)}
        />
      </div>

      {previewOpen ? (
        <div className="rounded-lg border border-gray-200 p-2 dark:border-gray-800">
          {previewLoading ? (
            <p className="text-sm text-gray-500">{t("documents.onlyofficeLoading")}</p>
          ) : previewUnavailable ? (
            <p className="text-sm text-warning-600 dark:text-warning-400">
              {t("documents.onlyofficeUnsupportedFormat")}
            </p>
          ) : previewConfig ? (
            <OnlyOfficeEditor
              editorConfig={previewConfig}
              fileRevision={previewConfig.file_revision}
              onClose={() => {
                setPreviewOpen(false);
                setPreviewConfig(null);
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
