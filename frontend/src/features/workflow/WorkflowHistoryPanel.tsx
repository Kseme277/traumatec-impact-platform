import type { WorkflowStep } from "../../api/workflow";
import { useTranslation } from "../../i18n/useTranslation";

interface WorkflowHistoryPanelProps {
  history: WorkflowStep[];
}

export default function WorkflowHistoryPanel({ history }: WorkflowHistoryPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-900/40">
      <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{t("workflow.history")}</p>
      <p className="mt-0.5 text-xs text-gray-500">{t("workflow.historyDesc")}</p>
      {history.length === 0 ? (
        <p className="mt-3 text-xs italic text-gray-400">{t("workflow.historyEmpty")}</p>
      ) : (
        <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto text-xs text-gray-600 dark:text-gray-400">
          {history.map((step) => (
            <li
              key={step.id}
              className="rounded-lg border border-gray-200/80 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-950/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-gray-800 dark:text-white/90">
                  {step.actor_name ?? "—"}
                </span>
                <time className="text-gray-400">{new Date(step.created_at).toLocaleString()}</time>
              </div>
              <p className="mt-1">
                <span className="font-medium">{step.step}</span>
                {" · "}
                {step.action}
              </p>
              {step.comment ? (
                <p className="mt-1 whitespace-pre-wrap text-gray-500 dark:text-gray-400">{step.comment}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
