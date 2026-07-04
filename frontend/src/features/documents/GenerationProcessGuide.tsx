import { useMemo } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import ProcessGuideSteps, { type ProcessGuideStep } from "../../components/common/ProcessGuideSteps";
import type { WorkflowStatus } from "./types";
import { isWorkflowInReview, isWorkflowRejected } from "./eventPackageLock";

interface GenerationProcessGuideProps {
  hasEvent: boolean;
  eventReady: boolean;
  hasCompletedJob: boolean;
  workflowStatus: WorkflowStatus | null;
}

export default function GenerationProcessGuide({
  hasEvent,
  eventReady,
  hasCompletedJob,
  workflowStatus,
}: GenerationProcessGuideProps) {
  const { t } = useTranslation();

  const steps = useMemo<ProcessGuideStep[]>(() => {
    const pick = (done: boolean, current: boolean): ProcessGuideStep["status"] => {
      if (done) return "done";
      if (current) return "current";
      return "upcoming";
    };

    const wf = workflowStatus;
    const rejected = isWorkflowRejected(wf);
    const inReview = isWorkflowInReview(wf);
    const approved = wf === "approved";
    const generated = !wf || wf === "generated";
    const submitDone = Boolean(wf && !generated && !rejected);
    const generateDone = hasCompletedJob || approved || inReview || rejected;

    const submitHint = rejected
      ? t("ux.generation.stepSubmitRejectedHint")
      : inReview
        ? t("ux.generation.stepSubmitInReviewHint")
        : approved
          ? t("ux.generation.stepSubmitApprovedHint")
          : t("ux.generation.stepSubmitHint");

    const generateHint = rejected
      ? t("ux.generation.stepGenerateRejectedHint")
      : inReview
        ? t("ux.generation.stepGenerateLockedHint")
        : approved
          ? t("ux.generation.stepGenerateApprovedHint")
          : t("ux.generation.stepGenerateHint");

    return [
      {
        id: "pick",
        label: t("ux.generation.stepPick"),
        hint: t("ux.generation.stepPickHint"),
        status: pick(hasEvent, !hasEvent),
      },
      {
        id: "complete",
        label: t("ux.generation.stepComplete"),
        hint: t("ux.generation.stepCompleteHint"),
        status: pick(hasEvent && eventReady, hasEvent && !eventReady),
      },
      {
        id: "generate",
        label: t("ux.generation.stepGenerate"),
        hint: generateHint,
        status: pick(generateDone, hasEvent && eventReady && !generateDone),
      },
      {
        id: "submit",
        label: rejected ? t("ux.generation.stepResubmit") : t("ux.generation.stepSubmit"),
        hint: submitHint,
        status: pick(submitDone || approved, hasCompletedJob && !submitDone && !approved && !inReview),
      },
    ];
  }, [eventReady, hasCompletedJob, hasEvent, t, workflowStatus]);

  return <ProcessGuideSteps steps={steps} />;
}
