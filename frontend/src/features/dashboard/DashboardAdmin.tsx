import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import {
  BoxIconLine,
  CalenderIcon,
  CheckCircleIcon,
  GroupIcon,
  ListIcon,
  TaskIcon,
} from "../../icons";
import { useTipAuth } from "../../context/TipAuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import { useAdminUsers } from "../admin/users/useAdminUsers";
import EventStatCard from "../events/EventStatCard";
import UserStatCard from "../admin/users/UserStatCard";
import EventsDashboardCalendar from "../events/EventsDashboardCalendar";
import { useEvents } from "../events/useEvents";
import DocumentsModuleCard from "../documents/DocumentsModuleCard";
import RecentGenerationsPanel from "./RecentGenerationsPanel";
import { fetchWorkflowStats } from "../../api/workflow";
import { getApiToken } from "../../lib/clerkToken";

export default function DashboardAdmin() {
  const { t } = useTranslation();
  const { tipUser } = useTipAuth();
  const { users, loadUsers, isLoading: isUsersLoading } = useAdminUsers();
  const { stats, loadStats, isStatsLoading } = useEvents();

  const { getToken } = useAuth();
  const [wfStats, setWfStats] = useState<Awaited<ReturnType<typeof fetchWorkflowStats>> | null>(null);

  useEffect(() => {
    void loadUsers();
    void loadStats();
    void (async () => {
      const token = await getApiToken(getToken);
      setWfStats(await fetchWorkflowStats(token, "admin"));
    })();
  }, [getToken, loadUsers, loadStats]);

  const activeUsers = users.filter((user) => user.est_actif).length;

  return (
    <>
      <PageMeta title={t("dashboard.adminMeta")} description={t("dashboard.metaDesc")} />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("dashboard.greeting")}, {tipUser?.prenom}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("dashboard.adminSpace")}</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
        <UserStatCard
          label={t("dashboard.activeUsers")}
          value={isUsersLoading ? "—" : activeUsers}
          icon={<GroupIcon className="size-6 text-brand-500 dark:text-brand-400" />}
          iconBgClassName="bg-brand-50 dark:bg-brand-500/15"
          to="/admin/utilisateurs"
          hint={t("dashboard.metricHintUsers")}
        />
        <EventStatCard
          label={t("nav.events")}
          value={isStatsLoading ? "—" : (stats?.total ?? "—")}
          icon={<ListIcon className="size-6 text-info-600 dark:text-blue-light-500" />}
          iconBgClassName="bg-blue-light-50 dark:bg-blue-light-500/15"
          to="/evenements"
          hint={t("dashboard.metricHintEvents")}
        />
        <EventStatCard
          label={t("events.open")}
          value={isStatsLoading ? "—" : (stats?.open_count ?? stats?.active ?? "—")}
          icon={<CalenderIcon className="size-6 text-warning-600 dark:text-warning-500" />}
          iconBgClassName="bg-warning-50 dark:bg-warning-500/15"
          to="/evenements?status=Open"
          hint={t("dashboard.metricHintOpen")}
        />
        <EventStatCard
          label={t("events.closed")}
          value={isStatsLoading ? "—" : (stats?.closed_count ?? "—")}
          icon={<CheckCircleIcon className="size-6 text-success-600 dark:text-success-500" />}
          iconBgClassName="bg-success-50 dark:bg-success-500/15"
          to="/evenements?status=Closed"
          hint={t("dashboard.metricHintClosed")}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
        <EventStatCard
          label={t("dashboard.wfSubmitted")}
          value={wfStats?.submitted ?? "—"}
          icon={<TaskIcon className="size-6 text-brand-500" />}
          iconBgClassName="bg-brand-50 dark:bg-brand-500/15"
          to="/workflow/controle"
          hint={t("dashboard.metricHintControle")}
        />
        <EventStatCard
          label={t("dashboard.wfInReview")}
          value={wfStats?.under_procedure_review ?? "—"}
          icon={<TaskIcon className="size-6 text-warning-600" />}
          iconBgClassName="bg-warning-50 dark:bg-warning-500/15"
          to="/workflow/controle"
          hint={t("dashboard.metricHintReview")}
        />
        <EventStatCard
          label={t("dashboard.wfInValidation")}
          value={wfStats?.under_final_validation ?? "—"}
          icon={<TaskIcon className="size-6 text-info-600" />}
          iconBgClassName="bg-blue-light-50 dark:bg-blue-light-500/15"
          to="/workflow/validation"
          hint={t("dashboard.metricHintValidation")}
        />
        <EventStatCard
          label={t("dashboard.wfApproved")}
          value={wfStats?.approved ?? "—"}
          icon={<TaskIcon className="size-6 text-success-600" />}
          iconBgClassName="bg-success-50 dark:bg-success-500/15"
          to="/workflow/validation"
          hint={t("dashboard.metricHintApproved")}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentGenerationsPanel scope="platform" limit={8} />
        </div>
        <DocumentsModuleCard />
      </div>

      <div className="mb-6">
        <EventsDashboardCalendar
          calendar={stats?.calendar ?? []}
          calendarYear={stats?.calendar_year}
          isLoading={isStatsLoading}
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">{t("dashboard.adminSection")}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("dashboard.adminDesc")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/admin/utilisateurs">
            <Button size="sm">{t("dashboard.manageUsers")}</Button>
          </Link>
          <Link to="/workflow/controle">
            <Button size="sm" variant="outline">
              {t("nav.workflowControle")}
            </Button>
          </Link>
          <Link to="/workflow/validation">
            <Button size="sm" variant="outline">
              {t("nav.workflowValidation")}
            </Button>
          </Link>
          <Link to="/evenements">
            <Button size="sm" variant="outline">
              <BoxIconLine className="mr-2 size-4" />
              {t("nav.events")}
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}
