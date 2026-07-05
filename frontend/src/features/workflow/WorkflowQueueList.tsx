import { Link } from "react-router";
import { ChevronRight, ClipboardList } from "lucide-react";
import CompactListPagination from "../../components/common/CompactListPagination";
import GuidedEmptyState from "../../components/common/GuidedEmptyState";
import TableLoader from "../../components/common/TableLoader";
import Badge from "../../components/ui/badge/Badge";
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
      <ul className="space-y-3">
        {pagination.paginatedItems.map((item) => {
          const isActive = activeId === item.id;
          return (
            <li key={item.id}>
              <Link
                to={`${basePath}/${item.id}`}
                className={`group flex items-start justify-between gap-3 rounded-2xl border p-4 transition-colors ${
                  isActive
                    ? "border-brand-500 bg-brand-50/60 dark:border-brand-500/40 dark:bg-brand-500/10"
                    : "border-gray-200 hover:border-brand-200 hover:bg-gray-50/80 dark:border-gray-800 dark:hover:border-brand-500/30 dark:hover:bg-white/[0.03]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm text-gray-800 dark:text-white/90">
                      {item.project_number ?? item.event_title}
                    </span>
                    <Badge color={workflowStatusBadgeColor(item.workflow_status)} size="sm">
                      {workflowStatusLabel(item.workflow_status, t)}
                    </Badge>
                  </div>
                  {item.event_title && item.project_number ? (
                    <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                      {item.event_title}
                    </p>
                  ) : null}
                  <WorkflowPhaseDeadline
                    phaseDueAt={item.phase_due_at}
                    isOverdue={item.is_overdue}
                    className="mt-2"
                  />
                </div>
                <ChevronRight
                  className={`mt-0.5 size-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 ${
                    isActive ? "text-brand-500" : ""
                  }`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
      <CompactListPagination
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
