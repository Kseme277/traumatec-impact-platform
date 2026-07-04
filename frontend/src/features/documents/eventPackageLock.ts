import type { GenerationJob, WorkflowStatus } from "./types";

export function getLatestCompletedJob(history: GenerationJob[]): GenerationJob | null {
  return history.find((job) => job.status === "completed") ?? null;
}

/** Paquet validé (workflow approved) — interdit une nouvelle génération. */
export function isEventGenerationLocked(history: GenerationJob[]): boolean {
  const latest = getLatestCompletedJob(history);
  if (!latest) return false;
  return (latest.workflow_status ?? "generated") === "approved";
}

export function hasCompletedPackage(history: GenerationJob[]): boolean {
  return getLatestCompletedJob(history) !== null;
}

export function latestWorkflowStatus(history: GenerationJob[]): WorkflowStatus | null {
  const latest = getLatestCompletedJob(history);
  if (!latest) return null;
  return (latest.workflow_status ?? "generated") as WorkflowStatus;
}
