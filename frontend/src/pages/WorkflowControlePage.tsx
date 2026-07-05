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

export default function WorkflowControlePage() {
  const { getToken } = useAuth();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const legacyJobId = searchParams.get("job");
  const [queue, setQueue] = useState<WorkflowQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialScope = searchParams.get("scope") === "history" ? "history" : "pending";
  const [queueScope, setQueueScope] = useState<"pending" | "history">(initialScope);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getApiToken(getToken);
      setQueue(await fetchWorkflowQueue(token, "controle", 50, queueScope));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.error"));
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, [getToken, queueScope, t]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    setQueueScope(searchParams.get("scope") === "history" ? "history" : "pending");
  }, [searchParams]);

  const queuePagination = usePagination(queue, WORKFLOW_QUEUE_PAGE_SIZE, `controle-${queueScope}-${queue.length}`);

  if (legacyJobId) {
    return <Navigate to={`/workflow/controle/${legacyJobId}`} replace />;
  }

  return (
    <>
      <PageMeta title={t("nav.workflowControle")} description={t("workflow.controleDesc")} />
      <AdminBreadcrumb pageTitle={t("nav.workflowControle")} />

      <ComponentCard className="mb-6" desc={t("workflow.controleDesc")}>
        <WorkflowProcessGuide role="controle" />
      </ComponentCard>

      {error ? (
        <div className="mb-6">
          <HelpTipAlert variant="error" title={t("common.error")} message={error} />
        </div>
      ) : null}

      <ComponentCard title={t("workflow.queueControle")}>
        <div className="mb-5 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={queueScope === "pending" ? "primary" : "outline"}
            onClick={() => setQueueScope("pending")}
          >
            {t("workflow.queuePending")}
          </Button>
          <Button
            size="sm"
            variant={queueScope === "history" ? "primary" : "outline"}
            onClick={() => setQueueScope("history")}
          >
            {t("workflow.queueHistory")}
          </Button>
        </div>
        <WorkflowQueueList
          items={queue}
          loading={loading}
          emptyTitle={t("ux.workflowEmptyTitle")}
          emptyMessage={
            queueScope === "history" ? t("workflow.historyEmpty") : t("ux.workflowEmptyControle")
          }
          emptyAction={
            queueScope === "pending" ? (
              <Link to="/documents/generation">
                <Button size="sm" variant="outline">
                  {t("nav.generation")}
                </Button>
              </Link>
            ) : undefined
          }
          basePath="/workflow/controle"
          pagination={queuePagination}
          t={t}
        />
      </ComponentCard>
    </>
  );
}
