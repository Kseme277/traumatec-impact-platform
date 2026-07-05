import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";
import WorkflowFileReviewList from "./WorkflowFileReviewList";
import WorkflowHistoryPanel from "./WorkflowHistoryPanel";
import WorkflowPhaseDeadline from "./WorkflowPhaseDeadline";
import WorkflowFileReviewProgress, { useFileReviewSummary } from "./WorkflowFileReviewProgress";
import WorkflowStatusStepper from "../documents/WorkflowStatusStepper";
import { workflowStatusLabel } from "../auth/types";
import { workflowStatusBadgeColor } from "../documents/workflowStatusVisual";
import type { WorkflowState } from "../../api/workflow";

interface WorkflowValidationDetailPanelProps {
  state: WorkflowState;
  onApprove: () => void;
  onReject: () => void;
  onMailto: () => void;
  onUpdated: (state: WorkflowState) => void;
  t: (key: string) => string;
}

export default function WorkflowValidationDetailPanel({
  state,
  onApprove,
  onReject,
  onMailto,
  onUpdated,
  t,
}: WorkflowValidationDetailPanelProps) {
  const canReviewFiles = state.workflow_status === "under_final_validation";
  const fileReview = useFileReviewSummary(state.files);

  return (
    <div className="space-y-6">
      <ComponentCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {state.project_number}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{state.event_title}</p>
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

      {state.workflow_status === "under_final_validation" ? (
        <ComponentCard title={t("workflow.approvePackage")}>
          <WorkflowFileReviewProgress files={state.files} />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" disabled={!fileReview.allApproved} onClick={onApprove}>
              {t("workflow.approvePackage")}
            </Button>
            <Button size="sm" variant="outline" onClick={onReject}>
              {t("workflow.rejectPackage")}
            </Button>
          </div>
        </ComponentCard>
      ) : null}

      {state.workflow_status === "approved" ? (
        <ComponentCard title={t("workflow.sendNational")}>
          <Button size="sm" onClick={onMailto}>
            {t("workflow.sendNational")}
          </Button>
        </ComponentCard>
      ) : null}

      <ComponentCard title={t("workflow.filesTitle")} desc={t("workflow.selectFileHint")}>
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
