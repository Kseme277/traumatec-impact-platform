import { useMemo } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import ProcessGuideSteps, { type ProcessGuideStep } from "../../components/common/ProcessGuideSteps";

interface GenerationProcessGuideProps {
  hasEvent: boolean;
  eventReady: boolean;
  hasGeneratedJob: boolean;
  submitted: boolean;
}

export default function GenerationProcessGuide({
  hasEvent,
  eventReady,
  hasGeneratedJob,
  submitted,
}: GenerationProcessGuideProps) {
  const { t } = useTranslation();

  const steps = useMemo<ProcessGuideStep[]>(() => {
    const pick = (done: boolean, current: boolean): ProcessGuideStep["status"] => {
      if (done) return "done";
      if (current) return "current";
      return "upcoming";
    };

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
        hint: t("ux.generation.stepGenerateHint"),
        status: pick(hasGeneratedJob, hasEvent && eventReady && !hasGeneratedJob),
      },
      {
        id: "submit",
        label: t("ux.generation.stepSubmit"),
        hint: t("ux.generation.stepSubmitHint"),
        status: pick(submitted, hasGeneratedJob && !submitted),
      },
    ];
  }, [eventReady, hasEvent, hasGeneratedJob, submitted, t]);

  return <ProcessGuideSteps steps={steps} />;
}
