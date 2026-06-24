import type { WorkflowStatus } from "./types";

type BadgeTone = "success" | "warning" | "error" | "info" | "light" | "primary";

export const WORKFLOW_PIPELINE: WorkflowStatus[] = [
  "generated",
  "submitted",
  "under_procedure_review",
  "procedure_approved",
  "under_final_validation",
  "approved",
];

export function workflowStatusBadgeColor(status: WorkflowStatus): BadgeTone {
  switch (status) {
    case "approved":
    case "procedure_approved":
      return "success";
    case "procedure_rejected":
    case "validator_rejected":
      return "error";
    case "under_procedure_review":
    case "under_final_validation":
      return "warning";
    case "submitted":
      return "info";
    default:
      return "light";
  }
}

export function workflowPipelineIndex(status: WorkflowStatus): number {
  if (status === "procedure_rejected") return 2;
  if (status === "validator_rejected") return 4;
  const index = WORKFLOW_PIPELINE.indexOf(status);
  return index >= 0 ? index : 0;
}

export function workflowQueueLink(status: WorkflowStatus): string | null {
  switch (status) {
    case "submitted":
    case "under_procedure_review":
    case "procedure_rejected":
    case "procedure_approved":
      return "/workflow/controle";
    case "under_final_validation":
    case "validator_rejected":
    case "approved":
      return "/workflow/validation";
    default:
      return null;
  }
}
