import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import Button from "../../components/ui/button/Button";
import EventStatCard from "../events/EventStatCard";
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
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <EventStatCard label={t("dashboard.wfToSubmit")} value={stats?.generated ?? "—"} icon={<TaskIcon className="size-6 text-brand-500" />} iconBgClassName="bg-brand-50" />
        <EventStatCard label={t("dashboard.wfSubmitted")} value={stats?.submitted ?? "—"} icon={<TaskIcon className="size-6 text-info-600" />} iconBgClassName="bg-blue-light-50" />
        <EventStatCard label={t("dashboard.wfRejected")} value={(stats?.procedure_rejected ?? 0) + (stats?.validator_rejected ?? 0)} icon={<TaskIcon className="size-6 text-error-600" />} iconBgClassName="bg-error-50" />
        <EventStatCard label={t("dashboard.wfInValidation")} value={stats?.under_final_validation ?? "—"} icon={<TaskIcon className="size-6 text-warning-600" />} iconBgClassName="bg-warning-50" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Link to="/documents/generation"><Button size="sm">{t("nav.generation")}</Button></Link>
        <Link to="/evenements"><Button size="sm" variant="outline">{t("nav.events")}</Button></Link>
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
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <EventStatCard label={t("dashboard.wfToReview")} value={stats?.submitted ?? "—"} icon={<TaskIcon className="size-6 text-brand-500" />} iconBgClassName="bg-brand-50" />
        <EventStatCard label={t("dashboard.wfAssignedToMe")} value={stats?.assigned_to_me ?? "—"} icon={<TaskIcon className="size-6 text-warning-600" />} iconBgClassName="bg-warning-50" />
        <EventStatCard label={t("dashboard.wfInProgress")} value={stats?.under_procedure_review ?? "—"} icon={<TaskIcon className="size-6 text-info-600" />} iconBgClassName="bg-blue-light-50" />
        <EventStatCard label={t("dashboard.wfApproved")} value={stats?.procedure_approved ?? "—"} icon={<TaskIcon className="size-6 text-success-600" />} iconBgClassName="bg-success-50" />
      </div>
      <Link to="/workflow/controle"><Button size="sm">{t("dashboard.openControleQueue")}</Button></Link>
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
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <EventStatCard label={t("dashboard.wfPending")} value={stats?.under_final_validation ?? "—"} icon={<TaskIcon className="size-6 text-warning-600" />} iconBgClassName="bg-warning-50" />
        <EventStatCard label={t("dashboard.wfApproved")} value={stats?.approved ?? "—"} icon={<TaskIcon className="size-6 text-success-600" />} iconBgClassName="bg-success-50" />
        <EventStatCard label={t("dashboard.wfRejected")} value={stats?.validator_rejected ?? "—"} icon={<TaskIcon className="size-6 text-error-600" />} iconBgClassName="bg-error-50" />
      </div>
      <Link to="/workflow/validation"><Button size="sm">{t("dashboard.openValidationQueue")}</Button></Link>
      <p className="mt-4 text-xs text-gray-500">
        {workflowStatusLabel("approved", t)} — {t("nav.workflowValidation")}
      </p>
    </>
  );
}
