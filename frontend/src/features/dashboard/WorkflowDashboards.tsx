import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import Button from "../../components/ui/button/Button";
import EventStatCard from "../events/EventStatCard";
import RecentGenerationsPanel from "./RecentGenerationsPanel";
import { useTipAuth } from "../../context/TipAuthContext";
import { fetchWorkflowStats } from "../../api/workflow";
import { getApiToken } from "../../lib/clerkToken";
import { TaskIcon } from "../../icons";
import { workflowStatusLabel } from "../auth/types";
import { useTranslation } from "../../i18n/useTranslation";

function useWorkflowStats(role: "support" | "controle" | "validateur" | "admin") {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchWorkflowStats>> | null>(null);

  useEffect(() => {
    void (async () => {
      const token = await getApiToken(getToken);
      setStats(await fetchWorkflowStats(token, role));
    })();
  }, [getToken, role]);

  return stats;
}

export function DashboardSupportAdmin() {
  const { tipUser } = useTipAuth();
  const { t } = useTranslation();
  const stats = useWorkflowStats("support");

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("dashboard.greeting")}, {tipUser?.prenom}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("dashboard.supportSpace")}</p>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <EventStatCard
          label={t("dashboard.wfToSubmit")}
          value={stats?.generated ?? "—"}
          icon={<TaskIcon className="size-6 text-brand-500" />}
          iconBgClassName="bg-brand-50 dark:bg-brand-500/15"
          to="/documents/generation"
          hint={t("dashboard.metricHintToSubmit")}
        />
        <EventStatCard
          label={t("dashboard.wfSubmitted")}
          value={stats?.submitted ?? "—"}
          icon={<TaskIcon className="size-6 text-info-600" />}
          iconBgClassName="bg-blue-light-50 dark:bg-blue-light-500/15"
          to="/workflow/controle"
          hint={t("dashboard.metricHintControle")}
        />
        <EventStatCard
          label={t("dashboard.wfRejected")}
          value={(stats?.procedure_rejected ?? 0) + (stats?.validator_rejected ?? 0)}
          icon={<TaskIcon className="size-6 text-error-600" />}
          iconBgClassName="bg-error-50 dark:bg-error-500/15"
          to="/documents/generation"
          hint={t("dashboard.metricHintRejected")}
        />
        <EventStatCard
          label={t("dashboard.wfInValidation")}
          value={stats?.under_final_validation ?? "—"}
          icon={<TaskIcon className="size-6 text-warning-600" />}
          iconBgClassName="bg-warning-50 dark:bg-warning-500/15"
          to="/workflow/validation"
          hint={t("dashboard.metricHintValidation")}
        />
        <EventStatCard
          label={t("dashboard.wfOverdue")}
          value={stats?.overdue ?? "—"}
          icon={<TaskIcon className="size-6 text-error-600" />}
          iconBgClassName="bg-error-50 dark:bg-error-500/15"
          to="/documents/generation"
          hint={t("dashboard.metricHintOverdue")}
        />
      </div>
      <div className="mb-6">
        <RecentGenerationsPanel scope="mine" limit={6} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Link to="/documents/generation">
          <Button size="sm">{t("nav.generation")}</Button>
        </Link>
        <Link to="/evenements">
          <Button size="sm" variant="outline">
            {t("nav.events")}
          </Button>
        </Link>
      </div>
    </>
  );
}

