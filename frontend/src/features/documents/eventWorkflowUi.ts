import type { Evenement } from "../events/types";

export function isEventPackageApproved(event: Pick<Evenement, "latest_package_workflow">): boolean {
  return event.latest_package_workflow === "approved";
}

export function eventSelectLabelSuffix(
  event: Pick<Evenement, "latest_package_workflow">,
  validatedLabel: string,
): string {
  return isEventPackageApproved(event) ? ` — ${validatedLabel}` : "";
}
