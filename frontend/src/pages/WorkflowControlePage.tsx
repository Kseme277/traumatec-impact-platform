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
import Select from "../components/form/Select";
import WorkflowFileReviewList from "../features/workflow/WorkflowFileReviewList";
import {
  assignReviewer,
  completeProcedure,
  fetchUsersByRole,
  fetchWorkflowQueue,
  fetchWorkflowState,
  rejectProcedure,
} from "../api/workflow";
import { getApiToken } from "../lib/clerkToken";
import { workflowStatusLabel } from "../features/auth/types";
import { workflowStatusBadgeColor } from "../features/documents/workflowStatusVisual";
import type { Utilisateur } from "../features/auth/types";
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

export default function WorkflowControlePage() {
  const { getToken } = useAuth();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [queue, setQueue] = useState<WorkflowQueueItem[]>([]);
  const [selected, setSelected] = useState<WorkflowState | null>(null);
  const [reviewers, setReviewers] = useState<Utilisateur[]>([]);
  const [validators, setValidators] = useState<Utilisateur[]>([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [validatorId, setValidatorId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getApiToken(getToken);
      const [items, users, validatorUsers] = await Promise.all([
        fetchWorkflowQueue(token, "controle"),
        fetchUsersByRole(token, "controle_procedure"),
        fetchUsersByRole(token, "validateur"),
      ]);
      setQueue(items);
      setReviewers(users);
      setValidators(validatorUsers);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.error"));
      setQueue([]);
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

  async function handleAssign(jobId: string, reviewerId?: number) {
    const confirmed = await confirmAction({
      title: t("confirm.assignReviewerTitle"),
      confirmText: t("confirm.proceed"),
      cancelText: t("common.cancel"),
    });
    if (!confirmed.isConfirmed) return;
    try {
      const token = await getApiToken(getToken);
      const state = await assignReviewer(token, jobId, reviewerId);
      setSelected(state);
      await loadQueue();
      showSuccess(t("workflow.assigned"));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : t("common.error"));
    }
  }

  async function handleComplete() {
    if (!selected) return;
    if (!validatorId) {
      await showError(t("workflow.validatorRequiredTitle"), t("workflow.validatorRequiredDesc"));
      return;
    }
    const confirmed = await confirmAction({
      title: t("confirm.completeControleTitle"),
      text: t("confirm.completeControleText"),
      confirmText: t("confirm.proceed"),
      cancelText: t("common.cancel"),
    });
    if (!confirmed.isConfirmed) return;
    try {
      const token = await getApiToken(getToken);
      const state = await completeProcedure(token, selected.job_id, Number(validatorId));
      setSelected(state);
      await loadQueue();
      showSuccess(t("workflow.procedureComplete"));
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
      const state = await rejectProcedure(token, selected.job_id, prompt.value);
      setSelected(state);
      await loadQueue();
      showSuccess(t("workflow.packageRejected"));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : t("common.error"));
    }
  }

  const reviewerOptions = reviewers.map((u) => ({
    value: String(u.id),
    label: `${u.prenom} ${u.nom}`,
  }));

  const validatorOptions = validators.map((u) => ({
    value: String(u.id),
    label: `${u.prenom} ${u.nom}`,
  }));

  const canReviewFiles =
    !!selected &&
    ["under_procedure_review", "submitted"].includes(selected.workflow_status);

  const fileReview = useFileReviewSummary(selected?.files ?? []);

  const queuePagination = usePagination(queue, WORKFLOW_QUEUE_PAGE_SIZE, `controle-${queue.length}`);

  return (
    <>
      <PageMeta title={t("nav.workflowControle")} description={t("workflow.controleDesc")} />
      <AdminBreadcrumb
        pageTitle={t("nav.workflowControle")}
        crumbs={[{ label: t("nav.documents"), to: "/documents/generation" }]}
      />

      <div className="mb-6">
        <HelpTipAlert
          variant="info"
          title={t("ux.safeModeTitle")}
          message={t("workflow.controleDesc")}
        />
      </div>

      <ComponentCard className="mb-6">
        <WorkflowProcessGuide role="controle" />
      </ComponentCard>

      {error ? (
        <div className="mb-4">
          <HelpTipAlert variant="error" title={t("common.error")} message={error} />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,360px)_1fr]">
        <ComponentCard title={t("workflow.queueControle")}>
          {loading ? <TableLoader message={t("common.loading")} /> : null}
          {!loading && queue.length === 0 ? (
            <GuidedEmptyState
              icon={ClipboardList}
              title={t("ux.workflowEmptyTitle")}
              message={t("ux.workflowEmptyControle")}
            >
              <Link to="/documents/generation">
                <Button size="sm" variant="outline">{t("nav.generation")}</Button>
              </Link>
            </GuidedEmptyState>
          ) : null}
          <ul className="space-y-2">
            {queuePagination.paginatedItems.map((item) => (
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
            page={queuePagination.page}
            totalPages={queuePagination.totalPages}
            totalItems={queuePagination.totalItems}
            rangeStart={queuePagination.rangeStart}
            rangeEnd={queuePagination.rangeEnd}
            onPageChange={queuePagination.setPage}
          />
        </ComponentCard>
        <ComponentCard title={t("workflow.packageDetail")}>
          {!selected ? (
            <GuidedEmptyState
              icon={ClipboardList}
              title={t("ux.workflowSelectTitle")}
              message={t("ux.workflowSelectDesc")}
            />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selected.project_number} — {selected.event_title}
              </p>
              <WorkflowStatusStepper status={selected.workflow_status} />
              <Badge color={workflowStatusBadgeColor(selected.workflow_status)}>
                {workflowStatusLabel(selected.workflow_status, t)}
              </Badge>
              <WorkflowPhaseDeadline
                phaseDueAt={selected.phase_due_at}
                isOverdue={selected.is_overdue}
              />

              {selected.workflow_status === "submitted" ? (
                <div className="space-y-2">
                  <Select
                    options={[{ value: "", label: t("workflow.assignSelf") }, ...reviewerOptions]}
                    defaultValue={assigneeId}
                    onChange={(v) => setAssigneeId(v)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        void handleAssign(
                          selected.job_id,
                          assigneeId ? Number(assigneeId) : undefined,
                        )
                      }
                    >
                      {t("workflow.assignAndTake")}
                    </Button>
                  </div>
                </div>
              ) : null}

              {["under_procedure_review", "submitted"].includes(selected.workflow_status) ? (
                <div className="space-y-3">
                  <WorkflowFileReviewProgress files={selected.files} />
                  <div>
                    <p className="mb-2 text-xs font-medium text-gray-500">{t("workflow.assignValidator")}</p>
                    <Select
                      options={[
                        { value: "", label: t("workflow.selectValidatorPlaceholder") },
                        ...validatorOptions,
                      ]}
                      value={validatorId}
                      onChange={setValidatorId}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => void handleReject()}>
                      {t("workflow.rejectPackage")}
                    </Button>
                    <Button
                      size="sm"
                      disabled={!fileReview.allApproved || !validatorId}
                      onClick={() => void handleComplete()}
                    >
                      {t("workflow.finishControle")}
                    </Button>
                  </div>
                </div>
              ) : null}

              <WorkflowFileReviewList
                jobId={selected.job_id}
                files={selected.files}
                canReview={canReviewFiles}
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