export function DashboardControleProcedure() {
  const { tipUser } = useTipAuth();
  const { t } = useTranslation();
  const stats = useWorkflowStats("controle");

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("dashboard.greeting")}, {tipUser?.prenom}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("dashboard.controleSpace")}</p>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <EventStatCard
          label={t("dashboard.wfToReview")}
          value={stats?.submitted ?? "—"}
          icon={<TaskIcon className="size-6 text-brand-500" />}
          iconBgClassName="bg-brand-50 dark:bg-brand-500/15"
          to="/workflow/controle"
          hint={t("dashboard.metricHintControle")}
        />
        <EventStatCard
          label={t("dashboard.wfAssignedToMe")}
          value={stats?.assigned_to_me ?? "—"}
          icon={<TaskIcon className="size-6 text-warning-600" />}
          iconBgClassName="bg-warning-50 dark:bg-warning-500/15"
          to="/workflow/controle"
          hint={t("dashboard.metricHintAssigned")}
        />
        <EventStatCard
          label={t("dashboard.wfInProgress")}
          value={stats?.under_procedure_review ?? "—"}
          icon={<TaskIcon className="size-6 text-info-600" />}
          iconBgClassName="bg-blue-light-50 dark:bg-blue-light-500/15"
          to="/workflow/controle"
          hint={t("dashboard.metricHintReview")}
        />
        <EventStatCard
          label={t("dashboard.wfForwarded")}
          value={(stats?.under_final_validation ?? 0) + (stats?.approved ?? 0)}
          icon={<TaskIcon className="size-6 text-success-600" />}
          iconBgClassName="bg-success-50 dark:bg-success-500/15"
          to="/workflow/validation"
          hint={t("dashboard.metricHintForwarded")}
        />
        <EventStatCard
          label={t("dashboard.wfRejected")}
          value={stats?.procedure_rejected ?? "—"}
          icon={<TaskIcon className="size-6 text-error-600" />}
          iconBgClassName="bg-error-50 dark:bg-error-500/15"
          to="/documents/generation"
          hint={t("dashboard.metricHintRejectedControle")}
        />
        <EventStatCard
          label={t("dashboard.wfOverdue")}
          value={stats?.overdue ?? "—"}
          icon={<TaskIcon className="size-6 text-error-600" />}
          iconBgClassName="bg-error-50 dark:bg-error-500/15"
          to="/workflow/controle"
          hint={t("dashboard.metricHintOverdue")}
        />
      </div>
      <Link to="/workflow/controle">
        <Button size="sm">{t("dashboard.openControleQueue")}</Button>
      </Link>
    </>
  );
}

