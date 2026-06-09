import { DollarLineIcon, GroupIcon, PieChartIcon, TaskIcon } from "../../icons";
import { useTranslation } from "../../i18n/useTranslation";
import type { DashboardEventStats } from "./types";
import EventStatCard from "./EventStatCard";
import EventsCountryMap from "./EventsCountryMap";
import EventsProjectStatusChart from "./EventsProjectStatusChart";
import EventsRegionChart from "./EventsRegionChart";
import EventsTypeChart from "./EventsTypeChart";
import { formatChf } from "./formatChf";

interface EventsBiDashboardSectionProps {
  stats: DashboardEventStats | null;
  isLoading?: boolean;
}

export default function EventsBiDashboardSection({
  stats,
  isLoading = false,
}: EventsBiDashboardSectionProps) {
  const { t, localeTag } = useTranslation();
  const financial = stats?.financial;
  const participants = stats?.participants;

  return (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">{t("events.biTitle")}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("events.biDesc")}</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
        <EventStatCard
          label={t("events.budgetTotal")}
          value={isLoading ? "—" : formatChf(financial?.total_amount_chf)}
          icon={<DollarLineIcon className="size-6 text-brand-500 dark:text-brand-400" />}
          iconBgClassName="bg-brand-50 dark:bg-brand-500/15"
        />
        <EventStatCard
          label={t("events.paymentsDone")}
          value={isLoading ? "—" : formatChf(financial?.total_payments_chf)}
          icon={<DollarLineIcon className="size-6 text-success-600 dark:text-success-500" />}
          iconBgClassName="bg-success-50 dark:bg-success-500/15"
        />
        <EventStatCard
          label={t("events.balanceDue")}
          value={isLoading ? "—" : formatChf(financial?.total_balance_chf)}
          icon={<DollarLineIcon className="size-6 text-warning-600 dark:text-warning-500" />}
          iconBgClassName="bg-warning-50 dark:bg-warning-500/15"
        />
        <EventStatCard
          label={t("events.participants")}
          value={
            isLoading
              ? "—"
              : `${(participants?.real_total ?? 0).toLocaleString(localeTag)} / ${(participants?.expected_total ?? 0).toLocaleString(localeTag)}`
          }
          icon={<GroupIcon className="size-6 text-info-600 dark:text-blue-light-500" />}
          iconBgClassName="bg-blue-light-50 dark:bg-blue-light-500/15"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
        <EventStatCard
          label={t("events.avgPercentPaid")}
          value={
            isLoading
              ? "—"
              : financial?.avg_percent_paid != null
                ? `${financial.avg_percent_paid} %`
                : "—"
          }
          icon={<PieChartIcon className="size-6 text-brand-500 dark:text-brand-400" />}
          iconBgClassName="bg-brand-50 dark:bg-brand-500/15"
        />
        <EventStatCard
          label={t("events.projectsWithAmount")}
          value={isLoading ? "—" : (financial?.events_with_amount ?? 0)}
          icon={<TaskIcon className="size-6 text-gray-600 dark:text-gray-400" />}
          iconBgClassName="bg-gray-100 dark:bg-white/10"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <EventsProjectStatusChart
          byProjectStatus={stats?.by_project_status ?? {}}
          isLoading={isLoading}
        />
        <EventsRegionChart byRegion={stats?.by_region ?? {}} isLoading={isLoading} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <EventsTypeChart byType={stats?.by_type ?? {}} isLoading={isLoading} />
        <EventsCountryMap byCountry={stats?.by_country ?? {}} isLoading={isLoading} />
      </div>
    </>
  );
}
