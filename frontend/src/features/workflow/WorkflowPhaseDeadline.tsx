import Badge from "../ui/badge/Badge";
import { useTranslation } from "../../i18n/useTranslation";

interface WorkflowPhaseDeadlineProps {
  phaseDueAt?: string | null;
  isOverdue?: boolean;
  className?: string;
}

export default function WorkflowPhaseDeadline({
  phaseDueAt,
  isOverdue = false,
  className = "",
}: WorkflowPhaseDeadlineProps) {
  const { t, localeTag } = useTranslation();

  if (!phaseDueAt) {
    return null;
  }

  const due = new Date(phaseDueAt);
  const formatted = due.toLocaleString(localeTag, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex flex-wrap items-center gap-1.5 text-xs ${className}`}>
      <span className="text-gray-500 dark:text-gray-400">
        {t("workflow.deadline")}: {formatted}
      </span>
      {isOverdue ? (
        <Badge color="error" size="sm">
          {t("workflow.overdue")}
        </Badge>
      ) : null}
    </div>
  );
}
