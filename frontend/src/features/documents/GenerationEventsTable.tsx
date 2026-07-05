import { Link } from "react-router";
import { FileArchive, Play } from "lucide-react";
import GuidedEmptyState from "../../components/common/GuidedEmptyState";
import TableIconButton from "../../components/common/TableIconButton";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import type { Evenement } from "../events/types";
import { formatEventDateRange } from "../events/eventDates";
import { statusColor, statusLabel } from "../events/types";
import { useTranslation } from "../../i18n/useTranslation";

interface GenerationEventsTableProps {
  events: Evenement[];
  onOpen: (eventId: string) => void;
}

export default function GenerationEventsTable({ events, onOpen }: GenerationEventsTableProps) {
  const { t } = useTranslation();

  if (events.length === 0) {
    return (
      <GuidedEmptyState
        icon={FileArchive}
        title={t("documents.noEligible")}
        message={t("ux.noEventsDesc")}
      >
        <Link to="/evenements">
          <Button size="sm" variant="outline">
            {t("documents.eventList")}
          </Button>
        </Link>
      </GuidedEmptyState>
    );
  }

  return (
    <div className="-mx-4 overflow-hidden sm:-mx-6">
      <div className="overflow-x-auto px-4 sm:px-6">
        <Table className="min-w-[920px] table-fixed w-full">
          <colgroup>
            <col className="w-[110px]" />
            <col />
            <col className="w-[110px]" />
            <col className="w-[150px]" />
            <col className="w-[180px]" />
            <col className="w-[72px]" />
          </colgroup>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell
                isHeader
                className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                {t("documents.generationTable.project")}
              </TableCell>
              <TableCell
                isHeader
                className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                {t("documents.generationTable.event")}
              </TableCell>
              <TableCell
                isHeader
                className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                {t("common.status")}
              </TableCell>
              <TableCell
                isHeader
                className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                {t("documents.generationTable.dates")}
              </TableCell>
              <TableCell
                isHeader
                className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                {t("documents.generationTable.location")}
              </TableCell>
              <TableCell
                isHeader
                className="px-4 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                {t("common.actions")}
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {events.map((event) => (
              <TableRow
                key={event.id}
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                onClick={() => onOpen(event.id)}
              >
                <TableCell className="px-4 py-3.5 text-start font-mono text-theme-sm text-gray-700 dark:text-gray-300">
                  <span className="block truncate" title={event.project_number}>
                    {event.project_number}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3.5 text-start">
                  <span
                    className="block truncate font-medium text-gray-800 dark:text-white/90"
                    title={event.title}
                  >
                    {event.title}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3.5 text-start">
                  <Badge color={statusColor(event.status)} size="sm">
                    {statusLabel(event.status, t)}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-3.5 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                  {formatEventDateRange(event)}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                  <span
                    className="block truncate"
                    title={[event.city, event.country].filter(Boolean).join(", ")}
                  >
                    {[event.city, event.country].filter(Boolean).join(", ") || "—"}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3.5 text-end">
                  <TableIconButton
                    label={t("documents.generationTable.open")}
                    onClick={() => onOpen(event.id)}
                  >
                    <Play className="size-4.5" />
                  </TableIconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
