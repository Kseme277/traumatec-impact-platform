import { Link } from "react-router";
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarDays, Eye, Check, Trash2, FileArchive } from "lucide-react";
import Button from "../../components/ui/button/Button";
import GuidedEmptyState from "../../components/common/GuidedEmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import TableIconButton from "../../components/common/TableIconButton";
import { useTranslation } from "../../i18n/useTranslation";
import { useTipAuth } from "../../context/TipAuthContext";
import type { Evenement } from "./types";
import { themeLabel } from "./types";
import type { EventSortDir, EventSortField } from "./eventSort";
import { formatDateRangeFr } from "./eventDates";
import ProjectStatusBadge from "./ProjectStatusBadge";
import Badge from "../../components/ui/badge/Badge";
import { getPackageGenerationUrgency, needsPackageGenerationHighlight } from "./packageGenerationUrgency";
import { hasGeneratedPackage, isEventPackageApproved } from "../documents/eventWorkflowUi";
import { workflowStatusLabel, type WorkflowStatus } from "../auth/types";
import { workflowStatusBadgeColor } from "../documents/workflowStatusVisual";
import { isEventOpen } from "./projectStatus";

interface EvenementsTableProps {
  events: Evenement[];
  sortBy: EventSortField;
  sortDir: EventSortDir;
  onSort: (field: EventSortField) => void;
  onClose: (event: Evenement) => void;
  onDelete: (event: Evenement) => void;
  showAdminActions?: boolean;
  showCreateAction?: boolean;
  onImportClick?: () => void;
}

type SortableColumn = {
  key: EventSortField;
  label: string;
};

function SortIcon({
  field,
  sortBy,
  sortDir,
}: {
  field: EventSortField;
  sortBy: EventSortField;
  sortDir: EventSortDir;
}) {
  if (sortBy !== field) {
    return <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />;
  }
  return sortDir === "asc" ? (
    <ArrowUp className="size-3.5 text-brand-500" aria-hidden />
  ) : (
    <ArrowDown className="size-3.5 text-brand-500" aria-hidden />
  );
}

