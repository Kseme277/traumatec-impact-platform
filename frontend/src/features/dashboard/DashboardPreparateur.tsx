import { useEffect } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import { CalenderIcon, CheckCircleIcon, ListIcon, TaskIcon } from "../../icons";
import { useTipAuth } from "../../context/TipAuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import EventStatCard from "../events/EventStatCard";
import EventsDashboardCalendar from "../events/EventsDashboardCalendar";
import { useEvents } from "../events/useEvents";
import DocumentsModuleCard from "../documents/DocumentsModuleCard";
import RecentGenerationsPanel from "./RecentGenerationsPanel";

export default function DashboardPreparateur() {
  const { t } = useTranslation();
  const { tipUser } = useTipAuth();
  const { stats, loadStats, isStatsLoading } = useEvents();

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  return (
    <>
      <PageMeta title={t("dashboard.preparateurMeta")} description={t("dashboard.metaDesc")} />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("dashboard.greeting")}, {tipUser?.prenom}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("dashboard.preparateurSpace")}</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
        <EventStatCard
          label={t("nav.events")}
          value={isStatsLoading ? "—" : (stats?.total ?? 0)}
          icon={<ListIcon className="size-6 text-brand-500 dark:text-brand-400" />}
          iconBgClassName="bg-brand-50 dark:bg-brand-500/15"
          to="/evenements"
          hint={t("dashboard.metricHintEvents")}
        />
        <EventStatCard
          label={t("events.open")}
          value={isStatsLoading ? "—" : (stats?.open_count ?? stats?.active ?? 0)}
          icon={<CalenderIcon className="size-6 text-warning-600 dark:text-warning-500" />}
          iconBgClassName="bg-warning-50 dark:bg-warning-500/15"
          to="/evenements?status=Open"
          hint={t("dashboard.metricHintOpen")}
        />
        <EventStatCard
          label={t("events.finished")}
          value={isStatsLoading ? "—" : (stats?.closed_count ?? 0) + (stats?.cancelled_count ?? 0)}
          icon={<CheckCircleIcon className="size-6 text-success-600 dark:text-success-500" />}
          iconBgClassName="bg-success-50 dark:bg-success-500/15"
          to="/evenements?status=Closed"
          hint={t("dashboard.metricHintClosed")}
        />
        <EventStatCard
          label={t("nav.generation")}
          value={t("dashboard.openLink")}
          icon={<TaskIcon className="size-6 text-info-600 dark:text-blue-light-500" />}
          iconBgClassName="bg-blue-light-50 dark:bg-blue-light-500/15"
          to="/documents/generation"
          hint={t("dashboard.metricHintGeneration")}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentGenerationsPanel scope="mine" limit={6} />
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
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">{t("dashboard.quickActions")}</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/evenements">
            <Button size="sm">{t("dashboard.viewEvents")}</Button>
          </Link>
          <Link to="/documents/generation">
            <Button size="sm" variant="outline">
              {t("nav.generation")}
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}
