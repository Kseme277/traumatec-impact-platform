import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { useMemo } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import type { StorageGcAnalytics } from "../../api/storageGc";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "../../i18n/useTranslation";
import { apexThemeOptions, chartMutedTextColor } from "../../lib/chartTheme";

const CHART_COLORS = ["#465fff", "#12b76a", "#f59e0b", "#f04438", "#7a5af8", "#98a2b3"];

const STATUS_COLORS: Record<string, string> = {
  completed: "#12b76a",
  failed: "#f04438",
  running: "#465fff",
  queued: "#98a2b3",
};

interface StorageGcChartsProps {
  analytics: StorageGcAnalytics;
}

function formatMonthLabel(month: string, locale: string): string {
  const [year, mon] = month.split("-").map(Number);
  if (!year || !mon) return month;
  return new Date(year, mon - 1, 1).toLocaleString(locale, { month: "short", year: "2-digit" });
}

export default function StorageGcCharts({ analytics }: StorageGcChartsProps) {
  const { t, localeTag } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const baseChart = useMemo(
    () => ({
      ...apexThemeOptions(isDark),
      chart: {
        fontFamily: "Outfit, sans-serif",
        foreColor: chartMutedTextColor(isDark),
        toolbar: { show: false },
      },
      grid: { borderColor: isDark ? "#344054" : "#e4e7ec", strokeDashArray: 4 },
    }),
    [isDark],
  );

  const statusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      completed: t("storageGc.status_completed"),
      failed: t("storageGc.status_failed"),
      running: t("storageGc.status_running"),
      queued: t("storageGc.status_queued"),
    };
    return labels[status] ?? status;
  };

  const zipDonutSeries = useMemo(
    () => [
      analytics.inventory.jobs_with_zip,
      analytics.inventory.jobs_eligible,
      analytics.inventory.jobs_purged_history,
    ],
    [analytics.inventory],
  );

  const zipDonutOptions: ApexOptions = useMemo(
    () => ({
      ...baseChart,
      chart: { ...baseChart.chart, type: "donut" },
      labels: [
        t("storageGc.zipAvailable"),
        t("storageGc.zipEligible"),
        t("storageGc.zipPurgedHistory"),
      ],
      colors: [CHART_COLORS[0], CHART_COLORS[2], CHART_COLORS[5]],
      legend: { position: "bottom", fontSize: "12px" },
      dataLabels: { enabled: true },
      plotOptions: {
        pie: {
          donut: {
            size: "62%",
            labels: {
              show: true,
              total: {
                show: true,
                label: t("storageGc.chartZipTotal"),
                formatter: () =>
                  String(
                    analytics.inventory.jobs_with_zip +
                      analytics.inventory.jobs_eligible +
                      analytics.inventory.jobs_purged_history,
                  ),
              },
            },
          },
        },
      },
    }),
    [analytics.inventory, baseChart, t],
  );

  const statusDonutOptions: ApexOptions = useMemo(
    () => ({
      ...baseChart,
      chart: { ...baseChart.chart, type: "donut" },
      labels: analytics.by_status.map((row) => statusLabel(row.status)),
      colors: analytics.by_status.map((row) => STATUS_COLORS[row.status] ?? CHART_COLORS[5]),
      legend: { position: "bottom", fontSize: "12px" },
      dataLabels: { enabled: true },
    }),
    [analytics.by_status, baseChart, t],
  );

  const monthCategories = useMemo(
    () => analytics.by_month.map((row) => formatMonthLabel(row.month, localeTag)),
    [analytics.by_month, localeTag],
  );

  const monthBarOptions: ApexOptions = useMemo(
    () => ({
      ...baseChart,
      chart: { ...baseChart.chart, type: "bar", stacked: false },
      colors: [CHART_COLORS[0], CHART_COLORS[1]],
      plotOptions: { bar: { columnWidth: "55%", borderRadius: 4 } },
      xaxis: { categories: monthCategories },
      yaxis: [
        { title: { text: t("storageGc.chartJobsAxis") } },
        { opposite: true, title: { text: t("storageGc.chartDocsAxis") } },
      ],
      legend: { position: "top" },
    }),
    [baseChart, monthCategories, t],
  );

  const topEventLabels = useMemo(
    () =>
      analytics.top_events.map((row) => {
        const title = row.event_title.length > 28 ? `${row.event_title.slice(0, 28)}…` : row.event_title;
        return `${row.project_number} — ${title}`;
      }),
    [analytics.top_events],
  );

  const topEventsOptions: ApexOptions = useMemo(
    () => ({
      ...baseChart,
      chart: { ...baseChart.chart, type: "bar" },
      colors: [CHART_COLORS[0], CHART_COLORS[3]],
      plotOptions: { bar: { horizontal: true, barHeight: "72%", borderRadius: 4 } },
      xaxis: {
        labels: {
          formatter: (v) => Number(v).toLocaleString(localeTag, { maximumFractionDigits: 0 }),
        },
      },
      dataLabels: { enabled: false },
      legend: { position: "top" },
    }),
    [baseChart, localeTag],
  );

  const summaryCards = [
    { label: t("storageGc.chartTotalJobs"), value: analytics.total_jobs, tone: "brand" },
    { label: t("storageGc.chartTotalDocs"), value: analytics.total_certificates, tone: "success" },
    { label: t("storageGc.zipAvailable"), value: analytics.inventory.jobs_with_zip, tone: "warning" },
    { label: t("storageGc.chartSuccessRate"), value: `${analytics.success_rate}%`, tone: "neutral" },
  ];

  const toneClass: Record<string, string> = {
    brand: "text-brand-600 dark:text-brand-400",
    success: "text-success-600 dark:text-success-400",
    warning: "text-warning-600 dark:text-warning-400",
    neutral: "text-gray-800 dark:text-white/90",
  };

  if (analytics.total_jobs === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-10 text-center dark:border-gray-700 dark:bg-white/[0.02]">
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("storageGc.chartNoData")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${toneClass[card.tone]}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ComponentCard title={t("storageGc.chartZipTitle")} desc={t("storageGc.chartZipDesc")}>
          <Chart options={zipDonutOptions} series={zipDonutSeries} type="donut" height={300} width="100%" />
        </ComponentCard>
        <ComponentCard title={t("storageGc.chartStatusTitle")} desc={t("storageGc.chartStatusDesc")}>
          <Chart
            options={statusDonutOptions}
            series={analytics.by_status.map((row) => row.count)}
            type="donut"
            height={300}
            width="100%"
          />
        </ComponentCard>
      </div>

      <ComponentCard title={t("storageGc.chartMonthTitle")} desc={t("storageGc.chartMonthDesc")}>
        <div className="min-w-0 overflow-x-auto">
          <Chart
            options={monthBarOptions}
            series={[
              { name: t("storageGc.chartJobsSeries"), type: "column", data: analytics.by_month.map((r) => r.jobs) },
              {
                name: t("storageGc.chartDocsSeries"),
                type: "column",
                data: analytics.by_month.map((r) => r.certificates),
              },
            ]}
            type="bar"
            height={320}
            width="100%"
          />
        </div>
      </ComponentCard>

      {analytics.top_events.length > 0 && (
        <ComponentCard title={t("storageGc.chartTopEventsTitle")} desc={t("storageGc.chartTopEventsDesc")}>
          <Chart
            options={topEventsOptions}
            series={[
              {
                name: t("storageGc.chartJobsSeries"),
                data: analytics.top_events.map((r, i) => ({ x: topEventLabels[i], y: r.jobs })),
              },
              {
                name: t("storageGc.chartDocsSeries"),
                data: analytics.top_events.map((r, i) => ({ x: topEventLabels[i], y: r.certificates })),
              },
            ]}
            type="bar"
            height={Math.max(260, analytics.top_events.length * 48)}
            width="100%"
          />
        </ComponentCard>
      )}
    </div>
  );
}
