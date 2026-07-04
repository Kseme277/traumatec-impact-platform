import type { WorkflowStep } from "../../api/workflow";
import type { GenerationJob } from "./types";

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

/** Job dont afficher les remarques (rejet ou brouillon avant soumission). */
export function getRemarksJob(history: GenerationJob[]): GenerationJob | null {
  const completed = history.filter((job) => job.status === "completed");
  if (completed.length === 0) return null;

  const actionable = completed.filter((job) => {
    const wf = job.workflow_status ?? "generated";
    return wf === "procedure_rejected" || wf === "validator_rejected" || wf === "generated";
  });

  const pool = actionable.length > 0 ? actionable : completed;
  return pool.reduce((latest, job) => {
    const latestTs = latest.completed_at ?? latest.created_at ?? "";
    const jobTs = job.completed_at ?? job.created_at ?? "";
    return jobTs > latestTs ? job : latest;
  });
}
