import type { WorkflowStep } from "../../api/workflow";
import type { GenerationJob } from "./types";
import { getLatestCompletedJob } from "./eventPackageLock";

/** Dernier commentaire central de rejet (contrôle ou validateur). */
export function getCentralRejectComment(history: WorkflowStep[]): string | null {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const step = history[i];
    if (
      step.action === "reject"
      && (step.step === "procedure_rejected" || step.step === "validator_rejected")
      && step.comment?.trim()
    ) {
      return step.comment.trim();
    }
  }
  return null;
}

const REMARKS_WORKFLOW = new Set([
  "submitted",
  "under_procedure_review",
  "procedure_rejected",
  "under_final_validation",
  "validator_rejected",
  "procedure_approved",
  "approved",
]);

/** Job dont afficher les remarques par fichier. */
export function getRemarksJob(history: GenerationJob[]): GenerationJob | null {
  const latest = getLatestCompletedJob(history);
  if (!latest) return null;
  const wf = latest.workflow_status ?? "generated";
  if (!REMARKS_WORKFLOW.has(wf)) return null;
  return latest;
}