export default function EvenementsTable({
  events,
  sortBy,
  sortDir,
  onSort,
  onClose,
  onDelete,
  showAdminActions = false,
  showCreateAction = true,
  onImportClick,
}: EvenementsTableProps) {
  const { t } = useTranslation();
  const { scopesEventsToOrganizer } = useTipAuth();

  const sortableColumns: SortableColumn[] = [
    { key: "project_number", label: t("events.tableProject") },
    { key: "title", label: t("events.tableEvent") },
    { key: "project_status", label: t("common.status") },
    { key: "responsible_person", label: t("events.tableResponsible") },
    { key: "start_date", label: t("events.dates") },
  ];

  if (events.length === 0) {
    return (
      <GuidedEmptyState
        icon={CalendarDays}
        title={t("ux.noEventsTitle")}
        message={scopesEventsToOrganizer ? t("ux.supportScopeDesc") : t("ux.noEventsDesc")}
      >
        {showCreateAction ? (
          <Link to="/evenements/nouveau">
            <Button size="sm">{t("events.addEvent")}</Button>
          </Link>
        ) : null}
        {showAdminActions && onImportClick ? (
          <Button size="sm" variant="outline" onClick={onImportClick}>
            {t("events.importExcel")}
          </Button>
        ) : null}
      </GuidedEmptyState>
    );
  }

  return (
    <div className="-mx-4 overflow-hidden sm:-mx-6">
      <div className="overflow-x-auto px-4 sm:px-6">
        <Table className="min-w-[920px] table-fixed w-full">
          <colgroup>
            <col className="w-[120px]" />
            <col className="w-[240px]" />
            <col className="w-[110px]" />
            <col className="w-[140px]" />
            <col className="w-[150px]" />
            <col className="w-[120px]" />
          </colgroup>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              {sortableColumns.map((column) => (
                <TableCell
                  key={column.key}
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  <button
                    type="button"
                    onClick={() => onSort(column.key)}
                    className="inline-flex items-center gap-1.5 transition hover:text-brand-500 dark:hover:text-brand-400"
                    aria-label={`${t("events.sortBy")} ${column.label}`}
                  >
                    <span>{column.label}</span>
                    <SortIcon field={column.key} sortBy={sortBy} sortDir={sortDir} />
                  </button>
                </TableCell>
              ))}
              <TableCell
                isHeader
                className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                {t("common.actions")}
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {events.map((event) => {
              const packageUrgent = needsPackageGenerationHighlight(event);
              const urgency = getPackageGenerationUrgency(event);
              const validated = isEventPackageApproved(event);
              const packageGenerated = hasGeneratedPackage(event);
              const workflowStatus = event.latest_package_workflow as WorkflowStatus | undefined;
              return (
              <TableRow
                key={event.id}
                className={
                  validated
                    ? "bg-gray-100/70 opacity-60 hover:bg-gray-100/80 dark:bg-gray-900/30"
                    : packageUrgent
                    ? "bg-amber-50/35 hover:bg-amber-50/55 dark:bg-amber-500/[0.05] dark:hover:bg-amber-500/[0.08]"
                    : "hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                }
              >
                <TableCell className="px-4 py-4 text-start font-mono text-theme-sm text-gray-700 dark:text-gray-300">
                  <span className="block truncate" title={event.project_number}>
                    {event.project_number}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-4 text-start">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/evenements/${event.id}`}
                      className="block truncate font-medium text-gray-800 transition hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400"
                      title={event.title}
                    >
                      {event.title}
                    </Link>
                    {packageUrgent && (
                      <Badge color={urgency === "overdue" ? "error" : "warning"} size="sm">
                        {urgency === "overdue" ? t("events.packageOverdueBadge") : t("events.packageDueBadge")}
                      </Badge>
                    )}
                    {packageGenerated && workflowStatus && !packageUrgent && (
                      <Badge
                        color={workflowStatusBadgeColor(workflowStatus)}
                        size="sm"
                        startIcon={<FileArchive className="size-3" aria-hidden />}
                      >
                        {workflowStatusLabel(workflowStatus, t)}
                      </Badge>
                    )}
                  </div>
                  {packageUrgent && (
                    <Link
                      to={`/documents/generation?event=${event.id}`}
                      className="mt-1 inline-block text-theme-xs text-brand-600/90 hover:text-brand-600 hover:underline dark:text-brand-400"
                    >
                      {t("events.packageDueLink")}
                    </Link>
                  )}
                  {packageGenerated && !packageUrgent && (
                    <Link
                      to={`/evenements/${event.id}`}
                      className="mt-1 inline-flex items-center gap-1 text-theme-xs text-gray-600 hover:text-brand-600 hover:underline dark:text-gray-400 dark:hover:text-brand-400"
                    >
                      <FileArchive className="size-3" aria-hidden />
                      {t("events.packageGeneratedLink")}
                    </Link>
                  )}
                  {(event.city || event.country || event.preparation_theme) && (
                    <span className="mt-1 block truncate text-theme-xs text-gray-500 dark:text-gray-400">
                      {[event.city, event.country].filter(Boolean).join(", ")}
                      {event.preparation_theme ? ` · ${themeLabel(event.preparation_theme)}` : ""}
                    </span>
                  )}
                </TableCell>
                <TableCell className="px-4 py-4 text-start">
                  <ProjectStatusBadge projectStatus={event.project_status} />
                </TableCell>
                <TableCell className="px-4 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-300">
                  <span className="block truncate" title={event.responsible_person ?? undefined}>
                    {event.responsible_person ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {formatDateRangeFr(event.start_date, event.end_date)}
                </TableCell>
                <TableCell className="px-4 py-4 text-start">
                  <div className="flex items-center gap-1">
                    <TableIconButton
                      label={t("events.viewDetails")}
                      href={`/evenements/${event.id}`}
                    >
                      <Eye className="size-5" strokeWidth={1.75} aria-hidden />
                    </TableIconButton>
                    {isEventOpen(event.project_status) && (
                      <TableIconButton
                        label={t("events.closeEvent")}
                        variant="success"
                        onClick={() => onClose(event)}
                      >
                        <Check className="size-5" strokeWidth={1.75} aria-hidden />
                      </TableIconButton>
                    )}
                    {showAdminActions && (
                      <TableIconButton
                        label={t("events.deleteEvent")}
                        variant="danger"
                        onClick={() => onDelete(event)}
                      >
                        <Trash2 className="size-5" strokeWidth={1.75} aria-hidden />
                      </TableIconButton>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
