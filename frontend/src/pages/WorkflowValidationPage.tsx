import { useAuth } from "@clerk/clerk-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import PageMeta from "../components/common/PageMeta";
import ComponentCard from "../components/common/ComponentCard";
import CompactListPagination from "../components/common/CompactListPagination";
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
import type { WorkflowQueueItem, WorkflowState } from "../api/workflow";
import { ApiError } from "../api/client";
import { confirmAction, promptComment, showError, showSuccess } from "../lib/swal";
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
    if (loading) return <p className="text-sm text-gray-500">{t("common.loading")}</p>;
    if (items.length === 0) return <p className="text-sm text-gray-500">{emptyMessage}</p>;
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
                  <Badge color="warning" size="sm">{workflowStatusLabel(item.workflow_status, t)}</Badge>
                </div>
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
      <h1 className="mb-6 text-2xl font-semibold text-gray-800 dark:text-white/90">{t("nav.workflowValidation")}</h1>
      {error ? <p className="mb-4 text-sm text-error-600">{error}</p> : null}
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
            <p className="text-sm text-gray-500">{t("workflow.selectPackage")}</p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm">{selected.project_number} — {selected.event_title}</p>
              <Badge color="info">{workflowStatusLabel(selected.workflow_status, t)}</Badge>

              {selected.workflow_status === "under_final_validation" ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void handleApprove()}>{t("workflow.approvePackage")}</Button>
                  <Button size="sm" variant="outline" onClick={() => void handleReject()}>{t("workflow.rejectPackage")}</Button>
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
