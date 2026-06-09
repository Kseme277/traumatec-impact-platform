import { useEffect, useRef } from "react";
import type { GenerationLogEntry } from "./types";
import { useTranslation } from "../../i18n/useTranslation";

function levelClass(level: string): string {
  if (level === "error") {
    return "text-error-600 dark:text-error-400";
  }
  if (level === "warn" || level === "warning") {
    return "text-warning-600 dark:text-warning-400";
  }
  return "text-gray-600 dark:text-gray-300";
}

interface GenerationLogPanelProps {
  logs: GenerationLogEntry[];
  title?: string;
  emptyMessage?: string;
  maxHeightClass?: string;
}

export default function GenerationLogPanel({
  logs,
  title,
  emptyMessage,
  maxHeightClass = "max-h-64",
}: GenerationLogPanelProps) {
  const { t, localeTag } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-900/40">
      <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {title ?? t("documents.generationLogs")}
        </p>
      </div>
      <div
        ref={scrollRef}
        className={`overflow-y-auto px-3 py-2 font-mono text-xs leading-relaxed ${maxHeightClass}`}
      >
        {logs.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500">
            {emptyMessage ?? t("documents.noGenerationLogs")}
          </p>
        ) : (
          <ul className="space-y-1">
            {logs.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="flex flex-wrap gap-x-2">
                <span className="shrink-0 text-gray-400 dark:text-gray-500">
                  {new Date(entry.at).toLocaleTimeString(localeTag)}
                </span>
                <span className={levelClass(entry.level)}>{entry.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
