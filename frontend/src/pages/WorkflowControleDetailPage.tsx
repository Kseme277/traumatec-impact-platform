import { useAuth } from "@clerk/clerk-react";
import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import PageMeta from "../components/common/PageMeta";
import AdminBreadcrumb from "../components/common/AdminBreadcrumb";
import SpinnerLoader from "../components/common/SpinnerLoader";
import Button from "../components/ui/button/Button";
import WorkflowControleDetailPanel from "../features/workflow/WorkflowControleDetailPanel";
import {
  assignReviewer,
  completeProcedure,
  fetchUsersByRole,
  fetchWorkflowState,
  rejectProcedure,
} from "../api/workflow";
import { getApiToken } from "../lib/clerkToken";
import type { Utilisateur } from "../features/auth/types";
import type { WorkflowState } from "../api/workflow";
import { ApiError } from "../api/client";
import { confirmAction, promptComment, showError, showSuccess } from "../lib/swal";
import { useTranslation } from "../i18n/useTranslation";
import { formatWorkflowPackageTitle } from "../features/workflow/workflowPackageTitle";

export default function WorkflowControleDetailPage() {
  const { jobId } = useParams();
  const { getToken } = useAuth();
  const { t } = useTranslation();
  const [state, setState] = useState<WorkflowState | null>(null);
  const [reviewers, setReviewers] = useState<Utilisateur[]>([]);
  const [validators, setValidators] = useState<Utilisateur[]>([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [validatorId, setValidatorId] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setNotFound(false);
    try {
      const token = await getApiToken(getToken);
      const [jobState, users, validatorUsers] = await Promise.all([
        fetchWorkflowState(token, jobId),
        fetchUsersByRole(token, "controle_procedure"),
        fetchUsersByRole(token, "validateur"),
      ]);
      setState(jobState);
      setReviewers(users);
      setValidators(validatorUsers);
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
    return <Navigate to="/workflow/controle" replace />;
  }

  if (loading) {
    return <SpinnerLoader message={t("common.loading")} className="min-h-[50vh]" />;
  }

  if (notFound || !state) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-gray-500">{t("workflow.packageNotFound")}</p>
        <Link to="/workflow/controle" className="mt-4 inline-block text-sm text-brand-500 hover:underline">
          {t("workflow.backToQueue")}
        </Link>
      </div>
    );
  }

  async function handleAssign() {
    const confirmed = await confirmAction({
      title: t("confirm.assignReviewerTitle"),
      confirmText: t("confirm.proceed"),
      cancelText: t("common.cancel"),
    });
    if (!confirmed.isConfirmed) return;
    try {
      const token = await getApiToken(getToken);
      setState(await assignReviewer(token, jobId!, assigneeId ? Number(assigneeId) : undefined));
      showSuccess(t("workflow.assigned"));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : t("common.error"));
    }
  }

  async function handleComplete() {
    if (!validatorId) {
      await showError(t("workflow.validatorRequiredTitle"), t("workflow.validatorRequiredDesc"));
      return;
    }
    const confirmed = await confirmAction({
      title: t("confirm.completeControleTitle"),
      text: t("confirm.completeControleText"),
      confirmText: t("confirm.proceed"),
      cancelText: t("common.cancel"),
    });
    if (!confirmed.isConfirmed) return;
    try {
      const token = await getApiToken(getToken);
      setState(await completeProcedure(token, jobId!, Number(validatorId)));
      showSuccess(t("workflow.procedureComplete"));
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
      setState(await rejectProcedure(token, jobId!, prompt.value));
      showSuccess(t("workflow.packageRejected"));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : t("common.error"));
    }
  }

  const packageTitle = formatWorkflowPackageTitle(state.project_number, state.event_title);

  return (
    <>
      <PageMeta
        title={`${packageTitle || t("nav.workflowControle")} | TIP`}
        description={t("workflow.controleDesc")}
      />
      <AdminBreadcrumb
        pageTitle={packageTitle || t("workflow.packageDetail")}
        crumbs={[
          { label: t("nav.workflowControle"), to: "/workflow/controle" },
        ]}
      />

      <div className="mb-6">
        <Link to="/workflow/controle">
          <Button size="sm" variant="outline" startIcon={<ArrowLeft className="size-4" />}>
            {t("workflow.backToQueue")}
          </Button>
        </Link>
      </div>

      <WorkflowControleDetailPanel
        state={state}
        reviewers={reviewers}
        validators={validators}
        assigneeId={assigneeId}
        validatorId={validatorId}
        onAssigneeChange={setAssigneeId}
        onValidatorChange={setValidatorId}
        onAssign={() => void handleAssign()}
        onComplete={() => void handleComplete()}
        onReject={() => void handleReject()}
        onUpdated={setState}
        t={t}
      />
    </>
  );
}
