import { Link } from "react-router";
import { ClipboardList, Eye } from "lucide-react";
import DataTablePagination from "../../components/common/DataTablePagination";
import GuidedEmptyState from "../../components/common/GuidedEmptyState";
import TableIconButton from "../../components/common/TableIconButton";
import TableLoader from "../../components/common/TableLoader";
import Badge from "../../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import type { WorkflowQueueItem } from "../../api/workflow";
import { workflowStatusLabel } from "../auth/types";
import { workflowStatusBadgeColor } from "../documents/workflowStatusVisual";
import WorkflowPhaseDeadline from "./WorkflowPhaseDeadline";
import type { usePagination } from "../../hooks/usePagination";

interface WorkflowQueueListProps {
  items: WorkflowQueueItem[];
  loading: boolean;
  emptyTitle: string;
  emptyMessage: string;
  emptyAction?: React.ReactNode;
  basePath: string;
  activeId?: string;
  pagination: ReturnType<typeof usePagination<WorkflowQueueItem>>;
  t: (key: string) => string;
}

export default function WorkflowQueueList({
  items,
  loading,
  emptyTitle,
  emptyMessage,
  emptyAction,
  basePath,
  activeId,
  pagination,
  t,
}: WorkflowQueueListProps) {
  if (loading) {
    return <TableLoader message={t("common.loading")} />;
  }

  if (items.length === 0) {
    return (
      <GuidedEmptyState icon={ClipboardList} title={emptyTitle} message={emptyMessage}>
        {emptyAction}
      </GuidedEmptyState>
    );
  }

  return (
    <>
      <div className="-mx-4 overflow-hidden sm:-mx-6">
        <div className="overflow-x-auto px-4 sm:px-6">
          <Table className="min-w-[880px] table-fixed w-full">
            <colgroup>
              <col className="w-[110px]" />
              <col />
              <col className="w-[130px]" />
              <col className="w-[160px]" />
              <col className="w-[72px]" />
            </colgroup>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {t("workflow.queueTable.project")}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {t("workflow.queueTable.event")}
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
                  {t("workflow.deadline")}
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
              {pagination.paginatedItems.map((item) => {
                const isActive = activeId === item.id;
                return (
                  <TableRow
                    key={item.id}
                    className={
                      isActive
                        ? "bg-brand-50/50 dark:bg-brand-500/5"
                        : "hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    }
                  >
                    <TableCell className="px-4 py-3.5 text-start font-mono text-theme-sm text-gray-700 dark:text-gray-300">
                      <span className="block truncate" title={item.project_number ?? undefined}>
                        {item.project_number ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start">
                      <Link
                        to={`${basePath}/${item.id}`}
                        className="block truncate font-medium text-gray-800 transition hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400"
                        title={item.event_title ?? undefined}
                      >
                        {item.event_title ?? item.project_number ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start">
                      <Badge color={workflowStatusBadgeColor(item.workflow_status)} size="sm">
                        {workflowStatusLabel(item.workflow_status, t)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                      <WorkflowPhaseDeadline
                        phaseDueAt={item.phase_due_at}
                        isOverdue={item.is_overdue}
                      />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-end">
                      <TableIconButton
                        href={`${basePath}/${item.id}`}
                        label={t("workflow.queueTable.open")}
                      >
                        <Eye className="size-4.5" />
                      </TableIconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
      <DataTablePagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        rangeStart={pagination.rangeStart}
        rangeEnd={pagination.rangeEnd}
        onPageChange={pagination.setPage}
      />
    </>
  );
}
