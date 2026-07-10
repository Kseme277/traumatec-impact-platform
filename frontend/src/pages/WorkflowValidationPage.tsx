import { Link, Navigate, useSearchParams } from "react-router";
import PageMeta from "../components/common/PageMeta";
import AdminBreadcrumb from "../components/common/AdminBreadcrumb";
import ComponentCard from "../components/common/ComponentCard";
import HelpTipAlert from "../components/common/HelpTipAlert";
import Button from "../components/ui/button/Button";
import WorkflowProcessGuide from "../features/workflow/WorkflowProcessGuide";
import WorkflowQueueList from "../features/workflow/WorkflowQueueList";
import { fetchWorkflowQueue } from "../api/workflow";
import { ApiError } from "../api/client";
import { usePagination } from "../hooks/usePagination";
import { useTranslation } from "../i18n/useTranslation";
import { useTipSWR } from "../lib/swr";

const WORKFLOW_QUEUE_PAGE_SIZE = 8;

export default function WorkflowValidationPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const legacyJobId = searchParams.get("job");

  const { data, isLoading, error } = useTipSWR(
    ["workflow-queue", "validateur"] as const,
    async (token) => {
      const [pending, delivery] = await Promise.all([
        fetchWorkflowQueue(token, "validateur", 50, "pending"),
        fetchWorkflowQueue(token, "validateur", 50, "delivery"),
      ]);
      return { pending, delivery };
    },
  );

  const queue = data?.pending ?? [];
  const deliveryQueue = data?.delivery ?? [];
  const loading = isLoading && !data;
  const errorMessage = error
    ? error instanceof ApiError
      ? error.message
      : t("common.error")
    : null;

  const pendingPagination = usePagination(queue, WORKFLOW_QUEUE_PAGE_SIZE, `pending-${queue.length}`);
  const deliveryPagination = usePagination(
    deliveryQueue,
    WORKFLOW_QUEUE_PAGE_SIZE,
    `delivery-${deliveryQueue.length}`,
  );

  if (legacyJobId) {
    return <Navigate to={`/workflow/validation/${legacyJobId}`} replace />;
  }

  return (
    <>
      <PageMeta title={t("nav.workflowValidation")} description={t("workflow.validationDesc")} />
      <AdminBreadcrumb pageTitle={t("nav.workflowValidation")} />

      <ComponentCard className="mb-6" desc={t("workflow.validationDesc")}>
        <WorkflowProcessGuide role="validateur" />
      </ComponentCard>

      {errorMessage ? (
        <div className="mb-6">
          <HelpTipAlert variant="error" title={t("common.error")} message={errorMessage} />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <ComponentCard title={t("workflow.queueValidation")}>
          <WorkflowQueueList
            items={queue}
            loading={loading}
            emptyTitle={t("ux.workflowEmptyTitle")}
            emptyMessage={t("workflow.queueValidationEmpty")}
            emptyAction={
              <Link to="/workflow/controle">
                <Button size="sm" variant="outline">
                  {t("nav.workflowControle")}
                </Button>
              </Link>
            }
            basePath="/workflow/validation"
            pagination={pendingPagination}
            t={t}
          />
        </ComponentCard>

        <ComponentCard title={t("workflow.queueDelivery")}>
          <WorkflowQueueList
            items={deliveryQueue}
            loading={loading}
            emptyTitle={t("ux.workflowEmptyTitle")}
            emptyMessage={t("workflow.queueDeliveryEmpty")}
            basePath="/workflow/validation"
            pagination={deliveryPagination}
            t={t}
          />
        </ComponentCard>
      </div>
    </>
  );
}
