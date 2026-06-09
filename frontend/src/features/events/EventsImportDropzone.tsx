import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { DownloadIcon } from "../../icons";
import { useTranslation } from "../../i18n/useTranslation";
import EventsImportProgressBar from "./EventsImportProgressBar";

import type { ImportJobProgress } from "./types";

interface EventsImportDropzoneProps {
  isSubmitting?: boolean;
  importProgress?: ImportJobProgress | null;
  onImport: (file: File) => Promise<void>;
}

export default function EventsImportDropzone({
  isSubmitting = false,
  importProgress = null,
  onImport,
}: EventsImportDropzoneProps) {
  const { t } = useTranslation();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        void onImport(file);
      }
    },
    [onImport],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    disabled: isSubmitting,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 text-center transition focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
          isDragActive
            ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
            : "border-gray-200 bg-gray-50 hover:border-brand-400 dark:border-gray-700 dark:bg-white/[0.02] dark:hover:border-brand-500/50"
        } ${isSubmitting ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-theme-xs dark:bg-gray-900">
          <DownloadIcon className="size-6 text-brand-500" />
        </div>
        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
          {isSubmitting
            ? t("common.importing")
            : isDragActive
              ? t("common.dragDropHere")
              : t("events.importDropzone")}
        </p>
        <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
          {t("events.importDropzoneHint")}
        </p>
      </div>

      {importProgress && <EventsImportProgressBar progress={importProgress} />}
    </div>
  );
}
