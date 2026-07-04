import { useAuth } from "@clerk/clerk-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ClipboardList } from "lucide-react";
import PageMeta from "../components/common/PageMeta";
import AdminBreadcrumb from "../components/common/AdminBreadcrumb";
import ComponentCard from "../components/common/ComponentCard";
import CompactListPagination from "../components/common/CompactListPagination";
import GuidedEmptyState from "../components/common/GuidedEmptyState";
import HelpTipAlert from "../components/common/HelpTipAlert";
import TableLoader from "../components/common/TableLoader";
import Button from "../components/ui/button/Button";
import Badge from "../components/ui/badge/Badge";
import WorkflowFileReviewList from "../features/workflow/WorkflowFileReviewList";
import {
  approveValidator,
  fetchDeliveryMailto,
  fetchWorkflowQueue,
  fetchWorkflowState,
  rejectValidator,
} from "../api/workflow";
import { getApiToken } from "../lib/clerkToken";
import { workflowStatusLabel } from "../features/auth/types";
import { workflowStatusBadgeColor } from "../features/documents/workflowStatusVisual";
import type { WorkflowQueueItem, WorkflowState } from "../api/workflow";
import { ApiError } from "../api/client";
import { confirmAction, promptComment, showError, showSuccess } from "../lib/swal";
import WorkflowPhaseDeadline from "../features/workflow/WorkflowPhaseDeadline";
import WorkflowProcessGuide from "../features/workflow/WorkflowProcessGuide";
import WorkflowStatusStepper from "../features/documents/WorkflowStatusStepper";
import WorkflowFileReviewProgress, {
  useFileReviewSummary,
} from "../features/workflow/WorkflowFileReviewProgress";
import { usePagination } from "../hooks/usePagination";
import { useTranslation } from "../i18n/useTranslation";

const WORKFLOW_QUEUE_PAGE_SIZE = 8;

