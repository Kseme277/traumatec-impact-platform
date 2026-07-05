import ComponentCard from "../../components/common/ComponentCard";
import HelpTipAlert from "../../components/common/HelpTipAlert";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";
import Select from "../../components/form/Select";
import WorkflowFileReviewList from "./WorkflowFileReviewList";
import WorkflowHistoryPanel from "./WorkflowHistoryPanel";
import WorkflowPhaseDeadline from "./WorkflowPhaseDeadline";
import WorkflowFileReviewProgress, { useFileReviewSummary } from "./WorkflowFileReviewProgress";
import WorkflowStatusStepper from "../documents/WorkflowStatusStepper";
import { workflowStatusLabel } from "../auth/types";
import { workflowStatusBadgeColor } from "../documents/workflowStatusVisual";
import type { Utilisateur } from "../auth/types";
import { formatWorkflowPackageTitle } from "./workflowPackageTitle";
import type { WorkflowState } from "../../api/workflow";

interface WorkflowControleDetailPanelProps {
  state: WorkflowState;
  reviewers: Utilisateur[];
  validators: Utilisateur[];
  assigneeId: string;
  validatorId: string;
  onAssigneeChange: (value: string) => void;
  onValidatorChange: (value: string) => void;
  onAssign: () => void;
  onComplete: () => void;
  onReject: () => void;
  onUpdated: (state: WorkflowState) => void;
  t: (key: string) => string;
}

export default function WorkflowControleDetailPanel({
  state,
  reviewers,
  validators,
  assigneeId,
  validatorId,
  onAssigneeChange,
  onValidatorChange,
  onAssign,
  onComplete,
  onReject,
  onUpdated,
  t,
}: WorkflowControleDetailPanelProps) {
  const reviewerOptions = reviewers.map((u) => ({
    value: String(u.id),
    label: `${u.prenom} ${u.nom}`,
  }));

  const validatorOptions = validators.map((u) => ({
    value: String(u.id),
    label: `${u.prenom} ${u.nom}`,
  }));

  const canReviewFiles = ["under_procedure_review", "submitted"].includes(state.workflow_status);
  const fileReview = useFileReviewSummary(state.files);
  const inReview = canReviewFiles;
  const packageTitle = formatWorkflowPackageTitle(state.project_number, state.event_title);

  return (
    <div className="space-y-6">
      <ComponentCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p
              className="text-lg font-semibold text-gray-800 dark:text-white/90"
              title={packageTitle}
            >
              {packageTitle}
            </p>
          </div>
          <Badge color={workflowStatusBadgeColor(state.workflow_status)}>
            {workflowStatusLabel(state.workflow_status, t)}
          </Badge>
        </div>
        <div className="mt-5 space-y-4">
          <WorkflowStatusStepper status={state.workflow_status} />
          <WorkflowPhaseDeadline phaseDueAt={state.phase_due_at} isOverdue={state.is_overdue} />
        </div>
      </ComponentCard>

      {state.workflow_status === "submitted" ? (
        <ComponentCard title={t("workflow.assignReviewer")} desc={t("workflow.selectReviewer")}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-[220px] flex-1">
              <Select
                options={[{ value: "", label: t("workflow.assignSelf") }, ...reviewerOptions]}
                value={assigneeId}
                onChange={onAssigneeChange}
              />
            </div>
            <Button size="sm" onClick={onAssign}>
              {t("workflow.assignAndTake")}
            </Button>
          </div>
        </ComponentCard>
      ) : null}

      {inReview ? (
        <ComponentCard title={t("workflow.finishControle")}>
          <WorkflowFileReviewProgress files={state.files} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">{t("workflow.assignValidator")}</p>
              <Select
                options={[
                  { value: "", label: t("workflow.selectValidatorPlaceholder") },
                  ...validatorOptions,
                ]}
                value={validatorId}
                onChange={onValidatorChange}
              />
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Button size="sm" variant="outline" onClick={onReject}>
                {t("workflow.rejectPackage")}
              </Button>
              <Button size="sm" disabled={!fileReview.allApproved || !validatorId} onClick={onComplete}>
                {t("workflow.finishControle")}
              </Button>
            </div>
          </div>
        </ComponentCard>
      ) : null}

      <ComponentCard title={t("workflow.filesTitle")} desc={t("workflow.selectFileHint")}>
        {inReview ? (
          <div className="mb-4">
            <HelpTipAlert
              variant="info"
              title={t("workflow.filesTitle")}
              message={t("workflow.controleReviewHint")}
            />
          </div>
        ) : null}
        <WorkflowFileReviewList
          jobId={state.job_id}
          files={state.files}
          canReview={canReviewFiles}
          onUpdated={onUpdated}
        />
      </ComponentCard>

      <WorkflowHistoryPanel history={state.history} />
    </div>
  );
}
