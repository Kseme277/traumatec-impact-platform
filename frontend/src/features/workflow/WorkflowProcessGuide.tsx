import { useMemo } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import ProcessGuideSteps, { type ProcessGuideStep } from "../../components/common/ProcessGuideSteps";

type WorkflowGuideRole = "controle" | "validateur";

interface WorkflowProcessGuideProps {
  role: WorkflowGuideRole;
}

export default function WorkflowProcessGuide({ role }: WorkflowProcessGuideProps) {
  const { t } = useTranslation();

  const steps = useMemo<ProcessGuideStep[]>(() => {
    if (role === "validateur") {
      return [
        {
          id: "pick",
          label: t("ux.workflow.stepPick"),
          hint: t("ux.workflow.stepPickHint"),
          status: "current",
        },
        {
          id: "review",
          label: t("ux.workflow.stepReviewFiles"),
          hint: t("ux.workflow.stepReviewFilesHint"),
          status: "upcoming",
        },
        {
          id: "approve",
          label: t("ux.workflow.stepApprove"),
          hint: t("ux.workflow.stepApproveHint"),
          status: "upcoming",
        },
        {
          id: "deliver",
          label: t("ux.workflow.stepDeliver"),
          hint: t("ux.workflow.stepDeliverHint"),
          status: "upcoming",
        },
      ];
    }

    return [
      {
        id: "pick",
        label: t("ux.workflow.stepPick"),
        hint: t("ux.workflow.stepPickHint"),
        status: "current",
      },
      {
        id: "review",
        label: t("ux.workflow.stepReviewFiles"),
        hint: t("ux.workflow.stepReviewFilesHint"),
        status: "upcoming",
      },
      {
        id: "finish",
        label: t("ux.workflow.stepFinishControle"),
        hint: t("ux.workflow.stepFinishControleHint"),
        status: "upcoming",
      },
      {
        id: "forward",
        label: t("ux.workflow.stepForward"),
        hint: t("ux.workflow.stepForwardHint"),
        status: "upcoming",
      },
    ];
  }, [role, t]);

  return <ProcessGuideSteps steps={steps} />;
}
