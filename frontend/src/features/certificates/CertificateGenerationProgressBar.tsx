import { useTranslation } from "../../i18n/useTranslation";

export type CertificateGenerationPhase =
  | "preparing"
  | "generating"
  | "uploading"
  | "downloading"
  | "completed"
  | "failed";

export interface CertificateGenerationProgress {
  phase: CertificateGenerationPhase;
  percent: number;
  message: string;
  certificateCount?: number;
}

interface CertificateGenerationProgressBarProps {
  progress: CertificateGenerationProgress;
}

function phaseLabel(phase: CertificateGenerationPhase, t: (key: string) => string): string {
  switch (phase) {
    case "preparing":
      return t("participants.genPhasePreparing");
    case "generating":
      return t("participants.genPhaseGenerating");
    case "uploading":
      return t("participants.genPhaseUploading");
    case "downloading":
      return t("participants.genPhaseDownloading");
    case "completed":
      return t("participants.genPhaseCompleted");
    case "failed":
      return t("participants.genPhaseFailed");
    default:
      return t("participants.generating");
  }
}

export default function CertificateGenerationProgressBar({
  progress,
}: CertificateGenerationProgressBarProps) {
  const { t } = useTranslation();
  const isIndeterminate =
    progress.phase === "generating" && progress.percent < 15;
  const width = isIndeterminate ? "35%" : `${Math.max(progress.percent, 3)}%`;

  return (
    <div
      className="mt-4 rounded-xl border border-brand-200 bg-brand-50/80 p-4 dark:border-brand-500/30 dark:bg-brand-500/10"
      role="status"
      aria-live="polite"
      aria-label={progress.message}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
          {phaseLabel(progress.phase, t)}
          {progress.certificateCount != null && progress.certificateCount > 0
            ? ` — ${progress.certificateCount} ${t("participants.certificatesLabel")}`
            : ""}
        </p>
        <span className="text-theme-xs font-medium text-brand-600 dark:text-brand-400">
          {isIndeterminate ? "…" : `${progress.percent}%`}
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-white/80 dark:bg-gray-900/60">
        <div
          className={`h-full rounded-full bg-brand-500 transition-all duration-500 ease-out ${
            isIndeterminate ? "animate-pulse" : ""
          }`}
          style={{ width }}
        />
      </div>

      <p className="mt-2 text-theme-xs text-gray-600 dark:text-gray-400">{progress.message}</p>
    </div>
  );
}
