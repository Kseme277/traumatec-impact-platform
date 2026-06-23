import { Link } from "react-router";
import Badge from "../../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useTranslation } from "../../i18n/useTranslation";
import { formatDateRangeFr } from "./eventDates";
import type { Evenement } from "./types";
import { themeLabel } from "./types";
import { getPackageGenerationUrgency, needsPackageGenerationHighlight } from "./packageGenerationUrgency";
import ProjectStatusBadge from "./ProjectStatusBadge";

interface PackageDueEventsPanelProps {
  events: Evenement[];
  className?: string;
  maxRows?: number;
}

export default function PackageDueEventsPanel({
  events,
  className = "",
  maxRows = 8,
}: PackageDueEventsPanelProps) {
  const { t } = useTranslation();
  const dueEvents = events.filter(needsPackageGenerationHighlight);

  if (dueEvents.length === 0) {
    return null;
  }

  const visible = dueEvents.slice(0, maxRows);
  const hiddenCount = dueEvents.length - visible.length;

  return (
    <div
      className={`rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-white/[0.02] ${className}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {t("events.packageDuePanelTitle")}
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t("events.packageDuePanelHint")}</p>
        </div>
        <Badge color="warning" size="sm">
          {dueEvents.length} {t("events.packageDueCount")}
        </Badge>
      </div>

      <div className="max-h-72 overflow-auto rounded-lg border border-gray-100 dark:border-gray-800">
        <Table className="min-w-[720px] w-full">
          <TableHeader className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm dark:bg-gray-900/95">
            <TableRow>
              <TableCell isHeader className="px-3 py-2 text-xs font-medium text-gray-500">
                {t("events.tableProject")}
              </TableCell>
              <TableCell isHeader className="px-3 py-2 text-xs font-medium text-gray-500">
                {t("events.tableEvent")}
              </TableCell>
              <TableCell isHeader className="px-3 py-2 text-xs font-medium text-gray-500">
                {t("common.status")}
              </TableCell>
              <TableCell isHeader className="px-3 py-2 text-xs font-medium text-gray-500">
                {t("events.dates")}
              </TableCell>
              <TableCell isHeader className="px-3 py-2 text-xs font-medium text-gray-500">
                {t("events.packageDueColumn")}
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {visible.map((event) => {
              const urgency = getPackageGenerationUrgency(event);
              return (
                <TableRow
                  key={event.id}
                  className="bg-amber-50/40 hover:bg-amber-50/70 dark:bg-amber-500/[0.06] dark:hover:bg-amber-500/10"
                >
                  <TableCell className="px-3 py-2.5 font-mono text-theme-xs text-gray-600 dark:text-gray-300">
                    {event.project_number}
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    <Link
                      to={`/evenements/${event.id}`}
                      className="line-clamp-2 text-theme-sm font-medium text-gray-800 hover:text-brand-500 dark:text-white/90"
                      title={event.title}
                    >
                      {event.title}
                    </Link>
                    {(event.city || event.country || event.preparation_theme) && (
                      <span className="mt-0.5 block truncate text-theme-xs text-gray-400">
                        {[event.city, event.country].filter(Boolean).join(", ")}
                        {event.preparation_theme ? ` · ${themeLabel(event.preparation_theme)}` : ""}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    <ProjectStatusBadge projectStatus={event.project_status} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 whitespace-nowrap text-theme-xs text-gray-500">
                    {formatDateRangeFr(event.start_date, event.end_date)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    <div className="flex flex-col gap-1">
                      <Badge color={urgency === "overdue" ? "error" : "warning"} size="sm">
                        {urgency === "overdue" ? t("events.packageOverdueBadge") : t("events.packageDueBadge")}
                      </Badge>
                      <Link
                        to={`/documents/generation?event=${event.id}`}
                        className="text-theme-xs text-brand-600 hover:underline dark:text-brand-400"
                      >
                        {t("events.packageDueLink")}
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {hiddenCount > 0 && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {t("events.packageDueMore").replace("{count}", String(hiddenCount))}
        </p>
      )}
    </div>
  );
}