export function DashboardControleValidateur() {
  const { tipUser } = useTipAuth();
  const { t } = useTranslation();
  const controleStats = useWorkflowStats("controle");
  const validateurStats = useWorkflowStats("validateur");

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("dashboard.greeting")}, {tipUser?.prenom}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("dashboard.controleValidateurSpace")}
        </p>
      </div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {t("nav.workflowControle")}
      </p>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <EventStatCard
          label={t("dashboard.wfToReview")}
          value={(controleStats?.submitted ?? 0) + (controleStats?.under_procedure_review ?? 0)}
          icon={<TaskIcon className="size-6 text-brand-500" />}
          iconBgClassName="bg-brand-50 dark:bg-brand-500/15"
          to="/workflow/controle"
          hint={t("dashboard.metricHintControle")}
        />
        <EventStatCard
          label={t("dashboard.wfRejected")}
          value={controleStats?.procedure_rejected ?? "—"}
          icon={<TaskIcon className="size-6 text-error-600" />}
          iconBgClassName="bg-error-50 dark:bg-error-500/15"
          to="/documents/generation"
          hint={t("dashboard.metricHintRejectedControle")}
        />
        <EventStatCard
          label={t("dashboard.wfForwarded")}
          value={(controleStats?.under_final_validation ?? 0) + (controleStats?.approved ?? 0)}
          icon={<TaskIcon className="size-6 text-success-600" />}
          iconBgClassName="bg-success-50 dark:bg-success-500/15"
          to="/workflow/validation"
          hint={t("dashboard.metricHintForwarded")}
        />
        <EventStatCard
          label={t("dashboard.wfOverdue")}
          value={controleStats?.overdue ?? "—"}
          icon={<TaskIcon className="size-6 text-error-600" />}
          iconBgClassName="bg-error-50 dark:bg-error-500/15"
          to="/workflow/controle"
          hint={t("dashboard.metricHintOverdue")}
        />
      </div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {t("nav.workflowValidation")}
      </p>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <EventStatCard
          label={t("dashboard.wfPending")}
          value={validateurStats?.under_final_validation ?? "—"}
          icon={<TaskIcon className="size-6 text-warning-600" />}
          iconBgClassName="bg-warning-50 dark:bg-warning-500/15"
          to="/workflow/validation"
          hint={t("dashboard.metricHintValidation")}
        />
        <EventStatCard
          label={t("dashboard.wfApproved")}
          value={validateurStats?.approved ?? "—"}
          icon={<TaskIcon className="size-6 text-success-600" />}
          iconBgClassName="bg-success-50 dark:bg-success-500/15"
          to="/workflow/validation"
          hint={t("dashboard.metricHintApproved")}
        />
        <EventStatCard
          label={t("dashboard.wfRejected")}
          value={validateurStats?.validator_rejected ?? "—"}
          icon={<TaskIcon className="size-6 text-error-600" />}
          iconBgClassName="bg-error-50 dark:bg-error-500/15"
          to="/workflow/validation"
          hint={t("dashboard.metricHintRejected")}
        />
        <EventStatCard
          label={t("dashboard.wfOverdue")}
          value={validateurStats?.overdue ?? "—"}
          icon={<TaskIcon className="size-6 text-error-600" />}
          iconBgClassName="bg-error-50 dark:bg-error-500/15"
          to="/workflow/validation"
          hint={t("dashboard.metricHintOverdue")}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Link to="/workflow/controle">
          <Button size="sm">{t("dashboard.openControleQueue")}</Button>
        </Link>
        <Link to="/workflow/validation">
          <Button size="sm" variant="outline">
            {t("dashboard.openValidationQueue")}
          </Button>
        </Link>
      </div>
    </>
  );
}

export function DashboardValidateur() {
  const { tipUser } = useTipAuth();
  const { t } = useTranslation();
  const stats = useWorkflowStats("validateur");

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("dashboard.greeting")}, {tipUser?.prenom}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("dashboard.validateurSpace")}</p>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <EventStatCard
          label={t("dashboard.wfPending")}
          value={stats?.under_final_validation ?? "—"}
          icon={<TaskIcon className="size-6 text-warning-600" />}
          iconBgClassName="bg-warning-50 dark:bg-warning-500/15"
          to="/workflow/validation"
          hint={t("dashboard.metricHintValidation")}
        />
        <EventStatCard
          label={t("dashboard.wfApproved")}
          value={stats?.approved ?? "—"}
          icon={<TaskIcon className="size-6 text-success-600" />}
          iconBgClassName="bg-success-50 dark:bg-success-500/15"
          to="/workflow/validation"
          hint={t("dashboard.metricHintApproved")}
        />
        <EventStatCard
          label={t("dashboard.wfRejected")}
          value={stats?.validator_rejected ?? "—"}
          icon={<TaskIcon className="size-6 text-error-600" />}
          iconBgClassName="bg-error-50 dark:bg-error-500/15"
          to="/workflow/validation"
          hint={t("dashboard.metricHintRejected")}
        />
        <EventStatCard
          label={t("dashboard.wfOverdue")}
          value={stats?.overdue ?? "—"}
          icon={<TaskIcon className="size-6 text-error-600" />}
          iconBgClassName="bg-error-50 dark:bg-error-500/15"
          to="/workflow/validation"
          hint={t("dashboard.metricHintOverdue")}
        />
      </div>
      <Link to="/workflow/validation">
        <Button size="sm">{t("dashboard.openValidationQueue")}</Button>
      </Link>
      <p className="mt-4 text-xs text-gray-500">
        {workflowStatusLabel("approved", t)} — {t("nav.workflowValidation")}
      </p>
    </>
  );
}
