import { useAuth } from "@clerk/clerk-react";
import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import PageMeta from "../components/common/PageMeta";
import AdminBreadcrumb from "../components/common/AdminBreadcrumb";
import AuthLoadingScreen from "../components/auth/AuthLoadingScreen";
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

export default function WorkflowValidationDetailPage() {
  const { jobId } = useParams();
  const { getToken } = useAuth();
  const { t } = useTranslation();
  const [state, setState] = useState<WorkflowState | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setNotFound(false);
    try {
      const token = await getApiToken(getToken);
      setState(await fetchWorkflowState(token, jobId));
    } catch (err) {
      setState(null);
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        await showError(t("common.error"), err instanceof ApiError ? err.message : t("common.error"));
      }
    } finally {
      setLoading(false);
    }
  }, [getToken, jobId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!jobId) {
    return <Navigate to="/workflow/validation" replace />;
  }

  if (loading) {
    return <AuthLoadingScreen message={t("common.loading")} />;
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
      setState(await approveValidator(token, jobId!));
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
      setState(await rejectValidator(token, jobId!, prompt.value));
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
        onUpdated={setState}
        t={t}
      />
    </>
  );
}
