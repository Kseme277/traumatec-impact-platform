import type { GenerationJob, WorkflowStatus } from "./types";

const WORKFLOW_IN_REVIEW: WorkflowStatus[] = [
  "submitted",
  "under_procedure_review",
  "under_final_validation",
];

const WORKFLOW_REJECTED: WorkflowStatus[] = ["procedure_rejected", "validator_rejected"];

export function getLatestCompletedJob(history: GenerationJob[]): GenerationJob | null {
  const completed = history.filter((job) => job.status === "completed");
  if (completed.length === 0) return null;
  return completed.reduce((latest, job) => {
    const latestTs = latest.completed_at ?? latest.created_at ?? "";
    const jobTs = job.completed_at ?? job.created_at ?? "";
    return jobTs > latestTs ? job : latest;
  });
}

export function latestWorkflowStatus(history: GenerationJob[]): WorkflowStatus | null {
  const latest = getLatestCompletedJob(history);
  if (!latest) return null;
  return (latest.workflow_status ?? "generated") as WorkflowStatus;
}

/** Paquet validé (workflow approved) — interdit une nouvelle génération. */
export function isEventGenerationLocked(history: GenerationJob[]): boolean {
  const wf = latestWorkflowStatus(history);
  return wf === "approved";
}

export function isWorkflowInReview(wf: WorkflowStatus | null | undefined): boolean {
  return Boolean(wf && WORKFLOW_IN_REVIEW.includes(wf));
}

export function isWorkflowRejected(wf: WorkflowStatus | null | undefined): boolean {
  return Boolean(wf && WORKFLOW_REJECTED.includes(wf));
}

/** Nouvelle génération ZIP autorisée (premier paquet, remplacement ou regénération après rejet). */
export function canStartPackageGeneration(history: GenerationJob[]): boolean {
  const latest = getLatestCompletedJob(history);
  if (!latest) return true;
  const wf = (latest.workflow_status ?? "generated") as WorkflowStatus;
  if (wf === "approved") return false;
  if (isWorkflowInReview(wf)) return false;
  if (isWorkflowRejected(wf)) return true;
  return wf === "generated";
}

export function hasCompletedPackage(history: GenerationJob[]): boolean {
  return getLatestCompletedJob(history) !== null;
}

/** Dernier job terminé avec workflow approuvé (paquet validé téléchargeable). */
export function getApprovedGenerationJob(history: GenerationJob[]): GenerationJob | null {
  const approved = history.filter(
    (job) => job.status === "completed" && job.workflow_status === "approved",
  );
  if (approved.length === 0) return null;
  return approved.reduce((latest, job) => {
    const latestTs = latest.completed_at ?? latest.created_at ?? "";
    const jobTs = job.completed_at ?? job.created_at ?? "";
    return jobTs > latestTs ? job : latest;
  });
}

export function canSubmitPackageWorkflow(job: GenerationJob | null | undefined): boolean {
  if (!job || job.status !== "completed") return false;
  const wf = (job.workflow_status ?? "generated") as WorkflowStatus;
  return wf === "generated" || isWorkflowRejected(wf);
}

/** Correction fichier par fichier (ONLYOFFICE) après rejet contrôle ou validation. */
export function canEditPackageFiles(job: GenerationJob | null | undefined): boolean {
  if (!job || job.status !== "completed") return false;
  return isWorkflowRejected((job.workflow_status ?? "generated") as WorkflowStatus);
}
