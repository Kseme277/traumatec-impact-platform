export type ProcessGuideStepStatus = "done" | "current" | "upcoming";

export interface ProcessGuideStep {
  id: string;
  label: string;
  hint?: string;
  status: ProcessGuideStepStatus;
}

interface ProcessGuideStepsProps {
  steps: ProcessGuideStep[];
  className?: string;
}

export default function ProcessGuideSteps({ steps, className = "" }: ProcessGuideStepsProps) {
  return (
    <ol className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-4 ${className}`}>
      {steps.map((step, index) => {
        const isDone = step.status === "done";
        const isCurrent = step.status === "current";

        return (
          <li
            key={step.id}
            className={`rounded-xl border p-4 transition ${
              isCurrent
                ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20 dark:border-brand-500/50 dark:bg-brand-500/10"
                : isDone
                  ? "border-success-200 bg-success-50/40 dark:border-success-500/30 dark:bg-success-500/10"
                  : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  isDone
                    ? "bg-success-500 text-white"
                    : isCurrent
                      ? "bg-brand-500 text-white"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}
                aria-hidden
              >
                {isDone ? "✓" : index + 1}
              </span>
              <div className="min-w-0 text-left">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{step.label}</p>
                {step.hint ? (
                  <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{step.hint}</p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
