import type { ImportJobProgress } from "./types";

interface EventsImportProgressBarProps {
  progress: ImportJobProgress;
}

function phaseLabel(phase: string): string {
  switch (phase) {
    case "upload":
      return "Envoi";
    case "parsing":
      return "Analyse";
    case "importing":
      return "Enregistrement";
    case "completed":
      return "Terminé";
    case "failed":
      return "Échec";
    default:
      return "Import";
  }
}

export default function EventsImportProgressBar({ progress }: EventsImportProgressBarProps) {
  const isIndeterminate = progress.total === 0 && progress.status !== "completed";
  const width = isIndeterminate ? "40%" : `${Math.max(progress.percent, 2)}%`;

  return (
    <div
      className="mt-4 rounded-xl border border-brand-200 bg-brand-50/80 p-4 dark:border-brand-500/30 dark:bg-brand-500/10"
      role="status"
      aria-live="polite"
      aria-label={progress.message}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
          {phaseLabel(progress.phase)} — {progress.filename}
        </p>
        <span className="text-theme-xs font-medium text-brand-600 dark:text-brand-400">
          {isIndeterminate ? "…" : `${progress.percent}%`}
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-white/80 dark:bg-gray-900/60">
        <div
          className={`h-full rounded-full bg-brand-500 transition-all duration-300 ease-out ${
            isIndeterminate ? "animate-pulse" : ""
          }`}
          style={{ width }}
        />
      </div>

      <p className="mt-2 text-theme-xs text-gray-600 dark:text-gray-400">{progress.message}</p>

      {progress.total > 0 && (
        <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-500">
          {progress.processed.toLocaleString("fr-FR")} / {progress.total.toLocaleString("fr-FR")} lignes
        </p>
      )}
    </div>
  );
}
