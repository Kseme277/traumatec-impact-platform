import { useAuth } from "@clerk/clerk-react";
import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router";
import PageMeta from "../components/common/PageMeta";
import AdminBreadcrumb from "../components/common/AdminBreadcrumb";
import ComponentCard from "../components/common/ComponentCard";
import HelpTipAlert from "../components/common/HelpTipAlert";
import Button from "../components/ui/button/Button";
import WorkflowProcessGuide from "../features/workflow/WorkflowProcessGuide";
import WorkflowQueueList from "../features/workflow/WorkflowQueueList";
import { fetchWorkflowQueue } from "../api/workflow";
import { getApiToken } from "../lib/clerkToken";
import type { WorkflowQueueItem } from "../api/workflow";
import { ApiError } from "../api/client";
import { usePagination } from "../hooks/usePagination";
import { useTranslation } from "../i18n/useTranslation";

const WORKFLOW_QUEUE_PAGE_SIZE = 8;

export default function WorkflowValidationPage() {
  const { getToken } = useAuth();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const legacyJobId = searchParams.get("job");
  const [queue, setQueue] = useState<WorkflowQueueItem[]>([]);
  const [deliveryQueue, setDeliveryQueue] = useState<WorkflowQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getApiToken(getToken);
      const [pending, delivery] = await Promise.all([
        fetchWorkflowQueue(token, "validateur", 50, "pending"),
        fetchWorkflowQueue(token, "validateur", 50, "delivery"),
      ]);
      setQueue(pending);
      setDeliveryQueue(delivery);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.error"));
      setQueue([]);
      setDeliveryQueue([]);
    } finally {
      setLoading(false);
    }
  }, [getToken, t]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

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

      {error ? (
        <div className="mb-6">
          <HelpTipAlert variant="error" title={t("common.error")} message={error} />
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
