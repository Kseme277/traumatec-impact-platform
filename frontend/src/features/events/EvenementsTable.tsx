import { Link } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Check, Eye, Trash2 } from "lucide-react";
import TableIconButton from "../../components/common/TableIconButton";
import { useTranslation } from "../../i18n/useTranslation";
import type { Evenement } from "./types";
import { themeLabel } from "./types";
import { formatDateRangeFr } from "./eventDates";
import ProjectStatusBadge from "./ProjectStatusBadge";
import { isEventOpen } from "./projectStatus";

interface EvenementsTableProps {
  events: Evenement[];
  onClose: (event: Evenement) => void;
  onDelete: (event: Evenement) => void;
  showAdminActions?: boolean;
}

export default function EvenementsTable({
  events,
  onClose,
  onDelete,
  showAdminActions = false,
}: EvenementsTableProps) {
  const { t } = useTranslation();

  const headers = [
    t("events.tableProject"),
    t("events.tableEvent"),
    t("common.status"),
    t("events.tableResponsible"),
    t("events.dates"),
    t("common.actions"),
  ];

  if (events.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{t("events.empty")}</p>
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
              {headers.map((header) => (
                <TableCell
                  key={header}
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {events.map((event) => (
              <TableRow key={event.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <TableCell className="px-4 py-4 text-start font-mono text-theme-sm text-gray-700 dark:text-gray-300">
                  <span className="block truncate" title={event.project_number}>
                    {event.project_number}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-4 text-start">
                  <Link
                    to={`/evenements/${event.id}`}
                    className="block truncate font-medium text-gray-800 transition hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400"
                    title={event.title}
                  >
                    {event.title}
                  </Link>
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
