import { useTranslation } from "../../i18n/useTranslation";
import { workflowStatusLabel } from "../auth/types";
import type { WorkflowStatus } from "./types";
import { WORKFLOW_PIPELINE, workflowPipelineIndex } from "./workflowStatusVisual";

interface WorkflowStatusStepperProps {
  status: WorkflowStatus;
  compact?: boolean;
}

export default function WorkflowStatusStepper({ status, compact = false }: WorkflowStatusStepperProps) {
  const { t } = useTranslation();
  const activeIndex = workflowPipelineIndex(status);
  const isRejected = status === "procedure_rejected" || status === "validator_rejected";

  return (
    <div className="w-full">
      <div className={`flex items-center ${compact ? "gap-0.5" : "gap-1"}`}>
        {WORKFLOW_PIPELINE.map((step, index) => {
          const done = index < activeIndex || (index === activeIndex && status === "approved");
          const current = index === activeIndex && !isRejected && status !== "approved";
          const rejectedHere =
            (status === "procedure_rejected" && index === 2) ||
            (status === "validator_rejected" && index === 4);

          return (
            <div key={step} className="flex min-w-0 flex-1 items-center">
              <span
                className={`relative z-10 flex size-2.5 shrink-0 rounded-full ${
                  rejectedHere
                    ? "bg-error-500 ring-4 ring-error-500/20"
                    : done
                      ? "bg-brand-500"
                      : current
                        ? "bg-warning-500 ring-4 ring-warning-500/20"
                        : "bg-gray-200 dark:bg-gray-700"
                }`}
                title={workflowStatusLabel(step, t)}
              />
              {index < WORKFLOW_PIPELINE.length - 1 ? (
                <span
                  className={`mx-0.5 h-0.5 min-w-[8px] flex-1 rounded-full ${
                    index < activeIndex ? "bg-brand-400" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      {!compact && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {workflowStatusLabel(status, t)}
          {isRejected ? ` · ${t("documents.workflowRejectedHint")}` : ""}
        </p>
      )}
    </div>
  );
}