export default function WorkflowValidationPage() {
  const { getToken } = useAuth();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [queue, setQueue] = useState<WorkflowQueueItem[]>([]);
  const [deliveryQueue, setDeliveryQueue] = useState<WorkflowQueueItem[]>([]);
  const [selected, setSelected] = useState<WorkflowState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getApiToken(getToken);
      const [pending, delivery] = await Promise.all([
        fetchWorkflowQueue(token, "validateur", 50, "pending"),
        fetchWorkflowQueue(token, "validateur", 50, "delivery"),
      ]);
      setQueue(pending);
      setDeliveryQueue(delivery);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.error"));
      setQueue([]);
      setDeliveryQueue([]);
    } finally {
      setLoading(false);
    }
  }, [getToken, t]);

  const loadJob = useCallback(
    async (jobId: string) => {
      try {
        const token = await getApiToken(getToken);
        setSelected(await fetchWorkflowState(token, jobId));
      } catch (err) {
        await showError(t("common.error"), err instanceof ApiError ? err.message : t("common.error"));
      }
    },
    [getToken, t],
  );

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    const jobId = searchParams.get("job");
    if (jobId) void loadJob(jobId);
  }, [loadJob, searchParams]);

  async function selectJob(jobId: string) {
    setSearchParams({ job: jobId });
    await loadJob(jobId);
  }

  async function handleApprove() {
    if (!selected) return;
    const confirmed = await confirmAction({
      title: t("confirm.approvePackageTitle"),
      confirmText: t("confirm.proceed"),
      cancelText: t("common.cancel"),
    });
    if (!confirmed.isConfirmed) return;
    try {
      const token = await getApiToken(getToken);
      const state = await approveValidator(token, selected.job_id);
      setSelected(state);
      await loadQueue();
      showSuccess(t("workflow.packageApproved"));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : t("common.error"));
    }
  }

  async function handleReject() {
    if (!selected) return;
    const prompt = await promptComment({
      title: t("confirm.rejectPackageTitle"),
      text: t("confirm.rejectPackageText"),
      placeholder: t("confirm.rejectReasonPlaceholder"),
      confirmText: t("confirm.proceed"),
      cancelText: t("common.cancel"),
    });
    if (!prompt.isConfirmed || !prompt.value) return;
    try {
      const token = await getApiToken(getToken);
      const state = await rejectValidator(token, selected.job_id, prompt.value);
      setSelected(state);
      await loadQueue();
      showSuccess(t("workflow.packageRejected"));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : t("common.error"));
    }
  }

  async function handleMailto() {
    if (!selected) return;
    const confirmed = await confirmAction({
      title: t("confirm.sendMailtoTitle"),
      text: t("confirm.sendMailtoText"),
      confirmText: t("confirm.proceed"),
      cancelText: t("common.cancel"),
    });
    if (!confirmed.isConfirmed) return;
    try {
      const token = await getApiToken(getToken);
      const { mailto_url } = await fetchDeliveryMailto(token, selected.job_id);
      window.location.href = mailto_url;
    } catch (err) {
      showError(
        t("workflow.mailtoErrorTitle"),
        err instanceof ApiError ? err.message : t("common.error"),
      );
    }
  }

  const canReviewFiles = selected?.workflow_status === "under_final_validation";
  const fileReview = useFileReviewSummary(selected?.files ?? []);

  const pendingPagination = usePagination(queue, WORKFLOW_QUEUE_PAGE_SIZE, `pending-${queue.length}`);
  const deliveryPagination = usePagination(
    deliveryQueue,
    WORKFLOW_QUEUE_PAGE_SIZE,
    `delivery-${deliveryQueue.length}`,
  );

  function renderQueueList(
    items: WorkflowQueueItem[],
    emptyMessage: string,
    pagination: ReturnType<typeof usePagination<WorkflowQueueItem>>,
  ) {
    if (loading) return <TableLoader message={t("common.loading")} />;
    if (items.length === 0) {
      return (
        <GuidedEmptyState
          icon={ClipboardList}
          title={t("ux.workflowEmptyTitle")}
          message={emptyMessage}
        >
          <Link to="/workflow/controle">
            <Button size="sm" variant="outline">{t("nav.workflowControle")}</Button>
          </Link>
        </GuidedEmptyState>
      );
    }
    return (
      <>
        <ul className="space-y-2">
          {pagination.paginatedItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="w-full rounded-xl border border-gray-200 p-3 text-left hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5"
                onClick={() => void selectJob(item.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{item.project_number ?? item.event_title}</span>
                  <Badge color={workflowStatusBadgeColor(item.workflow_status)} size="sm">
                    {workflowStatusLabel(item.workflow_status, t)}
                  </Badge>
                </div>
                <WorkflowPhaseDeadline
                  phaseDueAt={item.phase_due_at}
                  isOverdue={item.is_overdue}
                  className="mt-2"
                />
              </button>
            </li>
          ))}
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

  return (
    <>
      <PageMeta title={t("nav.workflowValidation")} description={t("workflow.validationDesc")} />
      <AdminBreadcrumb
        pageTitle={t("nav.workflowValidation")}
        crumbs={[{ label: t("nav.documents"), to: "/documents/generation" }]}
      />

      <div className="mb-6">
        <HelpTipAlert
          variant="info"
          title={t("ux.safeModeTitle")}
          message={t("workflow.validationDesc")}
        />
      </div>

      <ComponentCard className="mb-6">
        <WorkflowProcessGuide role="validateur" />
      </ComponentCard>

      {error ? (
        <div className="mb-4">
          <HelpTipAlert variant="error" title={t("common.error")} message={error} />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="space-y-6">
          <ComponentCard title={t("workflow.queueValidation")}>
            {renderQueueList(queue, t("workflow.queueValidationEmpty"), pendingPagination)}
          </ComponentCard>
          <ComponentCard title={t("workflow.queueDelivery")}>
            {renderQueueList(deliveryQueue, t("workflow.queueDeliveryEmpty"), deliveryPagination)}
          </ComponentCard>
        </div>
        <ComponentCard title={t("workflow.packageDetail")}>
          {!selected ? (
            <GuidedEmptyState
              icon={ClipboardList}
              title={t("ux.workflowSelectTitle")}
              message={t("ux.workflowSelectDesc")}
            />
          ) : (
            <div className="space-y-4">
              <p className="text-sm">{selected.project_number} — {selected.event_title}</p>
              <WorkflowStatusStepper status={selected.workflow_status} />
              <Badge color={workflowStatusBadgeColor(selected.workflow_status)}>
                {workflowStatusLabel(selected.workflow_status, t)}
              </Badge>
              <WorkflowPhaseDeadline
                phaseDueAt={selected.phase_due_at}
                isOverdue={selected.is_overdue}
              />

              {selected.workflow_status === "under_final_validation" ? (
                <div className="space-y-3">
                  <WorkflowFileReviewProgress files={selected.files} />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={!fileReview.allApproved}
                      onClick={() => void handleApprove()}
                    >
                      {t("workflow.approvePackage")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void handleReject()}>
                      {t("workflow.rejectPackage")}
                    </Button>
                  </div>
                </div>
              ) : null}

              {selected.workflow_status === "approved" ? (
                <Button size="sm" onClick={() => void handleMailto()}>{t("workflow.sendNational")}</Button>
              ) : null}

              <WorkflowFileReviewList
                jobId={selected.job_id}
                files={selected.files}
                canReview={!!canReviewFiles}
                onUpdated={() => void loadJob(selected.job_id)}
              />

              {selected.history.length > 0 ? (
                <div className="border-t pt-3 dark:border-gray-800">
                  <p className="mb-2 text-xs font-medium text-gray-500">{t("workflow.history")}</p>
                  <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    {selected.history.map((step) => (
                      <li key={step.id}>
                        {new Date(step.created_at).toLocaleString()} — {step.actor_name ?? "—"} : {step.action}
                        {step.comment ? ` (${step.comment})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </ComponentCard>
      </div>
    </>
  );
}
