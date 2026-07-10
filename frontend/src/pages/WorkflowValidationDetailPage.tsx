import { useAuth } from "@clerk/clerk-react";
import { Link, Navigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import PageMeta from "../components/common/PageMeta";
import AdminBreadcrumb from "../components/common/AdminBreadcrumb";
import SpinnerLoader from "../components/common/SpinnerLoader";
import Button from "../components/ui/button/Button";
import WorkflowValidationDetailPanel from "../features/workflow/WorkflowValidationDetailPanel";
import {
  approveValidator,
  fetchDeliveryMailto,
  fetchWorkflowState,
  rejectValidator,
} from "../api/workflow";
import { getApiToken } from "../lib/clerkToken";
import type { WorkflowState } from "../api/workflow";
import { ApiError } from "../api/client";
import { confirmAction, promptComment, showError, showSuccess } from "../lib/swal";
import { useTranslation } from "../i18n/useTranslation";
import { formatWorkflowPackageTitle } from "../features/workflow/workflowPackageTitle";
import { revalidateTipKeys, useTipSWR } from "../lib/swr";

export default function WorkflowValidationDetailPage() {
  const { jobId } = useParams();
  const { getToken } = useAuth();
  const { t } = useTranslation();

  const { data: state, isLoading, error, mutate } = useTipSWR(
    jobId ? (["workflow-state", jobId, "validation"] as const) : null,
    (token) => fetchWorkflowState(token, jobId!),
    {
      onError: async (err) => {
        if (err instanceof ApiError && err.status === 404) return;
        await showError(t("common.error"), err instanceof ApiError ? err.message : t("common.error"));
      },
    },
  );

  const loading = isLoading && !state;
  const notFound = Boolean(error instanceof ApiError && error.status === 404);

  const patchState = (next: WorkflowState) => {
    void mutate(next, { revalidate: false });
  };

  if (!jobId) {
    return <Navigate to="/workflow/validation" replace />;
  }

  if (loading) {
    return <SpinnerLoader message={t("common.loading")} className="min-h-[50vh]" />;
  }

  if (notFound || !state) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-gray-500">{t("workflow.packageNotFound")}</p>
        <Link to="/workflow/validation" className="mt-4 inline-block text-sm text-brand-500 hover:underline">
          {t("workflow.backToQueue")}
        </Link>
      </div>
    );
  }

  async function handleApprove() {
    const confirmed = await confirmAction({
      title: t("confirm.approvePackageTitle"),
      confirmText: t("confirm.proceed"),
      cancelText: t("common.cancel"),
    });
    if (!confirmed.isConfirmed) return;
    try {
      const token = await getApiToken(getToken);
      const next = await approveValidator(token, jobId!);
      patchState(next);
      await revalidateTipKeys("workflow-queue", "workflow-stats");
      showSuccess(t("workflow.packageApproved"));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : t("common.error"));
    }
  }

  async function handleReject() {
    const prompt = await promptComment({
      title: t("confirm.rejectPackageTitle"),
      text: t("confirm.rejectPackageText"),
      placeholder: t("confirm.rejectReasonPlaceholder"),
      confirmText: t("confirm.proceed"),
      cancelText: t("common.cancel"),
    });
    if (!prompt.isConfirmed || !prompt.value) return;
    try {
      const token = await getApiToken(getToken);
      const next = await rejectValidator(token, jobId!, prompt.value);
      patchState(next);
      await revalidateTipKeys("workflow-queue", "workflow-stats");
      showSuccess(t("workflow.packageRejected"));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : t("common.error"));
    }
  }

  async function handleMailto() {
    const confirmed = await confirmAction({
      title: t("confirm.sendMailtoTitle"),
      text: t("confirm.sendMailtoText"),
      confirmText: t("confirm.proceed"),
      cancelText: t("common.cancel"),
    });
    if (!confirmed.isConfirmed) return;
    try {
      const token = await getApiToken(getToken);
      const { mailto_url } = await fetchDeliveryMailto(token, jobId!);
      window.location.href = mailto_url;
    } catch (err) {
      showError(
        t("workflow.mailtoErrorTitle"),
        err instanceof ApiError ? err.message : t("common.error"),
      );
    }
  }

  const packageTitle = formatWorkflowPackageTitle(state.project_number, state.event_title);

  return (
    <>
      <PageMeta
        title={`${packageTitle || t("nav.workflowValidation")} | TIP`}
        description={t("workflow.validationDesc")}
      />
      <AdminBreadcrumb
        pageTitle={packageTitle || t("workflow.packageDetail")}
        crumbs={[{ label: t("nav.workflowValidation"), to: "/workflow/validation" }]}
      />

      <div className="mb-6">
        <Link to="/workflow/validation">
          <Button size="sm" variant="outline" startIcon={<ArrowLeft className="size-4" />}>
            {t("workflow.backToQueue")}
          </Button>
        </Link>
      </div>

      <WorkflowValidationDetailPanel
        state={state}
        onApprove={() => void handleApprove()}
        onReject={() => void handleReject()}
        onMailto={() => void handleMailto()}
        onUpdated={patchState}
        t={t}
      />
    </>
  );
}
