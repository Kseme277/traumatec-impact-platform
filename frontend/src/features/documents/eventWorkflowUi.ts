import type { Evenement } from "../events/types";

export function isEventPackageApproved(event: Pick<Evenement, "latest_package_workflow">): boolean {
  return event.latest_package_workflow === "approved";
}

export function isEventPackageRejected(event: Pick<Evenement, "latest_package_workflow">): boolean {
  return (
    event.latest_package_workflow === "procedure_rejected" ||
    event.latest_package_workflow === "validator_rejected"
  );
}

export function hasGeneratedPackage(event: Pick<Evenement, "latest_package_workflow">): boolean {
  return Boolean(event.latest_package_workflow);
}

export function eventSelectLabelSuffix(
  event: Pick<Evenement, "latest_package_workflow">,
  validatedLabel: string,
): string {
  return isEventPackageApproved(event) ? ` — ${validatedLabel}` : "";
}
